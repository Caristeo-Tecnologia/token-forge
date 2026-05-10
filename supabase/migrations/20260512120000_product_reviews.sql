-- Marketplace product reviews
-- Stores 1-5 star reviews + optional comment per (pool, customer).
-- customer_name is denormalized so anonymous visitors can display reviews
-- without needing a public SELECT policy on the customers table.

CREATE TABLE public.product_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id UUID NOT NULL REFERENCES public.asset_pools(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (pool_id, customer_id)
);

CREATE INDEX product_reviews_pool_id_idx ON public.product_reviews(pool_id);
CREATE INDEX product_reviews_customer_id_idx ON public.product_reviews(customer_id);

CREATE TRIGGER trg_product_reviews_updated
  BEFORE UPDATE ON public.product_reviews
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;

-- Anyone can read reviews (marketplace is public)
CREATE POLICY reviews_public_select
  ON public.product_reviews FOR SELECT
  USING (true);

-- Customer can post a review for their own customer record
CREATE POLICY reviews_customer_insert
  ON public.product_reviews FOR INSERT
  WITH CHECK (
    customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid())
  );

-- Customer can update their own review
CREATE POLICY reviews_customer_update
  ON public.product_reviews FOR UPDATE
  USING (
    customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid())
  )
  WITH CHECK (
    customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid())
  );

-- Customer can delete their own review
CREATE POLICY reviews_customer_delete
  ON public.product_reviews FOR DELETE
  USING (
    customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid())
  );

-- Platform admins unrestricted
CREATE POLICY reviews_platform_admin
  ON public.product_reviews FOR ALL
  USING (EXISTS (SELECT 1 FROM public.platform_admins pa WHERE pa.user_id = auth.uid() AND pa.active))
  WITH CHECK (EXISTS (SELECT 1 FROM public.platform_admins pa WHERE pa.user_id = auth.uid() AND pa.active));
