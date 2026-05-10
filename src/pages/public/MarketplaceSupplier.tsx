import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { mapPoolToOffer, supplierDisplayName, type PoolWithSupplier } from "@/lib/marketplace";
import type { Database } from "@/integrations/supabase/types";

import { OfferCard } from "@/components/ui/offer-carousel";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

type Supplier = Pick<
  Database["public"]["Tables"]["suppliers"]["Row"],
  "id" | "fantasy_name" | "company_name" | "logo_url" | "description" | "status" | "created_at"
>;

const POOL_SELECT = `
  id, name, slug, listing_title, listing_body, description, asset_class_name,
  unit_price, thumbnail_url, status, listed_at, created_at, token_symbol,
  token_name, supplier_id, available_supply, total_supply, marketplace_listed,
  blockchain_status, company_id, created_by_admin_id, display_unit_label,
  metadata_uri, mint_address, pda_address, performance_mock_pct,
  physical_available, physical_total, physical_unit, product_id,
  tokens_per_physical_unit, updated_at, volume_mock_usd,
  suppliers:supplier_id ( id, fantasy_name, company_name, logo_url )
`;

export default function MarketplaceSupplier() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const isLoggedIn = !!user;

  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [pools, setPools] = useState<PoolWithSupplier[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    document.title = "Supplier · Farmchain";

    (async () => {
      setLoading(true);
      const [supRes, poolsRes] = await Promise.all([
        supabase
          .from("suppliers")
          .select("id, fantasy_name, company_name, logo_url, description, status, created_at")
          .eq("id", id)
          .maybeSingle(),
        supabase
          .from("asset_pools")
          .select(POOL_SELECT)
          .eq("supplier_id", id)
          .eq("marketplace_listed", true)
          .in("status", ["approved", "tokenized", "paused", "sold_out"])
          .order("listed_at", { ascending: false, nullsFirst: false }),
      ]);

      if (supRes.error) {
        console.error(supRes.error);
        toast.error("Failed to load supplier");
      }
      setSupplier((supRes.data as Supplier) ?? null);
      setPools((poolsRes.data ?? []) as unknown as PoolWithSupplier[]);
      setLoading(false);
    })();
  }, [id]);

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
