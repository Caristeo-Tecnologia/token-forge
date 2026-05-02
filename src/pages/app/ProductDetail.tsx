import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth, canWrite } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { PageContainer, PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { fmtUsd, fmtNum, logAudit } from "@/lib/platform";
import { ArrowLeft, CheckCircle2, Send, Globe, Coins } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DocumentsTab } from "@/components/documents/DocumentsTab";

type Product = {
  id: string; company_id: string; project_id: string; name: string; symbol: string;
  description: string | null; status: string; total_supply: number;
  token_price_usd: number; funding_target_usd: number;
  token_unit_type: string; token_unit_definition: string;
  approved_at: string | null; published_at: string | null;
};
type SmartContract = { id: string; mock_address: string; network: string; supply_issued: number; tokens_sold: number; status: string };

const NEXT: Record<string, { next: string; label: string; icon: any }> = {
  draft: { next: "under_review", label: "Submit for review", icon: Send },
  under_review: { next: "approved", label: "Approve", icon: CheckCircle2 },
  approved: { next: "published", label: "Publish", icon: Globe },
};

const randHex = (n: number) => Array.from({ length: n }, () => Math.floor(Math.random() * 16).toString(16)).join("");

export default function ProductDetail() {
  const { id } = useParams();
  const { activeCompany, activeRole, user } = useAuth();
  const [p, setP] = useState<Product | null>(null);
  const [sc, setSc] = useState<SmartContract | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!id) return;
    const { data } = await supabase.from("products").select("*").eq("id", id).maybeSingle();
    setP(data as Product);
    const { data: scData } = await supabase.from("smart_contracts").select("*").eq("product_id", id).maybeSingle();
    setSc(scData as SmartContract | null);
  };

  useEffect(() => {
    document.title = "Product · Aetheria";
    load();
  }, [id]);

  const advance = async () => {
    if (!p || !user || !activeCompany) return;
    const step = NEXT[p.status];
    if (!step) return;
    setLoading(true);
    try {
      const updates: any = { status: step.next };
      if (step.next === "approved") updates.approved_at = new Date().toISOString();
      if (step.next === "published") updates.published_at = new Date().toISOString();

      const { error } = await supabase.from("products").update(updates).eq("id", p.id);
      if (error) throw error;

      // Auto-mint simulated smart contract on approval
      if (step.next === "approved" && !sc) {
        const { data: newSc, error: scErr } = await supabase.from("smart_contracts").insert({
          company_id: activeCompany.id,
          product_id: p.id,
          mock_address: `SoL${randHex(40)}`,
          network: "solana-devnet-simulated",
          supply_issued: p.total_supply,
          tokens_sold: 0,
          status: "deployed",
        }).select().single();
        if (scErr) throw scErr;
        setSc(newSc as SmartContract);

        await supabase.from("token_transactions").insert({
          company_id: activeCompany.id,
          product_id: p.id,
          tx_type: "mint",
          amount: p.total_supply,
          unit_price_usd: p.token_price_usd,
          total_usd: 0,
          mock_tx_hash: `0x${randHex(64)}`,
        });
      }

      if (step.next === "published" && sc) {
        await supabase.from("smart_contracts").update({ status: "active" }).eq("id", sc.id);
      }

      await logAudit({
        companyId: activeCompany.id, actorId: user.id, action: `status_change_${step.next}`,
        entityType: "product", entityId: p.id, metadata: { from: p.status, to: step.next },
      });
      toast.success(`Status: ${step.next.replace("_", " ")}`);
      load();
    } catch (err: any) {
      toast.error(err.message ?? "Failed");
    } finally { setLoading(false); }
  };

  if (!p) return <PageContainer><div className="text-muted-foreground">Loading…</div></PageContainer>;

  const step = NEXT[p.status];
  const fundingRaised = sc ? Number(sc.tokens_sold) * Number(p.token_price_usd) : 0;
  const fundingPct = Number(p.funding_target_usd) ? (fundingRaised / Number(p.funding_target_usd)) * 100 : 0;

  return (
    <PageContainer>
      <Link to="/app/products" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="size-4" /> Back to products
      </Link>

      <PageHeader
        title={p.name}
        subtitle={`Symbol ${p.symbol} · ${p.token_unit_definition}`}
        actions={
          <div className="flex items-center gap-3">
            <StatusBadge status={p.status} />
            {step && canWrite(activeRole) && (
              <Button onClick={advance} disabled={loading}>
                <step.icon className="size-4 mr-2" /> {step.label}
              </Button>
            )}
          </div>
        }
      />

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="glass-card p-6"><p className="text-sm text-muted-foreground mb-2">Total Supply</p><p className="text-2xl font-semibold tabular">{fmtNum(p.total_supply)}</p></div>
            <div className="glass-card p-6"><p className="text-sm text-muted-foreground mb-2">Token Price</p><p className="text-2xl font-semibold tabular">{fmtUsd(Number(p.token_price_usd))}</p></div>
            <div className="glass-card p-6"><p className="text-sm text-muted-foreground mb-2">Funding Target</p><p className="text-2xl font-semibold tabular">{fmtUsd(Number(p.funding_target_usd))}</p></div>
          </div>

          <div className="glass-card p-6">
            <h3 className="font-semibold mb-4">Funding progress</h3>
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-2xl font-semibold tabular">{fmtUsd(fundingRaised)}</span>
              <span className="text-sm text-muted-foreground">{fundingPct.toFixed(1)}% of {fmtUsd(Number(p.funding_target_usd))}</span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div className="h-full bg-primary transition-all" style={{ width: `${Math.min(100, fundingPct)}%` }} />
            </div>
          </div>

          <div className="glass-card p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2"><Coins className="size-4" /> Simulated Smart Contract</h3>
            {sc ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div><p className="text-muted-foreground">Network</p><p className="font-mono mt-1">{sc.network}</p></div>
                <div><p className="text-muted-foreground">Status</p><div className="mt-1"><StatusBadge status={sc.status} /></div></div>
                <div className="sm:col-span-2"><p className="text-muted-foreground">Mock address</p><p className="font-mono text-xs mt-1 break-all">{sc.mock_address}</p></div>
                <div><p className="text-muted-foreground">Supply issued</p><p className="tabular mt-1">{fmtNum(sc.supply_issued)}</p></div>
                <div><p className="text-muted-foreground">Tokens sold</p><p className="tabular mt-1">{fmtNum(sc.tokens_sold)}</p></div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Smart contract is minted automatically when the product is approved.</p>
            )}
          </div>

          {p.description && (
            <div className="glass-card p-6">
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-line">{p.description}</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="documents" className="mt-6">
          <DocumentsTab
            companyId={p.company_id}
            scope={{ productId: p.id }}
            canManage={canWrite(activeRole)}
          />
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
