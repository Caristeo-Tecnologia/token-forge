-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('owner', 'admin', 'manager', 'viewer');
CREATE TYPE public.product_status AS ENUM ('draft', 'under_review', 'approved', 'published', 'archived');
CREATE TYPE public.project_type AS ENUM ('mining', 'real_estate', 'energy', 'agriculture', 'other');
CREATE TYPE public.project_status AS ENUM ('planning', 'active', 'completed', 'paused');
CREATE TYPE public.token_unit_type AS ENUM ('production', 'profit_share', 'asset_fraction');
CREATE TYPE public.contract_type AS ENUM ('fixed_duration', 'event_based');
CREATE TYPE public.return_type AS ENUM ('fixed', 'variable');
CREATE TYPE public.smart_contract_status AS ENUM ('pending', 'deployed', 'active', 'closed');
CREATE TYPE public.token_tx_type AS ENUM ('mint', 'transfer', 'sale', 'burn');

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============ COMPANIES ============
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  brand_color TEXT DEFAULT '#0052FF',
  payment_method TEXT NOT NULL DEFAULT 'USDC',
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- ============ COMPANY MEMBERS ============
CREATE TABLE public.company_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'viewer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, user_id)
);
ALTER TABLE public.company_members ENABLE ROW LEVEL SECURITY;

-- ============ HELPER FUNCTIONS (SECURITY DEFINER) ============
CREATE OR REPLACE FUNCTION public.is_company_member(_user_id UUID, _company_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_members
    WHERE user_id = _user_id AND company_id = _company_id
  );
$$;

CREATE OR REPLACE FUNCTION public.has_company_role(_user_id UUID, _company_id UUID, _roles app_role[])
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_members
    WHERE user_id = _user_id AND company_id = _company_id AND role = ANY(_roles)
  );
$$;

CREATE OR REPLACE FUNCTION public.get_user_companies(_user_id UUID)
RETURNS SETOF UUID LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT company_id FROM public.company_members WHERE user_id = _user_id;
$$;

-- ============ PROJECTS ============
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type project_type NOT NULL DEFAULT 'other',
  description TEXT,
  status project_status NOT NULL DEFAULT 'planning',
  cover_image_url TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- ============ PRODUCTS ============
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  description TEXT,
  token_unit_type token_unit_type NOT NULL,
  token_unit_definition TEXT NOT NULL, -- e.g. "1g of gold" or "0.001% profit share"
  total_supply BIGINT NOT NULL CHECK (total_supply > 0),
  token_price_usd NUMERIC(18,6) NOT NULL CHECK (token_price_usd > 0),
  funding_target_usd NUMERIC(18,2) NOT NULL CHECK (funding_target_usd > 0),
  status product_status NOT NULL DEFAULT 'draft',
  cover_image_url TEXT,
  created_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_products_company ON public.products(company_id);
CREATE INDEX idx_products_status ON public.products(status);

-- Lock total_supply once approved
CREATE OR REPLACE FUNCTION public.lock_supply_after_approval()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status IN ('approved','published') AND NEW.total_supply <> OLD.total_supply THEN
    RAISE EXCEPTION 'total_supply is immutable after approval';
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_lock_supply BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.lock_supply_after_approval();

-- ============ CONTRACTS ============
CREATE TABLE public.contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  contract_type contract_type NOT NULL DEFAULT 'fixed_duration',
  start_date DATE,
  end_date DATE,
  return_type return_type NOT NULL DEFAULT 'fixed',
  return_rate_pct NUMERIC(6,3),
  terms TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

-- ============ SMART CONTRACTS (simulated) ============
CREATE TABLE public.smart_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  mock_address TEXT NOT NULL UNIQUE,
  network TEXT NOT NULL DEFAULT 'solana-devnet-simulated',
  supply_issued BIGINT NOT NULL DEFAULT 0,
  tokens_sold BIGINT NOT NULL DEFAULT 0,
  status smart_contract_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.smart_contracts ENABLE ROW LEVEL SECURITY;

-- ============ TOKEN HOLDINGS (bearer-style, anonymous) ============
CREATE TABLE public.token_holdings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  bearer_code TEXT NOT NULL UNIQUE, -- anonymous bearer token
  amount BIGINT NOT NULL CHECK (amount >= 0),
  acquired_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.token_holdings ENABLE ROW LEVEL SECURITY;

