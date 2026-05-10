import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Layers, Package, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageContainer, PageHeader, EmptyState } from "@/components/PageHeader";
import { fmtNum, fmtUsd } from "@/lib/platform";
import type { Database } from "@/integrations/supabase/types";

type Pool = Pick<
  Database["public"]["Tables"]["asset_pools"]["Row"],
  | "id"
  | "name"
  | "listing_title"
  | "asset_class_name"
  | "unit_price"
  | "available_supply"
  | "total_supply"
  | "status"
  | "thumbnail_url"
  | "marketplace_listed"
  | "token_symbol"
  | "product_id"
  | "supplier_id"
  | "company_id"
  | "listed_at"
  | "created_at"
>;

const POOL_COLUMNS =
  "id, name, listing_title, asset_class_name, unit_price, available_supply, total_supply, status, thumbnail_url, marketplace_listed, token_symbol, product_id, supplier_id, company_id, listed_at, created_at";

export default function SupplierPools() {
  const { activeCompany, supplierProfile } = useAuth();
  const [pools, setPools] = useState<Pool[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Pools · Farmchain";
    (async () => {
      setLoading(true);
      let query = supabase.from("asset_pools").select(POOL_COLUMNS);
      if (supplierProfile?.id) {
        query = query.eq("supplier_id", supplierProfile.id);
      } else if (activeCompany?.id) {
        query = query.eq("company_id", activeCompany.id);
      } else {
        setPools([]);
        setLoading(false);
        return;
      }
      const { data, error } = await query.order("listed_at", {
        ascending: false,
        nullsFirst: false,
      });
      if (error) console.error(error);
      setPools((data ?? []) as Pool[]);
      setLoading(false);
    })();
  }, [activeCompany?.id, supplierProfile?.id]);

  const stats = useMemo(() => {
    const listed = pools.filter((p) => p.marketplace_listed).length;
    const live = pools.filter(
      (p) => p.marketplace_listed && (p.status === "approved" || p.status === "tokenized"),
    ).length;
    const tokensAvailable = pools.reduce((sum, p) => sum + Number(p.available_supply ?? 0), 0);
    return { listed, live, tokensAvailable };
  }, [pools]);

  return (
    <PageContainer>
      <PageHeader
        title="Pools"
        subtitle="Manage your tokenized asset pools — edit listings, status, and documents."
        actions={
          <Button asChild>
            <Link to="/app/pools/new">
              <Plus className="size-4 mr-2" /> New pool
            </Link>
          </Button>
        }
      />

      <section className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        <KpiCard label="Total pools" value={fmtNum(pools.length)} />
        <KpiCard label="Live on marketplace" value={fmtNum(stats.live)} />
        <KpiCard label="Tokens available" value={fmtNum(stats.tokensAvailable)} />
      </section>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : pools.length === 0 ? (
        <EmptyState
          title="No pools yet"
          description="Create your first asset pool to start receiving orders."
          action={
            <Button asChild>
              <Link to="/app/pools/new">
                <Plus className="size-4 mr-2" /> New pool
              </Link>
            </Button>
          }
        />
      ) : (
        <ul className="space-y-3">
          {pools.map((p) => {
            const ratio = Number(p.total_supply)
              ? Math.min(100, (Number(p.available_supply ?? 0) / Number(p.total_supply)) * 100)
              : 0;
            return (
              <li key={p.id}>
                <Link
                  to={`/app/pools/${p.id}`}
                  className="glass-card p-4 flex items-center gap-4 hover:shadow-md transition-shadow"
                >
                  <div className="size-14 rounded-lg overflow-hidden bg-muted shrink-0">
                    {p.thumbnail_url ? (
                      <img src={p.thumbnail_url} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <Layers className="size-6" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium truncate">{p.listing_title || p.name}</p>
                      <Badge variant="outline" className="capitalize text-[11px] shrink-0">
                        {p.status.replace("_", " ")}
                      </Badge>
                      {p.marketplace_listed ? (
                        <Badge variant="secondary" className="text-[11px] shrink-0">
                          Listed
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[11px] shrink-0">
                          Unlisted
                        </Badge>
                      )}
                      {!p.product_id && (
                        <Badge variant="destructive" className="text-[11px] shrink-0">
                          Provisioning…
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1">
                      <span>{p.asset_class_name ?? "—"}</span>
                      <span className="font-mono">{p.token_symbol}</span>
                      <span>
                        {fmtNum(Number(p.available_supply ?? 0))} / {fmtNum(Number(p.total_supply))}{" "}
                        available
                      </span>
                      <span className="tabular">{fmtUsd(Number(p.unit_price))}</span>
                    </div>
                    <div className="h-1 bg-secondary rounded-full overflow-hidden mt-2">
                      <div className="h-full bg-primary" style={{ width: `${ratio}%` }} />
                    </div>
                  </div>
                  <ArrowRight className="size-4 text-muted-foreground shrink-0" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </PageContainer>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass-card p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
        <Package className="size-4" />
        {label}
      </div>
      <p className="text-2xl font-semibold tabular">{value}</p>
    </div>
  );
}
