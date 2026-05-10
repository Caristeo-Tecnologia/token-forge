-- RWA: pools, marketplace, compra/venda mock, ledger — mint/pda/tx como TEXT (sem validação Solana).
-- Convive com schema legado (companies/products/...).

-- ============ ENUMS ============
CREATE TYPE public.supplier_status AS ENUM ('pending', 'approved', 'rejected', 'suspended');
CREATE TYPE public.customer_account_status AS ENUM ('pending', 'active', 'blocked');
CREATE TYPE public.kyc_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE public.pool_status AS ENUM (
  'draft',
  'pending_approval',
  'approved',
  'tokenized',
  'paused',
  'sold_out',
  'archived'
);
CREATE TYPE public.pool_blockchain_status AS ENUM ('not_started', 'mint_pending', 'minted', 'failed');
CREATE TYPE public.pool_item_status AS ENUM ('available', 'tokenized', 'sold', 'redeemed');
CREATE TYPE public.rwa_order_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'cancelled');
CREATE TYPE public.rwa_tx_type AS ENUM ('buy', 'sell', 'mint', 'redeem', 'transfer');
CREATE TYPE public.rwa_chain_status AS ENUM ('pending', 'confirmed', 'failed');
CREATE TYPE public.token_sale_listing_status AS ENUM ('draft', 'active', 'paused', 'filled', 'cancelled');

-- ============ PLATFORM ADMINS ============
CREATE TABLE public.platform_admins (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'platform_admin',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

-- ============ SUPPLIERS ============
CREATE TABLE public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  fantasy_name TEXT,
  cnpj TEXT,
  email TEXT,
  phone TEXT,
  wallet_address TEXT,
  wallet_linked BOOLEAN NOT NULL DEFAULT false,
  status public.supplier_status NOT NULL DEFAULT 'pending',
  description TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_suppliers_user_id ON public.suppliers(user_id);
CREATE INDEX idx_suppliers_status ON public.suppliers(status);

-- ============ CUSTOMERS ============
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  cpf TEXT,
  phone TEXT,
  wallet_address TEXT,
  wallet_linked BOOLEAN NOT NULL DEFAULT false,
  kyc_status public.kyc_status NOT NULL DEFAULT 'pending',
  account_status public.customer_account_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_customers_user_id ON public.customers(user_id);

-- ============ ASSET POOLS ============
CREATE TABLE public.asset_pools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  total_supply BIGINT NOT NULL CHECK (total_supply >= 0),
  available_supply BIGINT NOT NULL DEFAULT 0,
  unit_price NUMERIC(18, 6) NOT NULL CHECK (unit_price >= 0),
  token_symbol TEXT NOT NULL,
  token_name TEXT NOT NULL,
  asset_class_name TEXT,
  metadata_uri TEXT,
  thumbnail_url TEXT,
  status public.pool_status NOT NULL DEFAULT 'draft',
  blockchain_status public.pool_blockchain_status NOT NULL DEFAULT 'not_started',
  mint_address TEXT,
  pda_address TEXT,
  created_by_admin_id UUID REFERENCES auth.users(id),
  marketplace_listed BOOLEAN NOT NULL DEFAULT false,
  listed_at TIMESTAMPTZ,
  listing_title TEXT,
  listing_body TEXT,
  performance_mock_pct NUMERIC(10, 4),
  volume_mock_usd NUMERIC(18, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (supplier_id, slug),
  CONSTRAINT asset_pools_supply_bounds CHECK (
    available_supply >= 0 AND available_supply <= total_supply
  )
);
ALTER TABLE public.asset_pools ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_asset_pools_supplier ON public.asset_pools(supplier_id);
CREATE INDEX idx_asset_pools_status ON public.asset_pools(status);
CREATE INDEX idx_asset_pools_marketplace ON public.asset_pools(marketplace_listed)
  WHERE marketplace_listed = true;

-- ============ POOL ITEMS ============
CREATE TABLE public.pool_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id UUID NOT NULL REFERENCES public.asset_pools(id) ON DELETE CASCADE,
  serial_number TEXT,
  batch_code TEXT,
  weight NUMERIC(18, 6),
  purity NUMERIC(10, 6),
  origin TEXT,
  extraction_date DATE,
  estimated_value NUMERIC(18, 2),
  status public.pool_item_status NOT NULL DEFAULT 'available',
  metadata_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.pool_items ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_pool_items_pool ON public.pool_items(pool_id);

-- ============ WALLET APPROVALS (off-chain; preparação Solana) ============
CREATE TABLE public.wallet_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  pool_id UUID NOT NULL REFERENCES public.asset_pools(id) ON DELETE CASCADE,
  wallet TEXT NOT NULL,
  approval_flags TEXT DEFAULT '0',
  approved BOOLEAN NOT NULL DEFAULT false,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (customer_id, pool_id, wallet)
);
ALTER TABLE public.wallet_approvals ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_wallet_approvals_pool ON public.wallet_approvals(pool_id);

