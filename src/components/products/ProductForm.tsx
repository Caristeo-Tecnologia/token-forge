import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { logAudit } from "@/lib/platform";

const UNIT_TYPES = [
  { v: "production", l: "Production (e.g., 1g of gold)" },
  { v: "profit_share", l: "Profit share (e.g., 0.001%)" },
  { v: "asset_fraction", l: "Asset fraction" },
];

export type ProjectOption = { id: string; name: string };

interface ProductFormProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projects: ProjectOption[];
  defaultProjectId?: string;
  lockProject?: boolean;
  onCreated?: () => void;
}

export function ProductFormDialog({ open, onOpenChange, projects, defaultProjectId, lockProject, onCreated }: ProductFormProps) {
  const { activeCompany, user } = useAuth();
  const [loading, setLoading] = useState(false);

  const create = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!activeCompany || !user) return;
    const fd = new FormData(e.currentTarget);
    const payload = {
      company_id: activeCompany.id,
      project_id: String(fd.get("project_id") ?? defaultProjectId ?? ""),
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
    onOpenChange(false);
    onCreated?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Create tokenized product</DialogTitle></DialogHeader>
        <form onSubmit={create} className="space-y-4 max-h-[70vh] overflow-y-auto px-1 py-2 -mx-1">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Project *</Label>
              {lockProject && defaultProjectId ? (
                <>
                  <Input value={projects.find(p => p.id === defaultProjectId)?.name ?? ""} disabled />
                  <input type="hidden" name="project_id" value={defaultProjectId} />
                </>
              ) : (
                <Select name="project_id" required defaultValue={defaultProjectId}>
                  <SelectTrigger><SelectValue placeholder="Choose…" /></SelectTrigger>
                  <SelectContent>{projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              )}
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
            <div className="space-y-2"><Label>Price (USD) *</Label><CurrencyInput name="token_price_usd" /></div>
            <div className="space-y-2"><Label>Funding target *</Label><CurrencyInput name="funding_target_usd" /></div>
          </div>
          <DialogFooter><Button type="submit" disabled={loading}>{loading ? "Creating…" : "Create as Draft"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
