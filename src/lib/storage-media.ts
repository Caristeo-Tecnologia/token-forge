import { supabase } from "@/integrations/supabase/client";

export const MARKETPLACE_MEDIA_BUCKET = "marketplace-media";

const MAX_BYTES = 5 * 1024 * 1024;

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function extensionForMime(mime: string): string {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "bin";
}

/** Upload pool thumbnail; returns public object URL. Caller must be authenticated with company write role (RLS). */
export async function uploadMarketplaceThumbnail(
  companyId: string,
  file: File,
): Promise<{ publicUrl: string }> {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error("Formato não suportado. Use JPEG, PNG ou WebP.");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("A imagem deve ter no máximo 5 MB.");
  }

  const ext = extensionForMime(file.type);
  const path = `${companyId}/thumbnails/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from(MARKETPLACE_MEDIA_BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(MARKETPLACE_MEDIA_BUCKET).getPublicUrl(path);
  return { publicUrl: data.publicUrl };
}