-- ============ TOKEN TRANSACTIONS ============
CREATE TABLE public.token_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  tx_type token_tx_type NOT NULL,
  amount BIGINT NOT NULL,
  unit_price_usd NUMERIC(18,6),
  total_usd NUMERIC(18,2),
  bearer_code TEXT,
  mock_tx_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.token_transactions ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_tx_product ON public.token_transactions(product_id);

-- ============ DOCUMENTS ============
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',
  file_url TEXT NOT NULL,
  version INT NOT NULL DEFAULT 1,
  is_public BOOLEAN NOT NULL DEFAULT false,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- ============ PRODUCT UPDATES (feed) ============
CREATE TABLE public.product_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  execution_pct NUMERIC(5,2),
  is_public BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.product_updates ENABLE ROW LEVEL SECURITY;

-- ============ AUDIT LOGS ============
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_audit_company ON public.audit_logs(company_id, created_at DESC);

-- ============ TRIGGERS: auto-create profile + updated_at ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_companies_updated BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_projects_updated BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_products_updated BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_contracts_updated BEFORE UPDATE ON public.contracts FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ RLS POLICIES ============

-- profiles: user sees/edits own
CREATE POLICY "profiles_self_select" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_self_update" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_self_insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- companies
CREATE POLICY "companies_member_select" ON public.companies FOR SELECT
  USING (public.is_company_member(auth.uid(), id));
CREATE POLICY "companies_authenticated_insert" ON public.companies FOR INSERT
  WITH CHECK (auth.uid() = created_by);
CREATE POLICY "companies_owner_update" ON public.companies FOR UPDATE
  USING (public.has_company_role(auth.uid(), id, ARRAY['owner','admin']::app_role[]));
CREATE POLICY "companies_owner_delete" ON public.companies FOR DELETE
  USING (public.has_company_role(auth.uid(), id, ARRAY['owner']::app_role[]));

-- company_members
CREATE POLICY "members_self_select" ON public.company_members FOR SELECT
  USING (user_id = auth.uid() OR public.has_company_role(auth.uid(), company_id, ARRAY['owner','admin']::app_role[]));
CREATE POLICY "members_self_insert_first" ON public.company_members FOR INSERT
  WITH CHECK (user_id = auth.uid() OR public.has_company_role(auth.uid(), company_id, ARRAY['owner','admin']::app_role[]));
CREATE POLICY "members_admin_update" ON public.company_members FOR UPDATE
  USING (public.has_company_role(auth.uid(), company_id, ARRAY['owner','admin']::app_role[]));
CREATE POLICY "members_admin_delete" ON public.company_members FOR DELETE
  USING (public.has_company_role(auth.uid(), company_id, ARRAY['owner','admin']::app_role[]));

-- generic helper macro: tenant table policies
-- projects
CREATE POLICY "projects_member_select" ON public.projects FOR SELECT USING (public.is_company_member(auth.uid(), company_id));
CREATE POLICY "projects_write_insert" ON public.projects FOR INSERT WITH CHECK (public.has_company_role(auth.uid(), company_id, ARRAY['owner','admin','manager']::app_role[]));
CREATE POLICY "projects_write_update" ON public.projects FOR UPDATE USING (public.has_company_role(auth.uid(), company_id, ARRAY['owner','admin','manager']::app_role[]));
CREATE POLICY "projects_write_delete" ON public.projects FOR DELETE USING (public.has_company_role(auth.uid(), company_id, ARRAY['owner','admin']::app_role[]));

-- products: members read all, anonymous read published
CREATE POLICY "products_public_published" ON public.products FOR SELECT USING (status = 'published');
CREATE POLICY "products_member_select" ON public.products FOR SELECT USING (public.is_company_member(auth.uid(), company_id));
CREATE POLICY "products_write_insert" ON public.products FOR INSERT WITH CHECK (public.has_company_role(auth.uid(), company_id, ARRAY['owner','admin','manager']::app_role[]));
CREATE POLICY "products_write_update" ON public.products FOR UPDATE USING (public.has_company_role(auth.uid(), company_id, ARRAY['owner','admin','manager']::app_role[]));
CREATE POLICY "products_write_delete" ON public.products FOR DELETE USING (public.has_company_role(auth.uid(), company_id, ARRAY['owner','admin']::app_role[]));

