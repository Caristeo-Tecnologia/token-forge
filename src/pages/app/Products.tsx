import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth, canWrite } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { PageContainer, PageHeader, EmptyState } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { fmtUsd, fmtNum, logAudit } from "@/lib/platform";

type Product = {
  id: string; name: string; symbol: string; status: string;
  total_supply: number; token_price_usd: number; funding_target_usd: number;
  token_unit_type: string; token_unit_definition: string;
  project_id: string; created_at: string;
};
type Project = { id: string; name: string };

const UNIT_TYPES = [
  { v: "production", l: "Production (e.g., 1g of gold)" },
  { v: "profit_share", l: "Profit share (e.g., 0.001%)" },
  { v: "asset_fraction", l: "Asset fraction" },
];

export default function Products() {
  const { activeCompany, activeRole, user } = useAuth();
  const [items, setItems] = useState<Product[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!activeCompany) return;
    const [p, pj] = await Promise.all([
      supabase.from("products").select("*").eq("company_id", activeCompany.id).order("created_at", { ascending: false }),
      supabase.from("projects").select("id,name").eq("company_id", activeCompany.id).order("name"),
    ]);
    setItems((p.data ?? []) as Product[]);
    setProjects((pj.data ?? []) as Project[]);
  };

  useEffect(() => { document.title = "Products · Aetheria"; load(); }, [activeCompany]);

  const create = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!activeCompany || !user) return;
    const fd = new FormData(e.currentTarget);
    const payload = {
      company_id: activeCompany.id,
      project_id: String(fd.get("project_id")),
      name: String(fd.get("name") ?? "").trim(),
      symbol: String(fd.get("symbol") ?? "").trim().toUpperCase(),
      description: String(fd.get("description") ?? "").trim() || null,
      token_unit_type: String(fd.get("token_unit_type") ?? "production") as any,
      token_unit_definition: String(fd.get("token_unit_definition") ?? "").trim(),
      total_supply: Number(fd.get("total_supply")),
      token_price_usd: Number(fd.get("token_price_usd")),
      funding_target_usd: Number(fd.get("funding_target_usd")),
      created_by: user.id,
    };
    if (!payload.name || !payload.symbol || !payload.project_id) return toast.error("Fill all required fields");
    if (!(payload.total_supply > 0) || !(payload.token_price_usd > 0)) return toast.error("Supply and price must be > 0");

    setLoading(true);
    const { data, error } = await supabase.from("products").insert(payload).select().single();
    setLoading(false);
    if (error) return toast.error(error.message);
    await logAudit({ companyId: activeCompany.id, actorId: user.id, action: "create", entityType: "product", entityId: data.id, metadata: { name: payload.name } });
    toast.success("Product created (Draft)");
    setOpen(false);
    load();
  };

  return (
    <PageContainer>
      <PageHeader
        title="Products"
        subtitle="Tokenized investment products. Each follows the lifecycle: Draft → Review → Approved → Published."
        actions={canWrite(activeRole) && projects.length > 0 && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="size-4 mr-2" /> New Product</Button></DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>Create tokenized product</DialogTitle></DialogHeader>
              <form onSubmit={create} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Project *</Label>
                    <Select name="project_id" required>
                      <SelectTrigger><SelectValue placeholder="Choose…" /></SelectTrigger>
                      <SelectContent>{projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>Symbol *</Label><Input name="symbol" required maxLength={10} placeholder="GOLD" /></div>
                </div>
                <div className="space-y-2"><Label>Name *</Label><Input name="name" required maxLength={120} /></div>
                <div className="space-y-2"><Label>Description</Label><Textarea name="description" maxLength={2000} rows={3} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Token unit type *</Label>
                    <Select name="token_unit_type" defaultValue="production">
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{UNIT_TYPES.map(u => <SelectItem key={u.v} value={u.v}>{u.l}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>Unit definition *</Label><Input name="token_unit_definition" required placeholder="1g of gold" maxLength={200} /></div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2"><Label>Total supply *</Label><Input name="total_supply" type="number" min={1} required /></div>
                  <div className="space-y-2"><Label>Price (USD) *</Label><Input name="token_price_usd" type="number" step="0.01" min="0.01" required /></div>
                  <div className="space-y-2"><Label>Funding target *</Label><Input name="funding_target_usd" type="number" min="1" required /></div>
                </div>
                <DialogFooter><Button type="submit" disabled={loading}>{loading ? "Creating…" : "Create as Draft"}</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      />

      {projects.length === 0 ? (
        <EmptyState
          title="Create a project first"
          description="Products must be linked to a project."
          action={<Link to="/app/projects"><Button>Go to projects</Button></Link>}
        />
      ) : items.length === 0 ? (
        <EmptyState title="No products yet" description="Tokenize your first asset offering." />
      ) : (
        <div className="glass-card overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider bg-secondary/40">
                <th className="px-6 py-3">Product</th>
                <th className="px-6 py-3">Token model</th>
                <th className="px-6 py-3 text-right">Supply</th>
                <th className="px-6 py-3 text-right">Price</th>
                <th className="px-6 py-3 text-right">Target</th>
                <th className="px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {items.map(p => (
                <tr key={p.id} className="hover:bg-secondary/40 transition-colors">
                  <td className="px-6 py-4">
                    <Link to={`/app/products/${p.id}`} className="font-medium hover:text-primary block">{p.name}</Link>
                    <span className="font-mono text-[11px] text-muted-foreground">{p.symbol}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{p.token_unit_definition}</td>
                  <td className="px-6 py-4 text-right tabular text-sm">{fmtNum(p.total_supply)}</td>
                  <td className="px-6 py-4 text-right tabular text-sm">{fmtUsd(Number(p.token_price_usd))}</td>
                  <td className="px-6 py-4 text-right tabular text-sm">{fmtUsd(Number(p.funding_target_usd))}</td>
                  <td className="px-6 py-4"><StatusBadge status={p.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PageContainer>
  );
}
