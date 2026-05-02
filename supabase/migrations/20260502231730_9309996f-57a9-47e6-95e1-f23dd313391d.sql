
-- 1. Extend project_status enum
ALTER TYPE project_status ADD VALUE IF NOT EXISTS 'under_review';
ALTER TYPE project_status ADD VALUE IF NOT EXISTS 'approved';

-- 2. Add approved_at to projects
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS approved_at timestamptz;

-- 3. Storage bucket for documents (public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

-- 3a. Policies on storage.objects for the documents bucket
DROP POLICY IF EXISTS "documents_public_read" ON storage.objects;
CREATE POLICY "documents_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'documents');

DROP POLICY IF EXISTS "documents_company_insert" ON storage.objects;
CREATE POLICY "documents_company_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND public.has_company_role(
    auth.uid(),
    ((storage.foldername(name))[1])::uuid,
    ARRAY['owner'::app_role, 'admin'::app_role, 'manager'::app_role]
  )
);

DROP POLICY IF EXISTS "documents_company_delete" ON storage.objects;
CREATE POLICY "documents_company_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents'
  AND public.has_company_role(
    auth.uid(),
    ((storage.foldername(name))[1])::uuid,
    ARRAY['owner'::app_role, 'admin'::app_role]
  )
);

-- 4. Atomic token sale RPC
CREATE OR REPLACE FUNCTION public.record_token_sale(
  _product_id uuid,
  _amount bigint,
  _bearer_code text,
  _tx_hash text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prod public.products%ROWTYPE;
  sc public.smart_contracts%ROWTYPE;
  total numeric;
BEGIN
  IF _amount IS NULL OR _amount < 1 THEN
    RAISE EXCEPTION 'amount must be >= 1';
  END IF;

  SELECT * INTO prod FROM public.products WHERE id = _product_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'product not found';
  END IF;
  IF prod.status <> 'published' THEN
    RAISE EXCEPTION 'product is not available for purchase';
  END IF;

  SELECT * INTO sc FROM public.smart_contracts WHERE product_id = _product_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'smart contract not found';
  END IF;
  IF sc.tokens_sold + _amount > sc.supply_issued THEN
    RAISE EXCEPTION 'insufficient supply';
  END IF;

  total := _amount * prod.token_price_usd;

  INSERT INTO public.token_transactions (
    company_id, product_id, tx_type, amount, unit_price_usd, total_usd, bearer_code, mock_tx_hash
  ) VALUES (
    prod.company_id, prod.id, 'sale', _amount, prod.token_price_usd, total, _bearer_code, _tx_hash
  );

  INSERT INTO public.token_holdings (
    company_id, product_id, bearer_code, amount
  ) VALUES (
    prod.company_id, prod.id, _bearer_code, _amount
  );

  UPDATE public.smart_contracts
    SET tokens_sold = tokens_sold + _amount
    WHERE id = sc.id;

  RETURN jsonb_build_object(
    'bearer_code', _bearer_code,
    'tx_hash', _tx_hash,
    'amount', _amount,
    'total_usd', total
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_token_sale(uuid, bigint, text, text) TO anon, authenticated;
