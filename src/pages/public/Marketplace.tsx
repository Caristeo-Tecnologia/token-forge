import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Filter as FilterIcon, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { OfferCard, OfferCarousel } from "@/components/ui/offer-carousel";
import {
  mapPoolToOffer,
  supplierDisplayName,
  type PoolWithSupplier,
} from "@/lib/marketplace";
import type { Database } from "@/integrations/supabase/types";
import { FarmchainLogoImg, FARMCHAIN_BRAND } from "@/components/FarmchainLogo";

type SortKey = "recent" | "price_asc" | "price_desc" | "name_asc";
type PoolStatus = Database["public"]["Enums"]["pool_status"];

const STATUS_OPTIONS: PoolStatus[] = ["approved", "tokenized", "paused", "sold_out"];
const STATUS_DEFAULT: PoolStatus[] = ["approved", "tokenized"];

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

export default function Marketplace() {
  const { user } = useAuth();
  const isLoggedIn = !!user;

  const [pools, setPools] = useState<PoolWithSupplier[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [assetClasses, setAssetClasses] = useState<string[]>([]);
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<PoolStatus[]>(STATUS_DEFAULT);
  const [priceRange, setPriceRange] = useState<[number, number] | null>(null);
  const [sort, setSort] = useState<SortKey>("recent");

  useEffect(() => {
    document.title = "Marketplace · Farmchain";
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("asset_pools")
        .select(POOL_SELECT)
        .eq("marketplace_listed", true)
        .in("status", STATUS_OPTIONS)
        .order("listed_at", { ascending: false, nullsFirst: false });
      if (error) {
        console.error(error);
        setPools([]);
      } else {
        setPools((data ?? []) as unknown as PoolWithSupplier[]);
      }
      setLoading(false);
    })();
  }, []);

  const fullPriceRange = useMemo<[number, number]>(() => {
    if (!pools.length) return [0, 100];
    const prices = pools.map((p) => Number(p.unit_price)).filter((n) => !Number.isNaN(n));
    if (!prices.length) return [0, 100];
    return [Math.min(...prices), Math.max(...prices)];
  }, [pools]);

  useEffect(() => {
    if (priceRange === null && pools.length) setPriceRange(fullPriceRange);
  }, [pools, fullPriceRange, priceRange]);

  const assetClassOptions = useMemo(
    () =>
      Array.from(
        new Set(pools.map((p) => p.asset_class_name).filter((s): s is string => !!s)),
      ).sort(),
    [pools],
  );

  const supplierOptions = useMemo(() => {
    const map = new Map<string, string>();
    pools.forEach((p) => {
      if (p.suppliers?.id) map.set(p.suppliers.id, supplierDisplayName(p.suppliers));
    });
    return Array.from(map, ([id, name]) => ({ id, name })).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [pools]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = pools.filter((p) => {
      if (q) {
        const hay = `${p.name} ${p.listing_title ?? ""} ${p.asset_class_name ?? ""} ${
          p.token_symbol ?? ""
        }`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (assetClasses.length && !assetClasses.includes(p.asset_class_name ?? ""))
        return false;
      if (selectedSuppliers.length && !selectedSuppliers.includes(p.supplier_id ?? ""))
        return false;
      if (statuses.length && !statuses.includes(p.status)) return false;
      if (isLoggedIn && priceRange) {
        const price = Number(p.unit_price);
        if (price < priceRange[0] || price > priceRange[1]) return false;
      }
      return true;
    });
    const cmpRecent = (a: PoolWithSupplier, b: PoolWithSupplier) =>
      new Date(b.listed_at ?? b.created_at).getTime() -
      new Date(a.listed_at ?? a.created_at).getTime();
    switch (sort) {
      case "price_asc":
        list = [...list].sort((a, b) => Number(a.unit_price) - Number(b.unit_price));
        break;
      case "price_desc":
        list = [...list].sort((a, b) => Number(b.unit_price) - Number(a.unit_price));
        break;
      case "name_asc":
        list = [...list].sort((a, b) => a.name.localeCompare(b.name));
        break;
      default:
        list = [...list].sort(cmpRecent);
    }
    return list;
  }, [pools, search, assetClasses, selectedSuppliers, statuses, priceRange, sort, isLoggedIn]);

  const featured = useMemo(() => filtered.slice(0, 8), [filtered]);

  const toggleArr = <T,>(arr: T[], v: T) =>
    arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];

  const clearFilters = () => {
    setSearch("");
    setAssetClasses([]);
    setSelectedSuppliers([]);
    setStatuses(STATUS_DEFAULT);
    setPriceRange(fullPriceRange);
  };

  const FiltersPanel = (
    <div className="space-y-6">
      <div>
        <Label className="mb-2 block text-sm font-semibold">Asset class</Label>
        <div className="space-y-2">
          {assetClassOptions.length === 0 && (
            <p className="text-xs text-muted-foreground">No options</p>
          )}
          {assetClassOptions.map((opt) => (
            <label key={opt} className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox
                checked={assetClasses.includes(opt)}
                onCheckedChange={() => setAssetClasses(toggleArr(assetClasses, opt))}
              />
              {opt}
            </label>
          ))}
        </div>
      </div>

      <div>
        <Label className="mb-2 block text-sm font-semibold flex items-center justify-between">
          Price range
          {!isLoggedIn && (
            <span className="text-[10px] text-muted-foreground font-normal">
              login required
            </span>
          )}
        </Label>
        <Slider
          min={fullPriceRange[0]}
          max={fullPriceRange[1] || 100}
          step={1}
          value={priceRange ?? fullPriceRange}
          onValueChange={(v) => setPriceRange([v[0], v[1]])}
          disabled={!isLoggedIn}
          className={!isLoggedIn ? "opacity-50" : ""}
        />
        {isLoggedIn && priceRange && (
          <div className="flex justify-between text-xs text-muted-foreground mt-2 tabular">
            <span>${priceRange[0].toFixed(0)}</span>
            <span>${priceRange[1].toFixed(0)}</span>
          </div>
        )}
      </div>

      <div>
        <Label className="mb-2 block text-sm font-semibold">Supplier</Label>
        {supplierOptions.length === 0 ? (
          <p className="text-xs text-muted-foreground">No options</p>
        ) : (
          <ScrollArea className="h-32 pr-2">
            <div className="space-y-2">
              {supplierOptions.map((s) => (
                <label
                  key={s.id}
                  className="flex items-center gap-2 text-sm cursor-pointer"
                >
                  <Checkbox
                    checked={selectedSuppliers.includes(s.id)}
                    onCheckedChange={() =>
                      setSelectedSuppliers(toggleArr(selectedSuppliers, s.id))
                    }
                  />
                  <span className="truncate">{s.name}</span>
                </label>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>

      <div>
        <Label className="mb-2 block text-sm font-semibold">Status</Label>
        <div className="space-y-2">
          {STATUS_OPTIONS.map((opt) => (
            <label
              key={opt}
              className="flex items-center gap-2 text-sm cursor-pointer capitalize"
            >
              <Checkbox
                checked={statuses.includes(opt)}
                onCheckedChange={() => setStatuses(toggleArr(statuses, opt))}
              />
              {opt.replace("_", " ")}
            </label>
          ))}
        </div>
      </div>

      <Button variant="outline" size="sm" className="w-full" onClick={clearFilters}>
        <X className="size-4 mr-2" /> Clear filters
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen mesh-bg">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-7xl mx-auto h-16 flex items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-3">
            <FarmchainLogoImg className="h-9" />
            <span className="font-semibold tracking-tight text-lg">{FARMCHAIN_BRAND}</span>
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <Link
              to="/catalog"
              className="text-muted-foreground hover:text-foreground hidden sm:inline"
            >
              Legacy catalog
            </Link>
            {isLoggedIn ? (
              <Link to="/app" className="text-muted-foreground hover:text-foreground">
                Dashboard →
              </Link>
            ) : (
              <Link to="/auth" className="text-muted-foreground hover:text-foreground">
                Login →
              </Link>
            )}
          </div>
        </div>
      </header>

      <section className="border-b border-border/60">
        <div className="max-w-7xl mx-auto px-6 py-12 text-center">
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight">
            Real-World Asset Marketplace
          </h1>
          <p className="text-muted-foreground mt-3 text-lg max-w-2xl mx-auto">
            Discover tokenized commodities, real estate and curated assets from approved
            suppliers.
          </p>
          <div className="relative mt-8 max-w-xl mx-auto">
            <Search className="size-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, asset class, symbol…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-12 text-base"
            />
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)] gap-8">
        <aside className="hidden lg:block">
          <div className="glass-card p-5 sticky top-24">{FiltersPanel}</div>
        </aside>

        <main>
          <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
            <p className="text-sm text-muted-foreground">
              {loading ? "Loading…" : `${filtered.length} of ${pools.length} pools`}
            </p>
            <div className="flex items-center gap-2">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="lg:hidden">
                    <FilterIcon className="size-4 mr-2" /> Filters
                  </Button>
                </SheetTrigger>
                <SheetContent className="overflow-y-auto">
                  <SheetTitle className="mb-6">Filters</SheetTitle>
                  {FiltersPanel}
                </SheetContent>
              </Sheet>
              <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
                <SelectTrigger className="w-[170px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Most recent</SelectItem>
                  <SelectItem value="price_asc" disabled={!isLoggedIn}>
                    Price ↑
                  </SelectItem>
                  <SelectItem value="price_desc" disabled={!isLoggedIn}>
                    Price ↓
                  </SelectItem>
                  <SelectItem value="name_asc">Name A-Z</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {!loading && featured.length > 0 && (
            <section className="mb-12">
              <h2 className="text-2xl font-semibold tracking-tight mb-5">Featured</h2>
              <OfferCarousel
                offers={featured.map((p) => mapPoolToOffer(p, isLoggedIn))}
              />
            </section>
          )}

          <section>
            <h2 className="text-2xl font-semibold tracking-tight mb-5">All offerings</h2>
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-[380px] rounded-2xl" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="glass-card p-12 text-center">
                <p className="font-semibold">No pools match your filters</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Try clearing some filters.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filtered.map((p) => (
                  <OfferCard
                    key={p.id}
                    offer={mapPoolToOffer(p, isLoggedIn)}
                    className="w-full h-[380px]"
                  />
                ))}
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
