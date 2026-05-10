-- Only approved suppliers may create or mutate asset_pools and pool_items under their supplier_id.

DROP POLICY IF EXISTS pools_supplier_manage ON public.asset_pools;
CREATE POLICY pools_supplier_manage ON public.asset_pools FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.suppliers s
      WHERE s.id = asset_pools.supplier_id
        AND s.user_id = auth.uid()
        AND s.status = 'approved'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.suppliers s
      WHERE s.id = asset_pools.supplier_id
        AND s.user_id = auth.uid()
        AND s.status = 'approved'
    )
  );

DROP POLICY IF EXISTS pool_items_supplier_via_pool ON public.pool_items;
CREATE POLICY pool_items_supplier_via_pool ON public.pool_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.asset_pools ap
      JOIN public.suppliers s ON s.id = ap.supplier_id
      WHERE ap.id = pool_items.pool_id
        AND s.user_id = auth.uid()
        AND s.status = 'approved'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.asset_pools ap
      JOIN public.suppliers s ON s.id = ap.supplier_id
      WHERE ap.id = pool_items.pool_id
        AND s.user_id = auth.uid()
        AND s.status = 'approved'
    )
  );
