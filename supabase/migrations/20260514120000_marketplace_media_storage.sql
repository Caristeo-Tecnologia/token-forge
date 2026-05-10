-- Public bucket for marketplace thumbnails (pool images). Anyone can read; only company writers can upload/delete under their company folder.

INSERT INTO storage.buckets (id, name, public)
VALUES ('marketplace-media', 'marketplace-media', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "marketplace_media_public_read" ON storage.objects;
CREATE POLICY "marketplace_media_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'marketplace-media');

DROP POLICY IF EXISTS "marketplace_media_company_insert" ON storage.objects;
CREATE POLICY "marketplace_media_company_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'marketplace-media'
  AND public.has_company_role(
    auth.uid(),
    ((storage.foldername(name))[1])::uuid,
    ARRAY['owner'::app_role, 'admin'::app_role, 'manager'::app_role]
  )
);

DROP POLICY IF EXISTS "marketplace_media_company_delete" ON storage.objects;
CREATE POLICY "marketplace_media_company_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'marketplace-media'
  AND public.has_company_role(
    auth.uid(),
    ((storage.foldername(name))[1])::uuid,
    ARRAY['owner'::app_role, 'admin'::app_role]
  )
);
