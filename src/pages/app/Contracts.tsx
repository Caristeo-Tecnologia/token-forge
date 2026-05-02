import { useEffect, useState } from "react";
import { useAuth, canWrite } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { PageContainer, PageHeader, EmptyState } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { logAudit } from "@/lib/platform";

type Contract = {
  id: string; product_id: string; contract_type: string; start_date: string | null; end_date: string | null;
  return_type: string; return_rate_pct: number | null; terms: string | null;
  products: { name: string; symbol: string } | null;
};
type Product = { id: string; name: string };

export default function Contracts() {
  const { activeCompany, activeRole, user } = useAuth();
  const [items, setItems] = useState<Contract[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [open, setOpen] = useState(false);

  const load = async () => {
    if (!activeCompany) return;
    const [c, p] = await Promise.all([
      supabase.from("contracts").select("*, products(name, symbol)").eq("company_id", activeCompany.id).order("created_at", { ascending: false }),
      supabase.from("products").select("id,name").eq("company_id", activeCompany.id),
    ]);
    setItems((c.data ?? []) as unknown as Contract[]);
    setProducts((p.data ?? []) as Product[]);
  };

  useEffect(() => { document.title = "Contracts · Aetheria"; load(); }, [activeCompany]);

  const create = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!activeCompany || !user) return;
    const fd = new FormData(e.currentTarget);
    const payload = {
      company_id: activeCompany.id,
      product_id: String(fd.get("product_id")),
      contract_type: String(fd.get("contract_type") ?? "fixed_duration") as any,
      start_date: String(fd.get("start_date") ?? "") || null,
      end_date: String(fd.get("end_date") ?? "") || null,
      return_type: String(fd.get("return_type") ?? "fixed") as any,
      return_rate_pct: fd.get("return_rate_pct") ? Number(fd.get("return_rate_pct")) : null,
      terms: String(fd.get("terms") ?? "") || null,
    };
    const { data, error } = await supabase.from("contracts").insert(payload).select().single();
    if (error) return toast.error(error.message);
    await logAudit({ companyId: activeCompany.id, actorId: user.id, action: "create", entityType: "contract", entityId: data.id });
    toast.success("Contract created");
    setOpen(false);
    load();
  };

  return (
    <PageContainer>
      <PageHeader
        title="Contracts"
        subtitle="Terms governing tokenized products: duration, returns, lifecycle."
        actions={canWrite(activeRole) && products.length > 0 && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="size-4 mr-2" /> New Contract</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create contract</DialogTitle></DialogHeader>
              <form onSubmit={create} className="space-y-4">
                <div className="space-y-2"><Label>Product *</Label>
                  <Select name="product_id" required>
                    <SelectTrigger><SelectValue placeholder="Choose…" /></SelectTrigger>
                    <SelectContent>{products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Type</Label>
                    <Select name="contract_type" defaultValue="fixed_duration">
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixed_duration">Fixed duration</SelectItem>
                        <SelectItem value="event_based">Event-based</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>Return type</Label>
                    <Select name="return_type" defaultValue="fixed">
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixed">Fixed</SelectItem>
                        <SelectItem value="variable">Variable</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Start date</Label><Input name="start_date" type="date" /></div>
                  <div className="space-y-2"><Label>End date</Label><Input name="end_date" type="date" /></div>
                </div>
                <div className="space-y-2"><Label>Return rate (%)</Label><Input name="return_rate_pct" type="number" step="0.01" /></div>
                <div className="space-y-2"><Label>Terms</Label><Textarea name="terms" rows={4} maxLength={4000} /></div>
                <DialogFooter><Button type="submit">Create</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      />

      {items.length === 0 ? <EmptyState title="No contracts yet" description="Create a product, then attach contract terms." /> : (
        <div className="glass-card overflow-hidden">
          <table className="w-full text-left">
            <thead><tr className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider bg-secondary/40">
              <th className="px-6 py-3">Product</th><th className="px-6 py-3">Type</th><th className="px-6 py-3">Return</th>
              <th className="px-6 py-3">Period</th><th className="px-6 py-3 text-right">Rate</th>
            </tr></thead>
            <tbody className="divide-y divide-border/60">
              {items.map(c => (
                <tr key={c.id} className="hover:bg-secondary/40 transition-colors">
                  <td className="px-6 py-4 font-medium">{c.products?.name}</td>
                  <td className="px-6 py-4 text-sm capitalize">{c.contract_type.replace("_", " ")}</td>
                  <td className="px-6 py-4 text-sm capitalize">{c.return_type}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {c.start_date ?? "—"} → {c.end_date ?? "—"}
                  </td>
                  <td className="px-6 py-4 text-right tabular text-sm">{c.return_rate_pct != null ? `${c.return_rate_pct}%` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PageContainer>
  );
}
