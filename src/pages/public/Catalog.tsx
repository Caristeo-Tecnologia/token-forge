import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { fmtUsd, fmtNum } from "@/lib/platform";
import { Button } from "@/components/ui/button";

type Product = {
  id: string; name: string; symbol: string; description: string | null;
  total_supply: number; token_price_usd: number; funding_target_usd: number;
  token_unit_definition: string; published_at: string | null;
};

export default function Catalog() {
  const [products, setProducts] = useState<Product[]>([]);
  const [progress, setProgress] = useState<Record<string, number>>({});

  useEffect(() => {
    document.title = "Catalog · Aetheria";
    (async () => {
      const { data } = await supabase.from("products")
        .select("id,name,symbol,description,total_supply,token_price_usd,funding_target_usd,token_unit_definition,published_at")
        .eq("status", "published")
        .order("published_at", { ascending: false });
      setProducts((data ?? []) as Product[]);

      // fetch sold counts per product
      const ids = (data ?? []).map(p => p.id);
      if (ids.length) {
        const { data: scs } = await supabase.from("smart_contracts")
          .select("product_id,tokens_sold").in("product_id", ids);
        const map: Record<string, number> = {};
        (scs ?? []).forEach((s: any) => { map[s.product_id] = Number(s.tokens_sold); });
        setProgress(map);
      }
    })();
  }, []);

  return (
    <div className="min-h-screen mesh-bg">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto h-16 flex items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-3">
            <div className="size-8 bg-primary rounded-lg flex items-center justify-center">
              <div className="size-3.5 border-2 border-primary-foreground rounded-sm rotate-45" />
            </div>
            <span className="font-semibold tracking-tight text-lg">Aetheria</span>
          </Link>
          <Link to="/auth" className="text-sm text-muted-foreground hover:text-foreground">Issuer login →</Link>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="text-center mb-12 max-w-2xl mx-auto">
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight">Tokenized asset offerings</h1>
          <p className="text-muted-foreground mt-3 text-lg">Real-world assets, structured on-chain. Browse live offerings backed by audited issuers.</p>
        </div>

        {products.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <p className="font-semibold">No published offerings yet</p>
            <p className="text-sm text-muted-foreground mt-1">Check back soon.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map(p => {
              const sold = progress[p.id] ?? 0;
              const raised = sold * Number(p.token_price_usd);
              const pct = Number(p.funding_target_usd) ? (raised / Number(p.funding_target_usd)) * 100 : 0;
              return (
                <Link to={`/catalog/${p.id}`} key={p.id} className="glass-card p-6 hover:shadow-lg transition-shadow group">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-[11px] font-mono text-muted-foreground tracking-wider">{p.symbol}</p>
                      <h3 className="text-lg font-semibold mt-1 group-hover:text-primary transition-colors">{p.name}</h3>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{p.token_unit_definition}</p>
                  <div className="space-y-2">
                    <div className="flex items-baseline justify-between text-sm">
                      <span className="font-semibold tabular">{fmtUsd(raised)}</span>
                      <span className="text-xs text-muted-foreground">{pct.toFixed(1)}%</span>
                    </div>
                    <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${Math.min(100, pct)}%` }} />
                    </div>
                    <p className="text-xs text-muted-foreground">of {fmtUsd(Number(p.funding_target_usd))} target</p>
                  </div>
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/60 text-xs text-muted-foreground">
                    <span>{fmtNum(p.total_supply)} supply</span>
                    <span className="tabular">{fmtUsd(Number(p.token_price_usd))} / token</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