-- ============ TOKEN SALE LISTINGS (anúncio de venda) ============
CREATE TABLE public.token_sale_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  pool_id UUID NOT NULL REFERENCES public.asset_pools(id) ON DELETE CASCADE,
  quantity BIGINT NOT NULL CHECK (quantity > 0),
  unit_price_ask NUMERIC(18, 6) NOT NULL CHECK (unit_price_ask >= 0),
  status public.token_sale_listing_status NOT NULL DEFAULT 'draft',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.token_sale_listings ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_token_sale_listings_pool ON public.token_sale_listings(pool_id);
CREATE INDEX idx_token_sale_listings_status ON public.token_sale_listings(status);

-- ============ ORDERS ============
CREATE TABLE public.purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  pool_id UUID NOT NULL REFERENCES public.asset_pools(id) ON DELETE RESTRICT,
  quantity BIGINT NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(18, 6) NOT NULL,
  fee_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(18, 2) NOT NULL,
  status public.rwa_order_status NOT NULL DEFAULT 'pending',
  tx_signature TEXT,
  metadata_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_purchase_orders_customer ON public.purchase_orders(customer_id, created_at DESC);
CREATE INDEX idx_purchase_orders_pool ON public.purchase_orders(pool_id);

CREATE TABLE public.sell_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  pool_id UUID NOT NULL REFERENCES public.asset_pools(id) ON DELETE RESTRICT,
  quantity BIGINT NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(18, 6) NOT NULL,
  fee_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(18, 2) NOT NULL,
  status public.rwa_order_status NOT NULL DEFAULT 'pending',
  tx_signature TEXT,
  metadata_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.sell_orders ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_sell_orders_customer ON public.sell_orders(customer_id, created_at DESC);

-- ============ POSITIONS ============
CREATE TABLE public.customer_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  pool_id UUID NOT NULL REFERENCES public.asset_pools(id) ON DELETE CASCADE,
  token_balance BIGINT NOT NULL DEFAULT 0 CHECK (token_balance >= 0),
  average_price NUMERIC(18, 6),
  total_invested NUMERIC(18, 2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (customer_id, pool_id)
);
ALTER TABLE public.customer_positions ENABLE ROW LEVEL SECURITY;

-- ============ RWA TOKEN TRANSACTIONS ============
CREATE TABLE public.rwa_token_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  pool_id UUID NOT NULL REFERENCES public.asset_pools(id) ON DELETE CASCADE,
  type public.rwa_tx_type NOT NULL,
  amount NUMERIC(18, 2),
  token_quantity BIGINT NOT NULL,
  tx_signature TEXT,
  blockchain_status public.rwa_chain_status NOT NULL DEFAULT 'confirmed',
  metadata_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.rwa_token_transactions ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_rwa_tx_pool ON public.rwa_token_transactions(pool_id, created_at DESC);

