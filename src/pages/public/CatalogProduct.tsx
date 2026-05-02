import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { fmtUsd, fmtNum } from "@/lib/platform";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, ShieldCheck, FileText, Coins, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

type Product = {
  id: string; company_id: string; project_id: string; name: string; symbol: string; description: string | null;
  total_supply: number; token_price_usd: number; funding_target_usd: number;
  token_unit_type: string; token_unit_definition: string;
};
type Sc = { id: string; tokens_sold: number; supply_issued: number; mock_address: string; network: string };
type PubDoc = { id: string; name: string; category: string; file_url: string };

const randHex = (n: number) => Array.from({ length: n }, () => Math.floor(Math.random() * 16).toString(16)).join("");

export default function CatalogProduct() {
  const { id } = useParams();
  const [p, setP] = useState<Product | null>(null);
  const [sc, setSc] = useState<Sc | null>(null);
  const [docs, setDocs] = useState<PubDoc[]>([]);
  const [amount, setAmount] = useState<number>(1);
  const [acceptRisk, setAcceptRisk] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [bearerCode, setBearerCode] = useState<string | null>(null);

  const load = async () => {
    if (!id) return;
    const { data } = await supabase.from("products").select("*").eq("id", id).eq("status", "published").maybeSingle();
    setP(data as Product);
    const { data: scData } = await supabase.from("smart_contracts").select("*").eq("product_id", id).maybeSingle();
    setSc(scData as Sc);

    if (data) {
      const prod = data as Product;
      const { data: docsData } = await supabase
        .from("documents")
        .select("id,name,category,file_url,project_id,product_id")
        .eq("is_public", true)
        .or(`product_id.eq.${prod.id},project_id.eq.${prod.project_id}`);
      setDocs((docsData ?? []) as PubDoc[]);
    }
  };

  useEffect(() => {
    document.title = "Offering · Aetheria";
    load();
  }, [id]);

  const purchase = async () => {
    if (!p || !sc) return;
    if (amount < 1) return toast.error("Amount must be at least 1");
    const remaining = Number(sc.supply_issued) - Number(sc.tokens_sold);
    if (amount > remaining) return toast.error(`Only ${remaining} tokens available`);
    if (!acceptRisk || !acceptTerms) return toast.error("Please confirm risk and terms");

    setPurchasing(true);
    try {
      const code = `BR-${randHex(24)}`;
      const txHash = `0x${randHex(64)}`;
      const { data, error } = await supabase.rpc("record_token_sale", {
        _product_id: p.id,
        _amount: amount,
        _bearer_code: code,
        _tx_hash: txHash,
      });
      if (error) throw error;
      setBearerCode((data as any)?.bearer_code ?? code);
      toast.success("Purchase recorded on-chain (simulated)");
    } catch (err: any) {
      toast.error(err.message ?? "Purchase failed");
    } finally { setPurchasing(false); }
  };

  if (!p) return <div className="min-h-screen mesh-bg flex items-center justify-center text-muted-foreground">Loading…</div>;

  const sold = sc ? Number(sc.tokens_sold) : 0;
  const raised = sold * Number(p.token_price_usd);
  const pct = Number(p.funding_target_usd) ? (raised / Number(p.funding_target_usd)) * 100 : 0;
  const remaining = sc ? Number(sc.supply_issued) - sold : Number(p.total_supply);

  return (
    <div className="min-h-screen mesh-bg">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto h-16 flex items-center justify-between px-6">
          <Link to="/catalog" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" /> All offerings
          </Link>
          <Link to="/auth" className="text-sm text-muted-foreground hover:text-foreground">Issuer login →</Link>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div>
            <p className="text-xs font-mono text-muted-foreground tracking-wider mb-2">{p.symbol}</p>
            <h1 className="text-3xl font-semibold tracking-tight">{p.name}</h1>
            <p className="text-muted-foreground mt-2">{p.token_unit_definition}</p>
          </div>

          <div className="glass-card p-6">
            <h2 className="font-semibold mb-3 flex items-center gap-2"><Coins className="size-4" /> Token model</h2>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div><dt className="text-muted-foreground">Type</dt><dd className="font-medium capitalize mt-1">{p.token_unit_type.replace("_", " ")}</dd></div>
              <div><dt className="text-muted-foreground">Each token represents</dt><dd className="font-medium mt-1">{p.token_unit_definition}</dd></div>
              <div><dt className="text-muted-foreground">Total supply</dt><dd className="font-medium tabular mt-1">{fmtNum(p.total_supply)}</dd></div>
              <div><dt className="text-muted-foreground">Price per token</dt><dd className="font-medium tabular mt-1">{fmtUsd(Number(p.token_price_usd))}</dd></div>
            </dl>
          </div>

          {p.description && (
            <div className="glass-card p-6">
              <h2 className="font-semibold mb-3 flex items-center gap-2"><FileText className="size-4" /> About this offering</h2>
              <p className="text-sm text-muted-foreground whitespace-pre-line">{p.description}</p>
            </div>
          )}

          {sc && (
            <div className="glass-card p-6">
              <h2 className="font-semibold mb-3 flex items-center gap-2"><ShieldCheck className="size-4" /> Smart contract</h2>
              <div className="text-sm space-y-2">
                <p><span className="text-muted-foreground">Network: </span><span className="font-mono">{sc.network}</span></p>
                <p className="break-all"><span className="text-muted-foreground">Address: </span><span className="font-mono text-xs">{sc.mock_address}</span></p>
              </div>
            </div>
          )}

          {docs.length > 0 && (
            <div className="glass-card p-6">
              <h2 className="font-semibold mb-3 flex items-center gap-2"><FileText className="size-4" /> Public documents</h2>
              <ul className="divide-y divide-border/60">
                {docs.map(d => (
                  <li key={d.id} className="py-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">{d.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{d.category}</p>
                    </div>
                    <a href={d.file_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">Open →</a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <aside className="lg:col-span-1">
          <div className="glass-card p-6 sticky top-24">
            <p className="text-2xl font-semibold tabular">{fmtUsd(raised)}</p>
            <p className="text-xs text-muted-foreground">{pct.toFixed(1)}% of {fmtUsd(Number(p.funding_target_usd))}</p>
            <div className="h-2 bg-secondary rounded-full overflow-hidden my-4">
              <div className="h-full bg-primary" style={{ width: `${Math.min(100, pct)}%` }} />
            </div>
            <p className="text-xs text-muted-foreground mb-6">{fmtNum(remaining)} of {fmtNum(p.total_supply)} tokens available</p>

            {bearerCode ? (
              <div className="space-y-3">
                <div className="rounded-lg bg-success-soft text-success p-4 text-sm">
                  <p className="font-semibold mb-1">Purchase confirmed</p>
                  <p className="text-xs">Save your bearer code — it is the only proof of ownership.</p>
                </div>
                <div className="rounded-lg border border-border p-3 font-mono text-xs break-all">{bearerCode}</div>
                <Button variant="outline" className="w-full" onClick={() => { setBearerCode(null); setAmount(1); setAcceptRisk(false); setAcceptTerms(false); load(); }}>Make another purchase</Button>
              </div>
            ) : (
              <>
                <div className="space-y-3 mb-4">
                  <Label htmlFor="amt">Tokens to purchase</Label>
                  <Input id="amt" type="number" min={1} max={remaining} value={amount} onChange={e => setAmount(Math.max(1, Number(e.target.value)))} />
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total</span>
                    <span className="font-semibold tabular">{fmtUsd(amount * Number(p.token_price_usd))}</span>
                  </div>
                </div>

                <div className="space-y-3 border-t border-border/60 pt-4 mb-4">
                  <label className="flex items-start gap-2 text-xs leading-relaxed cursor-pointer">
                    <Checkbox checked={acceptRisk} onCheckedChange={(v) => setAcceptRisk(v === true)} className="mt-0.5" />
                    <span><AlertTriangle className="inline size-3 mr-1 text-warning" /> I understand tokenized assets carry risk and may lose value. Returns are not guaranteed.</span>
                  </label>
                  <label className="flex items-start gap-2 text-xs leading-relaxed cursor-pointer">
                    <Checkbox checked={acceptTerms} onCheckedChange={(v) => setAcceptTerms(v === true)} className="mt-0.5" />
                    <span>I accept the contract terms and disclaimers for this offering.</span>
                  </label>
                </div>

                <Button onClick={purchase} disabled={purchasing || !acceptRisk || !acceptTerms} className="w-full">
                  {purchasing ? "Processing…" : `Purchase ${fmtNum(amount)} tokens`}
                </Button>
                <p className="text-[11px] text-muted-foreground text-center mt-3">Anonymous bearer-style purchase. Settled in USDC (simulated).</p>
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
