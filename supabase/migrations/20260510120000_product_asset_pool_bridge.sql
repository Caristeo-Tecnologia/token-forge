-- Bridge: products (company tenant) <-> asset_pools 1:1, campos físicos, RLS por company, RPC atómica.

-- ============ products.asset_pool_id (FK diferido para permitir insert pool no mesmo TX) ============
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS asset_pool_id UUID UNIQUE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_asset_pool_id_fkey'
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_asset_pool_id_fkey
      FOREIGN KEY (asset_pool_id)
      REFERENCES public.asset_pools(id)
      ON DELETE SET NULL
      DEFERRABLE INITIALLY DEFERRED;
  END IF;
END $$;

-- ============ asset_pools: supplier opcional, product/company path ============
ALTER TABLE public.asset_pools DROP CONSTRAINT IF EXISTS asset_pools_supplier_id_slug_key;

ALTER TABLE public.asset_pools ALTER COLUMN supplier_id DROP NOT NULL;

ALTER TABLE public.asset_pools
  ADD COLUMN IF NOT EXISTS product_id UUID UNIQUE REFERENCES public.products(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS physical_unit TEXT,
  ADD COLUMN IF NOT EXISTS physical_total NUMERIC(24, 10),
  ADD COLUMN IF NOT EXISTS physical_available NUMERIC(24, 10),
  ADD COLUMN IF NOT EXISTS tokens_per_physical_unit NUMERIC(24, 12),
  ADD COLUMN IF NOT EXISTS display_unit_label TEXT;

ALTER TABLE public.asset_pools DROP CONSTRAINT IF EXISTS asset_pools_owner_path_chk;

ALTER TABLE public.asset_pools
  ADD CONSTRAINT asset_pools_owner_path_chk CHECK (
    (
      supplier_id IS NOT NULL
      AND product_id IS NULL
      AND company_id IS NULL
    )
    OR (
      supplier_id IS NULL
      AND product_id IS NOT NULL
      AND company_id IS NOT NULL
    )
  );

CREATE UNIQUE INDEX IF NOT EXISTS asset_pools_supplier_slug_uq
  ON public.asset_pools (supplier_id, slug)
  WHERE supplier_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS asset_pools_company_slug_uq
  ON public.asset_pools (company_id, slug)
  WHERE company_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_asset_pools_product ON public.asset_pools(product_id);
CREATE INDEX IF NOT EXISTS idx_asset_pools_company ON public.asset_pools(company_id);

-- ============ RLS: asset_pools por company ============
CREATE POLICY pools_company_member_select ON public.asset_pools FOR SELECT
  USING (
    company_id IS NOT NULL
    AND public.is_company_member(auth.uid(), company_id)
  );

CREATE POLICY pools_company_insert ON public.asset_pools FOR INSERT
  WITH CHECK (
    company_id IS NOT NULL
    AND public.has_company_role(
      auth.uid(),
      company_id,
      ARRAY['owner', 'admin', 'manager']::public.app_role[]
    )
  );

CREATE POLICY pools_company_update ON public.asset_pools FOR UPDATE
  USING (
    company_id IS NOT NULL
    AND public.has_company_role(
      auth.uid(),
      company_id,
      ARRAY['owner', 'admin', 'manager']::public.app_role[]
    )
  )
  WITH CHECK (
    company_id IS NOT NULL
    AND public.has_company_role(
      auth.uid(),
      company_id,
      ARRAY['owner', 'admin', 'manager']::public.app_role[]
    )
  );

CREATE POLICY pools_company_delete ON public.asset_pools FOR DELETE
  USING (
    company_id IS NOT NULL
    AND public.has_company_role(
      auth.uid(),
      company_id,
      ARRAY['owner', 'admin']::public.app_role[]
    )
  );

-- ============ RLS: pool_items por company (pools ligados a product) ============
CREATE POLICY pool_items_company_select ON public.pool_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.asset_pools ap
      WHERE ap.id = pool_items.pool_id
        AND ap.company_id IS NOT NULL
        AND public.is_company_member(auth.uid(), ap.company_id)
    )
  );

