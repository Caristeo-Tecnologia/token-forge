import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { PageContainer, PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { fmtNum, fmtUsd, fmtUsdCompact } from "@/lib/platform";
import { Coins, FileText, Package, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";

interface Stats {
  totalFunding: number;
  tokensSold: number;
  activeContracts: number;
  fundingPct: number;
}

interface ProductRow {
  id: string; name: string; symbol: string;
  funding_target_usd: number; total_supply: number;
  status: string; token_price_usd: number;
}

export default function Dashboard() {
  const { activeCompany } = useAuth();
  const [stats, setStats] = useState<Stats>({ totalFunding: 0, tokensSold: 0, activeContracts: 0, fundingPct: 0 });
  const [products, setProducts] = useState<ProductRow[]>([]);

  useEffect(() => {
    document.title = "Dashboard · Aetheria";
    if (!activeCompany) return;
    (async () => {
      const [{ data: prods }, { data: txs }, { data: contracts }] = await Promise.all([
        supabase.from("products").select("id,name,symbol,funding_target_usd,total_supply,status,token_price_usd")
          .eq("company_id", activeCompany.id).order("created_at", { ascending: false }).limit(8),
        supabase.from("token_transactions").select("amount,total_usd,tx_type")
          .eq("company_id", activeCompany.id).eq("tx_type", "sale"),
        supabase.from("contracts").select("id").eq("company_id", activeCompany.id),
      ]);
      const totalFunding = (txs ?? []).reduce((s, t) => s + Number(t.total_usd ?? 0), 0);
      const tokensSold = (txs ?? []).reduce((s, t) => s + Number(t.amount ?? 0), 0);
      const totalTarget = (prods ?? []).reduce((s, p) => s + Number(p.funding_target_usd ?? 0), 0);
      setStats({
        totalFunding,
        tokensSold,
        activeContracts: contracts?.length ?? 0,
        fundingPct: totalTarget ? (totalFunding / totalTarget) * 100 : 0,
      });
      setProducts((prods ?? []) as ProductRow[]);
    })();
  }, [activeCompany]);

  const kpis = [
    { label: "Total Funding", value: fmtUsd(stats.totalFunding), icon: TrendingUp, accent: true },
    { label: "Tokens Sold", value: fmtNum(stats.tokensSold), icon: Coins },
    { label: "Active Contracts", value: fmtNum(stats.activeContracts), icon: FileText },
    { label: "Funding Progress", value: `${stats.fundingPct.toFixed(1)}%`, icon: Package },
  ];

  return (
    <PageContainer>
      <PageHeader
        title="Overview"
        subtitle={`Monitor ${activeCompany?.name ?? "your"} tokenized asset portfolio.`}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {kpis.map(k => (
          <div key={k.label} className="glass-card p-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-muted-foreground">{k.label}</p>
              <k.icon className="size-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-semibold tracking-tight tabular">{k.value}</p>
          </div>
        ))}
      </div>

      <div className="glass-card overflow-hidden">
        <div className="px-6 py-5 border-b border-border/60 flex items-center justify-between">
          <h2 className="font-semibold">Recent Products</h2>
          <Link to="/app/products" className="text-sm text-primary hover:underline">View all →</Link>
        </div>
        {products.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">No products yet. <Link to="/app/products" className="text-primary hover:underline">Create one</Link>.</div>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider bg-secondary/40">
                <th className="px-6 py-3">Product</th>
                <th className="px-6 py-3">Symbol</th>
                <th className="px-6 py-3 text-right">Token Price</th>
                <th className="px-6 py-3 text-right">Funding Target</th>
                <th className="px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {products.map(p => (
                <tr key={p.id} className="hover:bg-secondary/40 transition-colors">
                  <td className="px-6 py-4">
                    <Link to={`/app/products/${p.id}`} className="font-medium hover:text-primary">{p.name}</Link>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs">{p.symbol}</td>
                  <td className="px-6 py-4 text-right tabular text-sm">{fmtUsd(Number(p.token_price_usd))}</td>
                  <td className="px-6 py-4 text-right tabular text-sm">{fmtUsd(Number(p.funding_target_usd))}</td>
                  <td className="px-6 py-4"><StatusBadge status={p.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </PageContainer>
  );
}