-- ============ LEDGER ============
CREATE TABLE public.rwa_ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id UUID REFERENCES public.asset_pools(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  entry_kind TEXT NOT NULL,
  amount NUMERIC(18, 6) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  reference_table TEXT,
  reference_id UUID,
  metadata_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.rwa_ledger_entries ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_rwa_ledger_pool ON public.rwa_ledger_entries(pool_id, created_at DESC);

-- ============ TRIGGERS updated_at ============
CREATE TRIGGER trg_suppliers_updated BEFORE UPDATE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_customers_updated BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_asset_pools_updated BEFORE UPDATE ON public.asset_pools
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_token_sale_listings_updated BEFORE UPDATE ON public.token_sale_listings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_purchase_orders_updated BEFORE UPDATE ON public.purchase_orders
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_sell_orders_updated BEFORE UPDATE ON public.sell_orders
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_customer_positions_updated BEFORE UPDATE ON public.customer_positions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ HELPERS (SECURITY DEFINER) ============
CREATE OR REPLACE FUNCTION public.is_platform_admin(_uid UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_admins
    WHERE user_id = _uid AND active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.get_customer_id_for_user(_uid UUID)
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.customers WHERE user_id = _uid LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_supplier_id_for_user(_uid UUID)
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.suppliers WHERE user_id = _uid LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.rwa_mock_tx_signature(_prefix TEXT DEFAULT 'rwa')
RETURNS TEXT
LANGUAGE SQL
VOLATILE
SET search_path = public
AS $$
  -- gen_random_uuid() é built-in; gen_random_bytes exige extensão pgcrypto (nem sempre activa)
  SELECT _prefix || '_' || replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
$$;

-- ============ RPC: compra primária (mock off-chain) ============
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

  UPDATE public.asset_pools
  SET
    available_supply = available_supply - _quantity,
    updated_at = now(),
    status = CASE WHEN available_supply - _quantity = 0 THEN 'sold_out'::public.pool_status ELSE pool.status END,
    volume_mock_usd = COALESCE(volume_mock_usd, 0) + total_amt
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

-- ============ RPC: venda (mock) ============
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

  UPDATE public.asset_pools SET
    available_supply = LEAST(total_supply, available_supply + _quantity),
    updated_at = now(),
    status = CASE WHEN status = 'sold_out' THEN 'tokenized'::public.pool_status ELSE status END,
    volume_mock_usd = COALESCE(volume_mock_usd, 0) + subtotal
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

GRANT EXECUTE ON FUNCTION public.rwa_record_purchase(UUID, BIGINT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rwa_record_sell(UUID, BIGINT, INT) TO authenticated;

-- ============ RLS: platform_admins ============
CREATE POLICY platform_admins_select ON public.platform_admins FOR SELECT
  USING (user_id = auth.uid() OR public.is_platform_admin(auth.uid()));

CREATE POLICY platform_admins_bootstrap_insert ON public.platform_admins FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND NOT EXISTS (SELECT 1 FROM public.platform_admins)
  );

CREATE POLICY platform_admins_admin_mutate ON public.platform_admins FOR UPDATE
  USING (public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_platform_admin(auth.uid()));

CREATE POLICY platform_admins_admin_delete ON public.platform_admins FOR DELETE
  USING (public.is_platform_admin(auth.uid()));

-- ============ RLS: suppliers ============
CREATE POLICY suppliers_own_all ON public.suppliers FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY suppliers_public_marketplace ON public.suppliers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.asset_pools ap
      WHERE ap.supplier_id = suppliers.id
        AND ap.marketplace_listed = true
        AND ap.status IN ('approved', 'tokenized')
    )
  );

CREATE POLICY suppliers_platform_admin ON public.suppliers FOR ALL
  USING (public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_platform_admin(auth.uid()));

-- ============ RLS: customers ============
CREATE POLICY customers_own_all ON public.customers FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY customers_platform_admin ON public.customers FOR ALL
  USING (public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_platform_admin(auth.uid()));

-- ============ RLS: asset_pools ============
CREATE POLICY pools_marketplace_select ON public.asset_pools FOR SELECT
  USING (
    marketplace_listed = true
    AND status IN ('approved', 'tokenized', 'paused', 'sold_out')
  );

CREATE POLICY pools_supplier_manage ON public.asset_pools FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.suppliers s
      WHERE s.id = asset_pools.supplier_id AND s.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.suppliers s
      WHERE s.id = asset_pools.supplier_id AND s.user_id = auth.uid()
    )
  );

CREATE POLICY pools_platform_admin ON public.asset_pools FOR ALL
  USING (public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_platform_admin(auth.uid()));

-- ============ RLS: pool_items ============
CREATE POLICY pool_items_supplier_via_pool ON public.pool_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.asset_pools ap
      JOIN public.suppliers s ON s.id = ap.supplier_id
      WHERE ap.id = pool_items.pool_id AND s.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.asset_pools ap
      JOIN public.suppliers s ON s.id = ap.supplier_id
      WHERE ap.id = pool_items.pool_id AND s.user_id = auth.uid()
    )
  );

CREATE POLICY pool_items_marketplace_read ON public.pool_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.asset_pools ap
      WHERE ap.id = pool_items.pool_id
        AND ap.marketplace_listed = true
        AND ap.status IN ('approved', 'tokenized')
    )
  );