-- contracts
CREATE POLICY "contracts_public_for_published" ON public.contracts FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id = contracts.product_id AND p.status = 'published'));
CREATE POLICY "contracts_member_select" ON public.contracts FOR SELECT USING (public.is_company_member(auth.uid(), company_id));
CREATE POLICY "contracts_write_insert" ON public.contracts FOR INSERT WITH CHECK (public.has_company_role(auth.uid(), company_id, ARRAY['owner','admin','manager']::app_role[]));
CREATE POLICY "contracts_write_update" ON public.contracts FOR UPDATE USING (public.has_company_role(auth.uid(), company_id, ARRAY['owner','admin','manager']::app_role[]));
CREATE POLICY "contracts_write_delete" ON public.contracts FOR DELETE USING (public.has_company_role(auth.uid(), company_id, ARRAY['owner','admin']::app_role[]));

-- smart_contracts
CREATE POLICY "sc_public_for_published" ON public.smart_contracts FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id = smart_contracts.product_id AND p.status = 'published'));
CREATE POLICY "sc_member_select" ON public.smart_contracts FOR SELECT USING (public.is_company_member(auth.uid(), company_id));
CREATE POLICY "sc_write_insert" ON public.smart_contracts FOR INSERT WITH CHECK (public.has_company_role(auth.uid(), company_id, ARRAY['owner','admin','manager']::app_role[]));
CREATE POLICY "sc_write_update" ON public.smart_contracts FOR UPDATE USING (public.has_company_role(auth.uid(), company_id, ARRAY['owner','admin','manager']::app_role[]));

-- token_holdings: only members can view (bearer codes are sensitive)
CREATE POLICY "holdings_member_select" ON public.token_holdings FOR SELECT USING (public.is_company_member(auth.uid(), company_id));
CREATE POLICY "holdings_public_insert" ON public.token_holdings FOR INSERT WITH CHECK (true); -- anonymous bearer purchase

-- token_transactions: members can view; anonymous can insert simulated purchases
CREATE POLICY "tx_public_for_published" ON public.token_transactions FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id = token_transactions.product_id AND p.status = 'published'));
CREATE POLICY "tx_member_select" ON public.token_transactions FOR SELECT USING (public.is_company_member(auth.uid(), company_id));
CREATE POLICY "tx_public_insert" ON public.token_transactions FOR INSERT WITH CHECK (true);

-- documents
CREATE POLICY "documents_public_view" ON public.documents FOR SELECT USING (is_public = true);
CREATE POLICY "documents_member_select" ON public.documents FOR SELECT USING (public.is_company_member(auth.uid(), company_id));
CREATE POLICY "documents_write_insert" ON public.documents FOR INSERT WITH CHECK (public.has_company_role(auth.uid(), company_id, ARRAY['owner','admin','manager']::app_role[]));
CREATE POLICY "documents_write_update" ON public.documents FOR UPDATE USING (public.has_company_role(auth.uid(), company_id, ARRAY['owner','admin','manager']::app_role[]));
CREATE POLICY "documents_write_delete" ON public.documents FOR DELETE USING (public.has_company_role(auth.uid(), company_id, ARRAY['owner','admin']::app_role[]));

-- product_updates
CREATE POLICY "updates_public_view" ON public.product_updates FOR SELECT USING (is_public = true);
CREATE POLICY "updates_member_select" ON public.product_updates FOR SELECT USING (public.is_company_member(auth.uid(), company_id));
CREATE POLICY "updates_write_insert" ON public.product_updates FOR INSERT WITH CHECK (public.has_company_role(auth.uid(), company_id, ARRAY['owner','admin','manager']::app_role[]));
CREATE POLICY "updates_write_update" ON public.product_updates FOR UPDATE USING (public.has_company_role(auth.uid(), company_id, ARRAY['owner','admin','manager']::app_role[]));
CREATE POLICY "updates_write_delete" ON public.product_updates FOR DELETE USING (public.has_company_role(auth.uid(), company_id, ARRAY['owner','admin']::app_role[]));

-- audit_logs
CREATE POLICY "audit_admin_select" ON public.audit_logs FOR SELECT USING (public.has_company_role(auth.uid(), company_id, ARRAY['owner','admin']::app_role[]));
CREATE POLICY "audit_member_insert" ON public.audit_logs FOR INSERT WITH CHECK (public.is_company_member(auth.uid(), company_id) AND actor_id = auth.uid());