CREATE POLICY pool_items_company_insert ON public.pool_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.asset_pools ap
      WHERE ap.id = pool_items.pool_id
        AND ap.company_id IS NOT NULL
        AND public.has_company_role(
          auth.uid(),
          ap.company_id,
          ARRAY['owner', 'admin', 'manager']::public.app_role[]
        )
    )
  );

CREATE POLICY pool_items_company_update ON public.pool_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.asset_pools ap
      WHERE ap.id = pool_items.pool_id
        AND ap.company_id IS NOT NULL
        AND public.has_company_role(
          auth.uid(),
          ap.company_id,
          ARRAY['owner', 'admin', 'manager']::public.app_role[]
        )
    )
  );

CREATE POLICY pool_items_company_delete ON public.pool_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.asset_pools ap
      WHERE ap.id = pool_items.pool_id
        AND ap.company_id IS NOT NULL
        AND public.has_company_role(
          auth.uid(),
          ap.company_id,
          ARRAY['owner', 'admin']::public.app_role[]
        )
    )
  );

-- ============ RPC: criar product + asset_pool ============
CREATE OR REPLACE FUNCTION public.slugify_pool_slug(_raw TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT NULLIF(
    regexp_replace(
      regexp_replace(lower(trim(coalesce(_raw, ''))), '[^a-z0-9]+', '-', 'g'),
      '(^-+|-+$)',
      '',
      'g'
    ),
    ''
  );
$$;

CREATE OR REPLACE FUNCTION public.create_product_with_asset_pool(
  _company_id UUID,
  _project_id UUID,
  _name TEXT,
  _symbol TEXT,
  _description TEXT,
  _token_unit_type public.token_unit_type,
  _token_unit_definition TEXT,
  _token_price_usd NUMERIC,
  _funding_target_usd NUMERIC,
  _physical_unit TEXT,
  _physical_total NUMERIC,
  _tokens_per_physical_unit NUMERIC,
  _display_unit_label TEXT DEFAULT NULL,
  _metadata_uri TEXT DEFAULT NULL,
  _thumbnail_url TEXT DEFAULT NULL,
  _asset_class_name TEXT DEFAULT NULL,
  _listing_title TEXT DEFAULT NULL,
  _listing_body TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  pid UUID;
  pool_id UUID;
  slug_base TEXT;
  slug_final TEXT;
  n BIGINT;
  total_tokens BIGINT;
  sym TEXT;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF NOT public.has_company_role(
    uid,
    _company_id,
    ARRAY['owner', 'admin', 'manager']::public.app_role[]
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF _name IS NULL OR trim(_name) = '' THEN
    RAISE EXCEPTION 'name required';
  END IF;

  sym := upper(trim(coalesce(_symbol, '')));
  IF sym = '' THEN
    RAISE EXCEPTION 'symbol required';
  END IF;

  IF _physical_total IS NULL OR _physical_total <= 0 THEN
    RAISE EXCEPTION 'physical_total must be > 0';
  END IF;

  IF _tokens_per_physical_unit IS NULL OR _tokens_per_physical_unit <= 0 THEN
    RAISE EXCEPTION 'tokens_per_physical_unit must be > 0';
  END IF;

  total_tokens := floor(_physical_total * _tokens_per_physical_unit)::BIGINT;
  IF total_tokens < 1 THEN
    RAISE EXCEPTION 'derived token supply must be >= 1';
  END IF;

  IF _token_price_usd IS NULL OR _token_price_usd <= 0 THEN
    RAISE EXCEPTION 'invalid token_price_usd';
  END IF;

  IF _funding_target_usd IS NULL OR _funding_target_usd <= 0 THEN
    RAISE EXCEPTION 'invalid funding_target_usd';
  END IF;

  slug_base := public.slugify_pool_slug(sym || '-' || split_part(gen_random_uuid()::TEXT, '-', 1));
  IF slug_base IS NULL THEN
    slug_base := 'pool-' || replace(gen_random_uuid()::TEXT, '-', '');
  END IF;

  slug_final := slug_base;
  n := 0;
  WHILE EXISTS (
    SELECT 1 FROM public.asset_pools ap
    WHERE ap.company_id = _company_id AND ap.slug = slug_final
  ) LOOP
    n := n + 1;
    slug_final := slug_base || '-' || n::TEXT;
    IF n > 50 THEN
      slug_final := slug_base || '-' || replace(gen_random_uuid()::TEXT, '-', '');
      EXIT;
    END IF;
  END LOOP;

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
    created_by,
    cover_image_url
  ) VALUES (
    _company_id,
    _project_id,
    trim(_name),
    sym,
    NULLIF(trim(coalesce(_description, '')), ''),
    _token_unit_type,
    trim(_token_unit_definition),
    total_tokens,
    _token_price_usd,
    _funding_target_usd,
    'draft',
    uid,
    NULLIF(trim(coalesce(_thumbnail_url, '')), '')
  )
  RETURNING id INTO pid;

  INSERT INTO public.asset_pools (
    supplier_id,
    product_id,
    company_id,
    name,
    slug,
    description,
    total_supply,
    available_supply,
    unit_price,
    token_symbol,
    token_name,
    asset_class_name,
    metadata_uri,
    thumbnail_url,
    status,
    blockchain_status,
    marketplace_listed,
    listing_title,
    listing_body,
    physical_unit,
    physical_total,
    physical_available,
    tokens_per_physical_unit,
    display_unit_label
  ) VALUES (
    NULL,
    pid,
    _company_id,
    trim(_name),
    slug_final,
    NULLIF(trim(coalesce(_description, '')), ''),
    total_tokens,
    total_tokens,
    _token_price_usd,
    sym,
    trim(_name),
    NULLIF(trim(coalesce(_asset_class_name, '')), ''),
    NULLIF(trim(coalesce(_metadata_uri, '')), ''),
    NULLIF(trim(coalesce(_thumbnail_url, '')), ''),
    'draft',
    'not_started',
    false,
    NULLIF(trim(coalesce(_listing_title, '')), ''),
    NULLIF(trim(coalesce(_listing_body, '')), ''),
    NULLIF(trim(coalesce(_physical_unit, '')), ''),
    _physical_total,
    _physical_total,
    _tokens_per_physical_unit,
    NULLIF(trim(coalesce(_display_unit_label, '')), '')
  )
  RETURNING id INTO pool_id;

  UPDATE public.products SET asset_pool_id = pool_id WHERE id = pid;

  RETURN jsonb_build_object(
    'product_id', pid,
    'asset_pool_id', pool_id,
    'slug', slug_final,
    'total_supply_tokens', total_tokens
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_product_with_asset_pool(
  UUID,
  UUID,
  TEXT,
  TEXT,
  TEXT,
  public.token_unit_type,
  TEXT,
  NUMERIC,
  NUMERIC,
  TEXT,
  NUMERIC,
  NUMERIC,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  TEXT
) TO authenticated;

-- Afinar compra: sincronizar physical_available proporcional ao supply restante
CREATE OR REPLACE FUNCTION public.rwa_record_purchase(
  _pool_id UUID,
  _quantity BIGINT,
  _fee_bps INT DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  cid UUID;
  pool public.asset_pools%ROWTYPE;
  subtotal NUMERIC(18, 2);
  fee_amt NUMERIC(18, 2);
  total_amt NUMERIC(18, 2);
  oid UUID;
  sig TEXT;
  pos public.customer_positions%ROWTYPE;
  new_bal BIGINT;
  new_avg NUMERIC(18, 6);
  new_inv NUMERIC(18, 2);
  new_avail BIGINT;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  cid := public.get_customer_id_for_user(uid);
  IF cid IS NULL THEN
    RAISE EXCEPTION 'customer profile not found';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.customers c
    WHERE c.id = cid AND c.account_status <> 'active'
  ) THEN
    RAISE EXCEPTION 'customer account not active';
  END IF;

  IF _quantity IS NULL OR _quantity < 1 THEN
    RAISE EXCEPTION 'invalid quantity';
  END IF;

  IF _fee_bps IS NULL OR _fee_bps < 0 OR _fee_bps > 10000 THEN
    RAISE EXCEPTION 'invalid fee_bps';
  END IF;

  SELECT * INTO pool FROM public.asset_pools WHERE id = _pool_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'pool not found';
  END IF;

  IF NOT pool.marketplace_listed THEN
    RAISE EXCEPTION 'pool not listed on marketplace';
  END IF;

  IF pool.status NOT IN ('approved', 'tokenized') THEN
    RAISE EXCEPTION 'pool not available for purchase';
  END IF;

  IF pool.available_supply < _quantity THEN
    RAISE EXCEPTION 'insufficient supply';
  END IF;

  subtotal := ROUND((_quantity::NUMERIC * pool.unit_price)::NUMERIC, 2);
  fee_amt := ROUND(subtotal * (_fee_bps::NUMERIC / 10000), 2);
  total_amt := subtotal + fee_amt;

  sig := public.rwa_mock_tx_signature('buy');

  INSERT INTO public.purchase_orders (
    customer_id, pool_id, quantity, unit_price, fee_amount, total_amount,
    status, tx_signature, metadata_json
  ) VALUES (
    cid, _pool_id, _quantity, pool.unit_price, fee_amt, total_amt,
    'completed', sig,
    jsonb_build_object('mock', true, 'blockchain_status', pool.blockchain_status::text)
  )
  RETURNING id INTO oid;

  new_avail := pool.available_supply - _quantity;

  UPDATE public.asset_pools
  SET
    available_supply = new_avail,
    updated_at = now(),
    status = CASE WHEN new_avail = 0 THEN 'sold_out'::public.pool_status ELSE pool.status END,
    volume_mock_usd = COALESCE(volume_mock_usd, 0) + total_amt,
    physical_available = CASE
      WHEN pool.physical_total IS NOT NULL AND pool.total_supply > 0 THEN
        ROUND(pool.physical_total * (new_avail::NUMERIC / pool.total_supply::NUMERIC), 10)
      ELSE pool.physical_available
    END
  WHERE id = _pool_id;

  SELECT * INTO pos FROM public.customer_positions
  WHERE customer_id = cid AND pool_id = _pool_id FOR UPDATE;

  IF FOUND THEN
    new_bal := pos.token_balance + _quantity;
    new_inv := COALESCE(pos.total_invested, 0) + subtotal;
    IF new_bal > 0 THEN
      new_avg := new_inv / new_bal::NUMERIC;
    ELSE
      new_avg := NULL;
    END IF;
    UPDATE public.customer_positions SET
      token_balance = new_bal,
      average_price = new_avg,
      total_invested = new_inv,
      updated_at = now()
    WHERE id = pos.id;
  ELSE
    new_bal := _quantity;
    new_inv := subtotal;
    new_avg := subtotal / _quantity::NUMERIC;
    INSERT INTO public.customer_positions (customer_id, pool_id, token_balance, average_price, total_invested)
    VALUES (cid, _pool_id, new_bal, new_avg, new_inv);
  END IF;

  INSERT INTO public.rwa_token_transactions (
    customer_id, pool_id, type, amount, token_quantity, tx_signature, blockchain_status, metadata_json
  ) VALUES (
    cid, _pool_id, 'buy', subtotal, _quantity, sig, 'confirmed',
    jsonb_build_object('purchase_order_id', oid, 'mock', true)
  );

  INSERT INTO public.rwa_ledger_entries (
    pool_id, customer_id, supplier_id, entry_kind, amount, currency, reference_table, reference_id, metadata_json
  ) VALUES (
    _pool_id, cid, pool.supplier_id, 'purchase_primary', total_amt, 'USD', 'purchase_orders', oid,
    jsonb_build_object('fee', fee_amt, 'mock', true)
  );

  RETURN jsonb_build_object(
    'purchase_order_id', oid,
    'tx_signature', sig,
    'quantity', _quantity,
    'subtotal_usd', subtotal,
    'fee_usd', fee_amt,
    'total_usd', total_amt
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.rwa_record_sell(
  _pool_id UUID,
  _quantity BIGINT,
  _fee_bps INT DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  cid UUID;
  pool public.asset_pools%ROWTYPE;
  pos public.customer_positions%ROWTYPE;
  subtotal NUMERIC(18, 2);
  fee_amt NUMERIC(18, 2);
  total_amt NUMERIC(18, 2);
  oid UUID;
  sig TEXT;
  sale_price NUMERIC(18, 6);
  cost_basis NUMERIC(18, 2);
  new_avail BIGINT;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  cid := public.get_customer_id_for_user(uid);
  IF cid IS NULL THEN
    RAISE EXCEPTION 'customer profile not found';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.customers c
    WHERE c.id = cid AND c.account_status <> 'active'
  ) THEN
    RAISE EXCEPTION 'customer account not active';
  END IF;

  IF _quantity IS NULL OR _quantity < 1 THEN
    RAISE EXCEPTION 'invalid quantity';
  END IF;

  IF _fee_bps IS NULL OR _fee_bps < 0 OR _fee_bps > 10000 THEN
    RAISE EXCEPTION 'invalid fee_bps';
  END IF;

  SELECT * INTO pool FROM public.asset_pools WHERE id = _pool_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'pool not found';
  END IF;

  SELECT * INTO pos FROM public.customer_positions
  WHERE customer_id = cid AND pool_id = _pool_id FOR UPDATE;
  IF NOT FOUND OR pos.token_balance < _quantity THEN
    RAISE EXCEPTION 'insufficient token balance';
  END IF;

  sale_price := COALESCE(pool.unit_price, pos.average_price, 0);
  subtotal := ROUND((_quantity::NUMERIC * sale_price)::NUMERIC, 2);
  fee_amt := ROUND(subtotal * (_fee_bps::NUMERIC / 10000), 2);
  total_amt := subtotal - fee_amt;

  cost_basis := ROUND(COALESCE(pos.average_price, sale_price, 0) * _quantity::NUMERIC, 2);

  sig := public.rwa_mock_tx_signature('sell');

  INSERT INTO public.sell_orders (
    customer_id, pool_id, quantity, unit_price, fee_amount, total_amount,
    status, tx_signature, metadata_json
  ) VALUES (
    cid, _pool_id, _quantity, sale_price, fee_amt, total_amt,
    'completed', sig,
    jsonb_build_object('mock', true)
  )
  RETURNING id INTO oid;

  UPDATE public.customer_positions SET
    token_balance = token_balance - _quantity,
    total_invested = GREATEST(0, COALESCE(total_invested, 0) - cost_basis),
    updated_at = now()
  WHERE id = pos.id;

  new_avail := LEAST(pool.total_supply, pool.available_supply + _quantity);

  UPDATE public.asset_pools SET
    available_supply = new_avail,
    updated_at = now(),
    status = CASE WHEN pool.status = 'sold_out' THEN 'tokenized'::public.pool_status ELSE pool.status END,
    volume_mock_usd = COALESCE(volume_mock_usd, 0) + subtotal,
    physical_available = CASE
      WHEN pool.physical_total IS NOT NULL AND pool.total_supply > 0 THEN
        ROUND(pool.physical_total * (new_avail::NUMERIC / pool.total_supply::NUMERIC), 10)
      ELSE pool.physical_available
    END
  WHERE id = _pool_id;

  INSERT INTO public.rwa_token_transactions (
    customer_id, pool_id, type, amount, token_quantity, tx_signature, blockchain_status, metadata_json
  ) VALUES (
    cid, _pool_id, 'sell', total_amt, _quantity, sig, 'confirmed',
    jsonb_build_object('sell_order_id', oid, 'mock', true)
  );

  INSERT INTO public.rwa_ledger_entries (
    pool_id, customer_id, supplier_id, entry_kind, amount, currency, reference_table, reference_id, metadata_json
  ) VALUES (
    _pool_id, cid, pool.supplier_id, 'sell_secondary', total_amt, 'USD', 'sell_orders', oid,
    jsonb_build_object('fee', fee_amt, 'mock', true)
  );

  RETURN jsonb_build_object(
    'sell_order_id', oid,
    'tx_signature', sig,
    'quantity', _quantity,
    'subtotal_usd', subtotal,
    'fee_usd', fee_amt,
    'net_usd', total_amt
  );
END;
$$;
