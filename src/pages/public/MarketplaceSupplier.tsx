import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Star } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { aggregateRating, mapPoolToOffer, supplierDisplayName, type PoolWithSupplier } from "@/lib/marketplace";
import type { Database } from "@/integrations/supabase/types";

import { OfferCard } from "@/components/ui/offer-carousel";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";

type Supplier = Pick<
  Database["public"]["Tables"]["suppliers"]["Row"],
  "id" | "user_id" | "fantasy_name" | "company_name" | "logo_url" | "description" | "status" | "created_at"
>;

type SupplierReviewRow = {
  id: string;
  rating: number;
  comment: string | null;
  reviewer_id: string;
  reviewer_display_name: string;
  created_at: string;
};

const POOL_SELECT = `
  id, name, slug, listing_title, listing_body, description, asset_class_name,
  unit_price, thumbnail_url, status, listed_at, created_at, token_symbol,
  token_name, supplier_id, available_supply, total_supply, marketplace_listed,
  blockchain_status, company_id, created_by_admin_id, display_unit_label,
  metadata_uri, mint_address, pda_address, performance_mock_pct,
  physical_available, physical_total, physical_unit, product_id,
  tokens_per_physical_unit, updated_at, volume_mock_usd,
  suppliers:supplier_id ( id, user_id, fantasy_name, company_name, logo_url )
`;

