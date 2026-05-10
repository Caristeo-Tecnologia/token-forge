-- Fix: infinite recursion between suppliers_public_marketplace and pools_supplier_manage.
--
-- Problem:
--   suppliers_public_marketplace.USING does EXISTS over asset_pools (joined on supplier_id).
--   Evaluating asset_pools triggers pools_supplier_manage.USING which does EXISTS over suppliers,
--   producing a cycle that the planner rejects with "infinite recursion detected in policy".
--
-- Fix:
--   The product intent of suppliers_public_marketplace is "approved suppliers are publicly visible".
--   We can express that directly via the supplier's own status column, with no join, removing the cycle.
--   Anonymous visitors only need to read approved suppliers anyway (rejected/pending are not surfaced).

DROP POLICY IF EXISTS suppliers_public_marketplace ON public.suppliers;

CREATE POLICY suppliers_public_marketplace ON public.suppliers FOR SELECT
  USING (status = 'approved');
