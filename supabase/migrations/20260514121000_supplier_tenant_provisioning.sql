-- Provision a `companies` tenant + default project + shadow `products` rows for
-- every approved supplier, so the supplier-track and the company-track AppLayout
-- can coexist for the same user.
--
-- Why:
--   * Suppliers were created on the supplier-only path (asset_pools.supplier_id set,
--     asset_pools.product_id/company_id NULL).
--   * The /app workspace, ProductForm, DocumentsTab and existing RLS expect a
--     company_id + product_id pair.
--   * Documents have product_id but no pool_id, so binding docs to a pool requires
--     a shadow `products` row pointing back via products.asset_pool_id.
--
-- Schema tweak: asset_pools_owner_path_chk used to forbid (supplier_id +
-- product_id + company_id) all set. We relax it to allow that 3-way path as a
-- valid "bridged supplier" combination.
--
-- Idempotent: re-runs are safe.

-- ============ 1) Relax owner-path constraint ============
ALTER TABLE public.asset_pools DROP CONSTRAINT IF EXISTS asset_pools_owner_path_chk;
ALTER TABLE public.asset_pools
  ADD CONSTRAINT asset_pools_owner_path_chk CHECK (
    -- Pure company path (legacy)
    (supplier_id IS NULL AND product_id IS NOT NULL AND company_id IS NOT NULL)
    OR
    -- Pure supplier path (newly seeded marketplace pools)
    (supplier_id IS NOT NULL AND product_id IS NULL AND company_id IS NULL)
    OR
    -- Bridged supplier path: supplier still owns, but a virtual company tenant
    -- and shadow product exist for /app + documents linkage.
    (supplier_id IS NOT NULL AND product_id IS NOT NULL AND company_id IS NOT NULL)
  );

-- ============ 2) Provisioning function ============
CREATE OR REPLACE FUNCTION public.provision_supplier_tenant(_supplier_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s public.suppliers%ROWTYPE;
  v_company_id uuid;
  v_project_id uuid;
  v_slug text;
  v_company_name text;
  v_brand text;
  pool RECORD;
  v_new_product_id uuid;
  v_total_supply bigint;
  v_funding_target numeric;
  v_unit_definition text;
BEGIN
  SELECT * INTO s FROM public.suppliers WHERE id = _supplier_id;
  IF NOT FOUND OR s.status <> 'approved' THEN
    RETURN;
  END IF;

  v_company_name := COALESCE(NULLIF(trim(s.fantasy_name), ''), s.company_name);
  v_brand := '#0d6e60';

  -- Reuse an existing company already owned by this user, otherwise create one.
  SELECT cm.company_id INTO v_company_id
  FROM public.company_members cm
  WHERE cm.user_id = s.user_id AND cm.role = 'owner'
  ORDER BY cm.created_at ASC
  LIMIT 1;

  IF v_company_id IS NULL THEN
    v_slug := 'supplier-' || substring(_supplier_id::text from 1 for 8);

    -- If slug collision exists, append a longer fragment.
    IF EXISTS (SELECT 1 FROM public.companies WHERE slug = v_slug) THEN
      v_slug := 'supplier-' || replace(_supplier_id::text, '-', '');
    END IF;

    INSERT INTO public.companies (name, slug, brand_color, payment_method, created_by)
    VALUES (v_company_name, v_slug, v_brand, 'USDC', s.user_id)
    RETURNING id INTO v_company_id;

    INSERT INTO public.company_members (company_id, user_id, role)
    VALUES (v_company_id, s.user_id, 'owner');
  END IF;

  -- Default project for marketplace pools.
  SELECT id INTO v_project_id
  FROM public.projects
  WHERE company_id = v_company_id
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_project_id IS NULL THEN
    INSERT INTO public.projects (company_id, name, type, description, status, created_by)
    VALUES (
      v_company_id,
      'Marketplace pools',
      'mining',
      'Auto-provisioned project for marketplace asset pools.',
      'active',
      s.user_id
    )
    RETURNING id INTO v_project_id;
  END IF;

  -- Backfill shadow products for every supplier-only pool that has no product yet.
  FOR pool IN
    SELECT *
    FROM public.asset_pools
    WHERE supplier_id = _supplier_id
      AND product_id IS NULL
  LOOP
    v_total_supply := pool.total_supply::bigint;
    IF v_total_supply < 1 THEN
      v_total_supply := 1;
    END IF;

    v_funding_target := GREATEST(round(v_total_supply * pool.unit_price, 2), 1);

    IF pool.physical_unit IS NOT NULL AND pool.tokens_per_physical_unit IS NOT NULL THEN
      v_unit_definition := format(
        '%s token(s) = 1 %s',
        pool.tokens_per_physical_unit::text,
        pool.physical_unit
      );
    ELSE
      v_unit_definition := COALESCE(NULLIF(pool.description, ''), '1 tokenized asset unit');
    END IF;

    INSERT INTO public.products (
      company_id,
      project_id,
      name,
      symbol,
      description,
      token_unit_type,
      token_unit_definition,
      total_supply,
      token_price_usd,
      funding_target_usd,
      status,
      cover_image_url,
      created_by,
      asset_pool_id,
      published_at,
      approved_at
    ) VALUES (
      v_company_id,
      v_project_id,
      pool.name,
      pool.token_symbol,
      pool.description,
      'asset_fraction',
      v_unit_definition,
      v_total_supply,
      pool.unit_price,
      v_funding_target,
      'published',
      pool.thumbnail_url,
      s.user_id,
      pool.id,
      now(),
      now()
    )
    RETURNING id INTO v_new_product_id;

    UPDATE public.asset_pools
    SET product_id = v_new_product_id,
        company_id = v_company_id
    WHERE id = pool.id;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.provision_supplier_tenant(uuid) TO authenticated;

-- ============ 3) Trigger on suppliers (insert + status change) ============
CREATE OR REPLACE FUNCTION public.tg_provision_supplier_tenant()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'approved' THEN
    PERFORM public.provision_supplier_tenant(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_supplier_provision ON public.suppliers;
CREATE TRIGGER trg_supplier_provision
  AFTER INSERT OR UPDATE OF status ON public.suppliers
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_provision_supplier_tenant();

-- Whenever a pool is inserted on the supplier-only path (supplier_id set,
-- product_id NULL), bridge it to the supplier's company tenant by calling
-- provision again. The function is idempotent: it only touches the new pool
-- (product_id IS NULL filter) and skips already-bridged ones.
CREATE OR REPLACE FUNCTION public.tg_provision_pool_for_supplier()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.supplier_id IS NOT NULL AND NEW.product_id IS NULL THEN
    PERFORM public.provision_supplier_tenant(NEW.supplier_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pool_provision_supplier ON public.asset_pools;
CREATE TRIGGER trg_pool_provision_supplier
  AFTER INSERT ON public.asset_pools
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_provision_pool_for_supplier();

-- ============ 4) One-shot backfill ============
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.suppliers WHERE status = 'approved' LOOP
    PERFORM public.provision_supplier_tenant(r.id);
  END LOOP;
END $$;
