import type { Database } from "@/integrations/supabase/types";
import type { Offer } from "@/components/ui/offer-carousel";

type AssetPoolRow = Database["public"]["Tables"]["asset_pools"]["Row"];
type SupplierRow = Database["public"]["Tables"]["suppliers"]["Row"];

export type PoolWithSupplier = AssetPoolRow & {
  suppliers: Pick<SupplierRow, "id" | "fantasy_name" | "company_name" | "logo_url" | "user_id"> | null;
};

const PLACEHOLDER_IMAGE = "/placeholder.svg";
const PLACEHOLDER_LOGO = "/placeholder.svg";

export const supplierDisplayName = (
  s: Pick<SupplierRow, "fantasy_name" | "company_name"> | null | undefined,
) => s?.fantasy_name?.trim() || s?.company_name?.trim() || "Unknown supplier";

/**
 * Format a numeric price with the marketplace's USD convention.
 * Returns `null` when price should be hidden (gated behind login).
 *
 * Note: gating is purely UX. The Supabase RLS already exposes `unit_price`
 * publicly for marketplace-listed pools — we just don't render it.
 */
export function formatGatedPrice(
  price: number | null | undefined,
  isLoggedIn: boolean,
): string | null {
  if (!isLoggedIn) return null;
  if (price == null) return null;
  return `$${Number(price).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function mapPoolToOffer(pool: PoolWithSupplier, isLoggedIn: boolean): Offer {
  const formattedPrice = formatGatedPrice(pool.unit_price, isLoggedIn);
  return {
    id: pool.id,
    imageSrc: pool.thumbnail_url || PLACEHOLDER_IMAGE,
    imageAlt: pool.name,
    tag: pool.asset_class_name || "Asset",
    title: pool.listing_title || pool.name,
    description: pool.listing_body || pool.description || "",
    brandLogoSrc: pool.suppliers?.logo_url || PLACEHOLDER_LOGO,
    brandName: supplierDisplayName(pool.suppliers),
    promoCode: formattedPrice ?? (isLoggedIn ? undefined : "Login p/ ver preço"),
    href: `/marketplace/${pool.id}`,
  };
}

export type ReviewSummary = { avg: number; count: number };

export function aggregateRating(
  reviews: Array<{ rating: number }> | null | undefined,
): ReviewSummary {
  if (!reviews || reviews.length === 0) return { avg: 0, count: 0 };
  const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
  return { avg: sum / reviews.length, count: reviews.length };
}