CREATE POLICY pool_items_platform_admin ON public.pool_items FOR ALL
  USING (public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_platform_admin(auth.uid()));

-- ============ RLS: wallet_approvals ============
CREATE POLICY wallet_approvals_customer ON public.wallet_approvals FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.customers c WHERE c.id = wallet_approvals.customer_id AND c.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.customers c WHERE c.id = wallet_approvals.customer_id AND c.user_id = auth.uid())
  );

CREATE POLICY wallet_approvals_platform ON public.wallet_approvals FOR ALL
  USING (public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_platform_admin(auth.uid()));

-- ============ RLS: token_sale_listings ============
CREATE POLICY sale_listings_own ON public.token_sale_listings FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.customers c WHERE c.id = token_sale_listings.customer_id AND c.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.customers c WHERE c.id = token_sale_listings.customer_id AND c.user_id = auth.uid())
  );

CREATE POLICY sale_listings_public_active ON public.token_sale_listings FOR SELECT
  USING (status = 'active');

CREATE POLICY sale_listings_platform ON public.token_sale_listings FOR ALL
  USING (public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_platform_admin(auth.uid()));

-- ============ RLS: orders ============
CREATE POLICY purchase_orders_customer ON public.purchase_orders FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.customers c WHERE c.id = purchase_orders.customer_id AND c.user_id = auth.uid())
  );

CREATE POLICY purchase_orders_supplier ON public.purchase_orders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.asset_pools ap
      JOIN public.suppliers s ON s.id = ap.supplier_id
      WHERE ap.id = purchase_orders.pool_id AND s.user_id = auth.uid()
    )
  );

CREATE POLICY purchase_orders_platform ON public.purchase_orders FOR ALL
  USING (public.is_platform_admin(auth.uid()));

CREATE POLICY sell_orders_customer ON public.sell_orders FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.customers c WHERE c.id = sell_orders.customer_id AND c.user_id = auth.uid())
  );

CREATE POLICY sell_orders_supplier ON public.sell_orders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.asset_pools ap
      JOIN public.suppliers s ON s.id = ap.supplier_id
      WHERE ap.id = sell_orders.pool_id AND s.user_id = auth.uid()
    )
  );

CREATE POLICY sell_orders_platform ON public.sell_orders FOR ALL
  USING (public.is_platform_admin(auth.uid()));

-- ============ RLS: positions ============
CREATE POLICY positions_own ON public.customer_positions FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_positions.customer_id AND c.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_positions.customer_id AND c.user_id = auth.uid())
  );

CREATE POLICY positions_platform ON public.customer_positions FOR ALL
  USING (public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_platform_admin(auth.uid()));

-- ============ RLS: rwa_token_transactions ============
CREATE POLICY rwa_tx_customer ON public.rwa_token_transactions FOR SELECT
  USING (
    customer_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.customers c WHERE c.id = rwa_token_transactions.customer_id AND c.user_id = auth.uid()
    )
  );

CREATE POLICY rwa_tx_supplier ON public.rwa_token_transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.asset_pools ap
      JOIN public.suppliers s ON s.id = ap.supplier_id
      WHERE ap.id = rwa_token_transactions.pool_id AND s.user_id = auth.uid()
    )
  );

CREATE POLICY rwa_tx_marketplace ON public.rwa_token_transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.asset_pools ap
      WHERE ap.id = rwa_token_transactions.pool_id
        AND ap.marketplace_listed = true
    )
  );

CREATE POLICY rwa_tx_platform ON public.rwa_token_transactions FOR ALL
  USING (public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_platform_admin(auth.uid()));

-- ============ RLS: ledger ============
CREATE POLICY rwa_ledger_platform ON public.rwa_ledger_entries FOR ALL
  USING (public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_platform_admin(auth.uid()));

CREATE POLICY rwa_ledger_supplier ON public.rwa_ledger_entries FOR SELECT
  USING (
    supplier_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.suppliers s WHERE s.id = rwa_ledger_entries.supplier_id AND s.user_id = auth.uid()
    )
  );

CREATE POLICY rwa_ledger_customer ON public.rwa_ledger_entries FOR SELECT
  USING (
    customer_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.customers c WHERE c.id = rwa_ledger_entries.customer_id AND c.user_id = auth.uid()
    )
  );
