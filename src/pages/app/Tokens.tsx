import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { PageContainer, PageHeader, EmptyState } from "@/components/PageHeader";
import { fmtNum, fmtUsd } from "@/lib/platform";
import { StatusBadge } from "@/components/StatusBadge";

type Tx = {
  id: string; tx_type: string; amount: number; unit_price_usd: number | null; total_usd: number | null;
  bearer_code: string | null; mock_tx_hash: string; created_at: string;
  products: { name: string; symbol: string } | null;
};

export default function Tokens() {
  const { activeCompany } = useAuth();
  const [txs, setTxs] = useState<Tx[]>([]);

  useEffect(() => {
    document.title = "Tokens · Aetheria";
    if (!activeCompany) return;
    supabase.from("token_transactions")
      .select("*, products(name, symbol)")
      .eq("company_id", activeCompany.id)
      .order("created_at", { ascending: false })
      .limit(200)
      .then(({ data }) => setTxs((data ?? []) as unknown as Tx[]));
  }, [activeCompany]);

  return (
    <PageContainer>
      <PageHeader title="Token Ledger" subtitle="Simulated on-chain activity: mints, sales, transfers." />
      {txs.length === 0 ? <EmptyState title="No transactions yet" description="Approve a product to mint its supply, or simulate a purchase from the public catalog." /> : (
        <div className="glass-card overflow-hidden">
          <table className="w-full text-left">
            <thead><tr className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider bg-secondary/40">
              <th className="px-6 py-3">When</th><th className="px-6 py-3">Type</th><th className="px-6 py-3">Product</th>
              <th className="px-6 py-3 text-right">Amount</th><th className="px-6 py-3 text-right">Total</th>
              <th className="px-6 py-3">Bearer</th><th className="px-6 py-3">Tx Hash</th>
            </tr></thead>
            <tbody className="divide-y divide-border/60">
              {txs.map(t => (
                <tr key={t.id} className="hover:bg-secondary/40 transition-colors">
                  <td className="px-6 py-3 text-xs text-muted-foreground">{new Date(t.created_at).toLocaleString()}</td>
                  <td className="px-6 py-3"><StatusBadge status={t.tx_type === "mint" ? "deployed" : t.tx_type === "sale" ? "active" : "pending"} /></td>
                  <td className="px-6 py-3 text-sm font-medium">{t.products?.name} <span className="font-mono text-[11px] text-muted-foreground ml-1">{t.products?.symbol}</span></td>
                  <td className="px-6 py-3 text-right tabular text-sm">{fmtNum(t.amount)}</td>
                  <td className="px-6 py-3 text-right tabular text-sm">{t.total_usd != null ? fmtUsd(Number(t.total_usd)) : "—"}</td>
                  <td className="px-6 py-3 font-mono text-[11px] text-muted-foreground">{t.bearer_code ? t.bearer_code.slice(0, 12) + "…" : "—"}</td>
                  <td className="px-6 py-3 font-mono text-[11px] text-muted-foreground">{t.mock_tx_hash.slice(0, 16)}…</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PageContainer>
  );
}