export default function MarketplaceSupplier() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const isLoggedIn = !!user;

  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [pools, setPools] = useState<PoolWithSupplier[]>([]);
  const [supplierReviews, setSupplierReviews] = useState<SupplierReviewRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  const loadReviews = useCallback(async (supplierId: string) => {
    const { data } = await supabase
      .from("supplier_reviews")
      .select("id, rating, comment, reviewer_id, reviewer_display_name, created_at")
      .eq("supplier_id", supplierId)
      .order("created_at", { ascending: false });
    setSupplierReviews((data ?? []) as SupplierReviewRow[]);
  }, []);

  useEffect(() => {
    if (!id) return;
    document.title = "Supplier · Farmchain";

    (async () => {
      setLoading(true);
      const [supRes, poolsRes, revRes] = await Promise.all([
        supabase
          .from("suppliers")
          .select("id, user_id, fantasy_name, company_name, logo_url, description, status, created_at")
          .eq("id", id)
          .maybeSingle(),
        supabase
          .from("asset_pools")
          .select(POOL_SELECT)
          .eq("supplier_id", id)
          .eq("marketplace_listed", true)
          .in("status", ["approved", "tokenized", "paused", "sold_out"])
          .order("listed_at", { ascending: false, nullsFirst: false }),
        supabase
          .from("supplier_reviews")
          .select("id, rating, comment, reviewer_id, reviewer_display_name, created_at")
          .eq("supplier_id", id)
          .order("created_at", { ascending: false }),
      ]);

      if (supRes.error) {
        console.error(supRes.error);
        toast.error("Failed to load supplier");
      }
      setSupplier((supRes.data as Supplier) ?? null);
      setPools((poolsRes.data ?? []) as unknown as PoolWithSupplier[]);
      setSupplierReviews((revRes.data ?? []) as SupplierReviewRow[]);
      setLoading(false);
    })();
  }, [id]);

  const reviewSummary = useMemo(() => aggregateRating(supplierReviews), [supplierReviews]);

  const goAuth = () => navigate(`/auth?next=${encodeURIComponent(location.pathname)}`);

  const reviewerDisplayName =
    (user?.user_metadata?.full_name as string | undefined)?.trim() ||
    user?.email?.split("@")[0] ||
    "User";

  const submitReview = async () => {
    if (!supplier || !user) return;
    setSubmittingReview(true);
    try {
      const { error } = await supabase.from("supplier_reviews").insert({
        supplier_id: supplier.id,
        reviewer_id: user.id,
        reviewer_display_name: reviewerDisplayName,
        rating: reviewRating,
        comment: reviewComment.trim() || null,
      });
      if (error) {
        if (error.code === "23505") toast.error("You already reviewed this supplier.");
        else throw error;
      } else {
        toast.success("Review posted");
        setReviewComment("");
        setReviewRating(5);
        await loadReviews(supplier.id);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to post review");
    } finally {
      setSubmittingReview(false);
    }
  };

  const supplierOwner = !!(supplier && user?.id && supplier.user_id === user.id);
  const alreadyReviewed = !!(user?.id && supplierReviews.some((r) => r.reviewer_id === user.id));
  const canRate = isLoggedIn && supplier && !supplierOwner && !alreadyReviewed;

  return (
    <div className="min-h-screen mesh-bg">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-7xl mx-auto h-16 flex items-center justify-between px-6">
          <Link
            to="/marketplace"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" /> All offerings
          </Link>
          {isLoggedIn ? (
            <Link to="/app" className="text-sm text-muted-foreground hover:text-foreground">
              Dashboard →
            </Link>
          ) : (
            <Link to="/auth" className="text-sm text-muted-foreground hover:text-foreground">
              Login →
            </Link>
          )}
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-10">
        {loading ? (
          <Skeleton className="h-40 w-full rounded-2xl mb-10" />
        ) : !supplier ? (
          <div className="glass-card p-12 text-center">
            <p className="font-semibold">Supplier not found</p>
            <Button asChild variant="outline" className="mt-4">
              <Link to="/marketplace">Back to marketplace</Link>
            </Button>
          </div>
        ) : (
          <>
            <section className="glass-card p-6 md:p-8 mb-10">
              <div className="flex flex-col md:flex-row gap-6 items-start">
                <Avatar className="size-20 md:size-24 shrink-0">
                  <AvatarImage
                    src={supplier.logo_url ?? undefined}
                    alt={supplierDisplayName(supplier)}
                  />
                  <AvatarFallback className="text-2xl">
                    {supplierDisplayName(supplier).charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-3 mb-2">
                    <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
                      {supplierDisplayName(supplier)}
                    </h1>
                    <Badge
                      variant={supplier.status === "approved" ? "default" : "secondary"}
                      className="capitalize"
                    >
                      {supplier.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 mb-3">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star
                        key={n}
                        className={`size-4 ${
                          n <= Math.round(reviewSummary.avg)
                            ? "text-yellow-400 fill-yellow-400"
                            : "text-muted-foreground/40"
                        }`}
                      />
                    ))}
                    <span className="text-sm text-muted-foreground ml-2">
                      {reviewSummary.avg.toFixed(1)} · {reviewSummary.count}{" "}
                      {reviewSummary.count === 1 ? "review" : "reviews"}
                    </span>
                  </div>
                  {supplier.fantasy_name &&
                    supplier.company_name &&
                    supplier.fantasy_name !== supplier.company_name && (
                      <p className="text-sm text-muted-foreground mb-2">
                        Legal name: {supplier.company_name}
                      </p>
                    )}
                  {supplier.description ? (
                    <p className="text-sm md:text-base text-muted-foreground whitespace-pre-line">
                      {supplier.description}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">
                      This supplier hasn't added a description yet.
                    </p>
                  )}
                </div>
              </div>
            </section>

            <section className="glass-card p-6 mb-10">
              <h2 className="text-lg font-semibold mb-4">Supplier reviews</h2>
              {supplierReviews.length === 0 ? (
                <p className="text-sm text-muted-foreground mb-4">No reviews yet.</p>
              ) : (
                <ul className="space-y-3 mb-6 max-h-64 overflow-y-auto">
                  {supplierReviews.slice(0, 12).map((r) => (
                    <li key={r.id} className="border-b border-border/60 pb-3 last:border-0">
                      <div className="flex justify-between gap-2 text-sm">
                        <span className="font-medium">{r.reviewer_display_name}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(r.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex gap-0.5 mt-1">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Star
                            key={n}
                            className={`size-3 ${
                              n <= r.rating ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground/40"
                            }`}
                          />
                        ))}
                      </div>
                      {r.comment && (
                        <p className="text-sm text-muted-foreground mt-1 whitespace-pre-line">{r.comment}</p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              <div className="rounded-lg border border-dashed border-border p-4 space-y-3">
                <p className="text-sm font-medium">Rate this supplier</p>
                {!isLoggedIn ? (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <p className="text-xs text-muted-foreground flex-1">Sign in to leave a review.</p>
                    <Button type="button" variant="outline" size="sm" className="w-fit shrink-0" onClick={goAuth}>
                      Register Now
                    </Button>
                  </div>
                ) : supplierOwner ? (
                  <p className="text-xs text-muted-foreground">You cannot review your own supplier profile.</p>
                ) : alreadyReviewed ? (
                  <p className="text-xs text-muted-foreground">You already reviewed this supplier.</p>
                ) : canRate ? (
                  <div className="space-y-2">
                    <div>
                      <Label className="text-xs">Rating</Label>
                      <div className="flex gap-1 mt-1">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button key={n} type="button" onClick={() => setReviewRating(n)} aria-label={`${n} stars`}>
                            <Star
                              className={`size-6 ${
                                n <= reviewRating
                                  ? "text-yellow-400 fill-yellow-400"
                                  : "text-muted-foreground/40 hover:text-yellow-400/70"
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="sup-rev-comment" className="text-xs">
                        Comment (optional)
                      </Label>
                      <Textarea
                        id="sup-rev-comment"
                        rows={3}
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        className="mt-1 text-sm"
                      />
                    </div>
                    <Button type="button" size="sm" className="w-fit" onClick={submitReview} disabled={submittingReview}>
                      {submittingReview ? "Posting…" : "Post review"}
                    </Button>
                  </div>
                ) : null}
              </div>
            </section>

            <section>
              <div className="flex items-baseline justify-between mb-5">
                <h2 className="text-2xl font-semibold tracking-tight">
                  Offerings by {supplierDisplayName(supplier)}
                </h2>
                <p className="text-sm text-muted-foreground">{pools.length} listed</p>
              </div>

              {pools.length === 0 ? (
                <div className="glass-card p-12 text-center">
                  <p className="font-semibold">No active offerings</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    This supplier doesn't have any pools listed right now.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {pools.map((p) => (
                    <OfferCard
                      key={p.id}
                      offer={mapPoolToOffer(p, isLoggedIn)}
                      className="w-full h-[380px]"
                    />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
