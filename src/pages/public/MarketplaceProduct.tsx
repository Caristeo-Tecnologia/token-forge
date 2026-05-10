import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, FileText, ShoppingCart, Send, Star, Tag, Layers, Building2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { fmtNum, fmtUsd } from "@/lib/platform";
import { aggregateRating, supplierDisplayName, type PoolWithSupplier } from "@/lib/marketplace";

import { ProductDetailPage } from "@/components/ui/product-detail-page";
import { ButtonCta } from "@/components/ui/button-shiny";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

type Doc = {
  id: string;
  name: string;
  category: string;
  file_url: string;
  version: number;
  created_at: string;
};

type Review = {
  id: string;
  rating: number;
  comment: string | null;
  customer_id: string;
  customer_name: string;
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
  suppliers:supplier_id ( id, fantasy_name, company_name, logo_url, description, status )
`;

export default function MarketplaceProduct() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, customerProfile } = useAuth();
  const isLoggedIn = !!user;

  const [pool, setPool] = useState<PoolWithSupplier | null>(null);
  const [loading, setLoading] = useState(true);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [hasPosition, setHasPosition] = useState(false);

  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    if (!id) return;
    document.title = "Offering · Farmchain";

    (async () => {
      setLoading(true);
      const { data: poolData, error } = await supabase
        .from("asset_pools")
        .select(POOL_SELECT)
        .eq("id", id)
        .maybeSingle();
      if (error) {
        console.error(error);
        toast.error("Failed to load pool");
      }
      const p = (poolData ?? null) as unknown as PoolWithSupplier | null;
      setPool(p);
      setLoading(false);

      if (!p) return;

      if (p.product_id) {
        const { data: docData } = await supabase
          .from("documents")
          .select("id, name, category, file_url, version, created_at")
          .eq("product_id", p.product_id)
          .eq("is_public", true)
          .order("created_at", { ascending: false });
        setDocs((docData ?? []) as Doc[]);
      } else {
        setDocs([]);
      }

      const { data: reviewData } = await supabase
        .from("product_reviews")
        .select("id, rating, comment, customer_id, customer_name, created_at")
        .eq("pool_id", p.id)
        .order("created_at", { ascending: false });
      setReviews((reviewData ?? []) as Review[]);

      if (customerProfile) {
        const { data: pos } = await supabase
          .from("customer_positions")
          .select("id, token_balance")
          .eq("customer_id", customerProfile.id)
          .eq("pool_id", p.id)
          .maybeSingle();
        setHasPosition(!!pos && Number(pos.token_balance) > 0);
      } else {
        setHasPosition(false);
      }
    })();
  }, [id, customerProfile]);

  const summary = useMemo(() => aggregateRating(reviews), [reviews]);

  const breadcrumbs = useMemo(
    () => [
      { label: "Marketplace", href: "/marketplace" },
      ...(pool?.asset_class_name
        ? [{ label: pool.asset_class_name, href: `/marketplace?class=${encodeURIComponent(pool.asset_class_name)}` }]
        : []),
      ...(pool ? [{ label: pool.listing_title || pool.name, href: `/marketplace/${pool.id}` }] : []),
    ],
    [pool],
  );

  const goAuth = () => navigate(`/auth?next=${encodeURIComponent(location.pathname)}`);

  const submitReview = async () => {
    if (!pool || !customerProfile) return;
    setSubmittingReview(true);
    try {
      const { error } = await supabase.from("product_reviews").insert({
        pool_id: pool.id,
        customer_id: customerProfile.id,
        customer_name: customerProfile.name || user?.email?.split("@")[0] || "Anonymous",
        rating: reviewRating,
        comment: reviewComment.trim() || null,
      });
      if (error) {
        if (error.code === "23505") toast.error("You already reviewed this offering.");
        else throw error;
      } else {
        toast.success("Review posted");
        setReviewComment("");
        setReviewRating(5);
        const { data: refreshed } = await supabase
          .from("product_reviews")
          .select("id, rating, comment, customer_id, customer_name, created_at")
          .eq("pool_id", pool.id)
          .order("created_at", { ascending: false });
        setReviews((refreshed ?? []) as Review[]);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to post review";
      toast.error(message);
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen mesh-bg">
        <PublicHeader />
        <div className="max-w-screen-xl mx-auto p-8">
          <Skeleton className="h-96 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!pool) {
    return (
      <div className="min-h-screen mesh-bg flex flex-col items-center justify-center gap-3">
        <PublicHeader />
        <p className="text-muted-foreground">Offering not found.</p>
        <Button asChild variant="outline">
          <Link to="/marketplace">Back to marketplace</Link>
        </Button>
      </div>
    );
  }

  const supplier = pool.suppliers;
  const supplierName = supplierDisplayName(supplier);

  const tags = [
    pool.asset_class_name && { label: pool.asset_class_name, icon: Tag },
    pool.physical_unit && { label: `Unit: ${pool.physical_unit}`, icon: Layers },
    pool.token_symbol && { label: pool.token_symbol, icon: Tag },
    { label: pool.status.replace("_", " "), icon: Tag },
  ].filter((t): t is { label: string; icon: typeof Tag } => !!t);

  const actions = isLoggedIn ? (
    <div className="flex flex-col sm:flex-row gap-2 my-6">
      <Button
        size="lg"
        className="flex-1 gap-2"
        onClick={() => toast.info("Purchase flow not yet wired here.")}
      >
        <ShoppingCart className="h-5 w-5" /> Buy Now
      </Button>
      <Button
        size="lg"
        variant="outline"
        className="flex-1 gap-2"
        onClick={() => toast.info("Contact request sent (mock).")}
      >
        <Send className="h-5 w-5" /> Contact Seller
      </Button>
    </div>
  ) : (
    <div className="flex flex-col gap-3 my-6 p-5 rounded-xl border border-border bg-muted/40">
      <p className="text-sm text-foreground">
        Faça login para ver o preço, comprar tokens e contatar o fornecedor.
      </p>
      <ButtonCta
        label="Register Now"
        className="w-full sm:w-2/3"
        onClick={goAuth}
      />
    </div>
  );

  const priceFallback = (
    <div className="flex items-center gap-3">
      <ButtonCta label="Register Now" className="w-auto px-6" onClick={goAuth} />
      <span className="text-sm text-muted-foreground">to view price</span>
    </div>
  );

  return (
    <div className="min-h-screen mesh-bg">
      <PublicHeader />

      <div className="max-w-screen-xl mx-auto p-4 sm:p-6 md:p-8">
        <div className="bg-card rounded-2xl shadow-sm overflow-hidden">
          <ProductDetailPage
            product={{
              name: pool.listing_title || pool.name,
              price: isLoggedIn ? Number(pool.unit_price) : null,
              shippingCost: 0,
              currency: "$",
              images: pool.thumbnail_url ? [pool.thumbnail_url] : [],
              description: pool.listing_body || pool.description || "",
              tags,
              priceFallback,
            }}
            seller={{
              id: supplier?.id,
              name: supplierName,
              avatarUrl: supplier?.logo_url || "/placeholder.svg",
              rating: summary.avg,
              href: supplier?.id ? `/marketplace/supplier/${supplier.id}` : undefined,
            }}
            breadcrumbs={breadcrumbs}
            actions={actions}
          />

          <div className="px-4 md:px-8 pb-8">
            <Tabs defaultValue="overview">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="documents">
                  Documents <span className="ml-1.5 text-xs text-muted-foreground">{docs.length}</span>
                </TabsTrigger>
                <TabsTrigger value="reviews">
                  Reviews <span className="ml-1.5 text-xs text-muted-foreground">{summary.count}</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="glass-card p-5">
                    <h3 className="font-semibold flex items-center gap-2 mb-3">
                      <Layers className="size-4" /> Pool specifications
                    </h3>
                    <dl className="grid grid-cols-2 gap-3 text-sm">
                      <SpecRow label="Token symbol" value={pool.token_symbol} />
                      <SpecRow label="Token name" value={pool.token_name} />
                      <SpecRow label="Asset class" value={pool.asset_class_name ?? "—"} />
                      <SpecRow label="Status" value={pool.status.replace("_", " ")} />
                      <SpecRow
                        label="Total supply"
                        value={fmtNum(Number(pool.total_supply))}
                      />
                      <SpecRow
                        label="Available supply"
                        value={fmtNum(Number(pool.available_supply))}
                      />
                      {pool.physical_unit && (
                        <SpecRow
                          label={`Physical unit`}
                          value={`${fmtNum(Number(pool.physical_total ?? 0))} × ${pool.physical_unit}`}
                        />
                      )}
                      {isLoggedIn ? (
                        <SpecRow
                          label="Unit price"
                          value={fmtUsd(Number(pool.unit_price))}
                        />
                      ) : (
                        <SpecRow label="Unit price" value="Login required" muted />
                      )}
                    </dl>
                  </div>

                  {supplier && (
                    <div className="glass-card p-5">
                      <h3 className="font-semibold flex items-center gap-2 mb-3">
                        <Building2 className="size-4" /> About the supplier
                      </h3>
                      <div className="flex items-start gap-3 mb-3">
                        <Avatar className="size-12">
                          <AvatarImage src={supplier.logo_url ?? undefined} alt={supplierName} />
                          <AvatarFallback>{supplierName.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{supplierName}</p>
                          <Badge variant="secondary" className="capitalize text-xs mt-1">
                            {supplier.status?.replace("_", " ")}
                          </Badge>
                        </div>
                      </div>
                      {supplier.description && (
                        <p className="text-sm text-muted-foreground line-clamp-4 whitespace-pre-line">
                          {supplier.description}
                        </p>
                      )}
                      <Button asChild variant="link" className="px-0 mt-2">
                        <Link to={`/marketplace/supplier/${supplier.id}`}>
                          View supplier profile →
                        </Link>
                      </Button>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="documents" className="mt-6">
                <DocumentsList docs={docs} />
              </TabsContent>

              <TabsContent value="reviews" className="mt-6">
                <ReviewsSection
                  summary={summary}
                  reviews={reviews}
                  canPost={isLoggedIn && !!customerProfile && hasPosition}
                  loginPrompt={!isLoggedIn}
                  reviewRating={reviewRating}
                  setReviewRating={setReviewRating}
                  reviewComment={reviewComment}
                  setReviewComment={setReviewComment}
                  submitting={submittingReview}
                  onSubmit={submitReview}
                  onLogin={goAuth}
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}

function PublicHeader() {
  const { user } = useAuth();
  return (
    <header className="border-b border-border/60 bg-background/80 backdrop-blur-md sticky top-0 z-20">
      <div className="max-w-7xl mx-auto h-16 flex items-center justify-between px-6">
        <Link
          to="/marketplace"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> All offerings
        </Link>
        {user ? (
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
  );
}

function SpecRow({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={`text-sm font-medium mt-0.5 capitalize ${muted ? "text-muted-foreground" : ""}`}>
        {value}
      </dd>
    </div>
  );
}

function DocumentsList({ docs }: { docs: Doc[] }) {
  if (docs.length === 0) {
    return (
      <div className="glass-card p-10 text-center">
        <FileText className="size-6 mx-auto text-muted-foreground mb-2" />
        <p className="font-semibold">No public documents yet</p>
        <p className="text-sm text-muted-foreground mt-1">
          The issuer hasn't shared public documents for this offering.
        </p>
      </div>
    );
  }
  return (
    <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {docs.map((d) => (
        <li
          key={d.id}
          className="glass-card p-4 flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="size-10 rounded-lg bg-secondary flex items-center justify-center text-secondary-foreground flex-shrink-0">
              <FileText className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{d.name}</p>
              <p className="text-xs text-muted-foreground capitalize">
                {d.category} · v{d.version}
              </p>
            </div>
          </div>
          <Button asChild size="sm" variant="outline">
            <a href={d.file_url} target="_blank" rel="noopener noreferrer">
              Open
            </a>
          </Button>
        </li>
      ))}
    </ul>
  );
}

function ReviewsSection({
  summary,
  reviews,
  canPost,
  loginPrompt,
  reviewRating,
  setReviewRating,
  reviewComment,
  setReviewComment,
  submitting,
  onSubmit,
  onLogin,
}: {
  summary: { avg: number; count: number };
  reviews: Review[];
  canPost: boolean;
  loginPrompt: boolean;
  reviewRating: number;
  setReviewRating: (n: number) => void;
  reviewComment: string;
  setReviewComment: (s: string) => void;
  submitting: boolean;
  onSubmit: () => void;
  onLogin: () => void;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
      <div>
        <div className="glass-card p-5 mb-5 flex items-center gap-4">
          <div>
            <p className="text-3xl font-bold tabular">{summary.avg.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground">{summary.count} reviews</p>
          </div>
          <div className="flex-1 flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <Star
                key={n}
                className={`size-5 ${
                  n <= Math.round(summary.avg)
                    ? "text-yellow-400 fill-yellow-400"
                    : "text-muted-foreground/40"
                }`}
              />
            ))}
          </div>
        </div>

        {reviews.length === 0 ? (
          <div className="glass-card p-10 text-center">
            <Star className="size-6 mx-auto text-muted-foreground mb-2" />
            <p className="font-semibold">No reviews yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Be the first to share your experience.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {reviews.map((r) => (
              <li key={r.id} className="glass-card p-4">
                <div className="flex items-center gap-3 mb-2">
                  <Avatar className="size-9">
                    <AvatarFallback>{r.customer_name.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{r.customer_name}</p>
                    <div className="flex items-center gap-2">
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Star
                            key={n}
                            className={`size-3 ${
                              n <= r.rating
                                ? "text-yellow-400 fill-yellow-400"
                                : "text-muted-foreground/40"
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        {new Date(r.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                {r.comment && (
                  <p className="text-sm text-muted-foreground whitespace-pre-line">
                    {r.comment}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <aside>
        <div className="glass-card p-5 sticky top-24">
          <h3 className="font-semibold mb-2">Write a review</h3>
          {loginPrompt ? (
            <>
              <p className="text-xs text-muted-foreground mb-3">
                Login to share your experience with this offering.
              </p>
              <ButtonCta label="Register Now" className="w-full" onClick={onLogin} />
            </>
          ) : !canPost ? (
            <p className="text-xs text-muted-foreground">
              You need an active position in this pool to leave a review.
            </p>
          ) : (
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Rating</Label>
                <div className="flex gap-1 mt-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setReviewRating(n)}
                      aria-label={`${n} stars`}
                    >
                      <Star
                        className={`size-6 transition ${
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
                <Label htmlFor="review-comment" className="text-xs">
                  Comment (optional)
                </Label>
                <Textarea
                  id="review-comment"
                  rows={4}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Share what you liked or what could be better…"
                />
              </div>
              <Button onClick={onSubmit} disabled={submitting} className="w-full">
                {submitting ? "Posting…" : "Post review"}
              </Button>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
