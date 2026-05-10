-- Supplier-level marketplace reviews (public read; authenticated reviewers except own supplier row).

CREATE TABLE public.supplier_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reviewer_display_name TEXT NOT NULL,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (supplier_id, reviewer_id)
);

CREATE INDEX supplier_reviews_supplier_id_idx ON public.supplier_reviews(supplier_id);
CREATE INDEX supplier_reviews_reviewer_id_idx ON public.supplier_reviews(reviewer_id);

CREATE TRIGGER trg_supplier_reviews_updated
  BEFORE UPDATE ON public.supplier_reviews
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.supplier_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY supplier_reviews_public_select
  ON public.supplier_reviews FOR SELECT
  USING (true);

CREATE POLICY supplier_reviews_reviewer_insert
  ON public.supplier_reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    reviewer_id = auth.uid()
    AND NOT EXISTS (
      SELECT 1 FROM public.suppliers s
      WHERE s.id = supplier_id AND s.user_id = auth.uid()
    )
  );

CREATE POLICY supplier_reviews_reviewer_update
  ON public.supplier_reviews FOR UPDATE
  TO authenticated
  USING (reviewer_id = auth.uid())
  WITH CHECK (
    reviewer_id = auth.uid()
    AND NOT EXISTS (
      SELECT 1 FROM public.suppliers s
      WHERE s.id = supplier_id AND s.user_id = auth.uid()
    )
  );

CREATE POLICY supplier_reviews_reviewer_delete
  ON public.supplier_reviews FOR DELETE
  TO authenticated
  USING (reviewer_id = auth.uid());

CREATE POLICY supplier_reviews_platform_admin
  ON public.supplier_reviews FOR ALL
  USING (EXISTS (SELECT 1 FROM public.platform_admins pa WHERE pa.user_id = auth.uid() AND pa.active))
  WITH CHECK (EXISTS (SELECT 1 FROM public.platform_admins pa WHERE pa.user_id = auth.uid() AND pa.active));
