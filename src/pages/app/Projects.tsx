import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth, canWrite, canDelete } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { PageContainer, PageHeader, EmptyState } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { logAudit } from "@/lib/platform";

type Project = {
  id: string; name: string; type: string; status: string; description: string | null; created_at: string;
};

const PROJECT_TYPES = ["mining", "real_estate", "energy", "agriculture", "other"];

export default function Projects() {
  const { activeCompany, activeRole, user } = useAuth();
  const [items, setItems] = useState<Project[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!activeCompany) return;
    const { data } = await supabase.from("projects")
      .select("id,name,type,status,description,created_at")
      .eq("company_id", activeCompany.id)
      .order("created_at", { ascending: false });
    setItems((data ?? []) as Project[]);
  };

  useEffect(() => { document.title = "Projects · Aetheria"; load(); }, [activeCompany]);

  const create = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!activeCompany || !user) return;
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") ?? "").trim();
    const type = String(fd.get("type") ?? "other") as any;
    const description = String(fd.get("description") ?? "").trim() || null;
    if (!name) return toast.error("Name required");
    setLoading(true);
    const { data, error } = await supabase.from("projects").insert({
      company_id: activeCompany.id, name, type, description, created_by: user.id,
    }).select().single();
    setLoading(false);
    if (error) return toast.error(error.message);
    await logAudit({ companyId: activeCompany.id, actorId: user.id, action: "create", entityType: "project", entityId: data.id, metadata: { name } });
    toast.success("Project created");
    setOpen(false);
    load();
  };

  const remove = async (id: string, name: string) => {
    if (!confirm(`Delete project "${name}"? This will also delete its products.`)) return;
    if (!activeCompany || !user) return;
    const { error } = await supabase.from("projects").delete().eq("id", id);
    if (error) return toast.error(error.message);
    await logAudit({ companyId: activeCompany.id, actorId: user.id, action: "delete", entityType: "project", entityId: id, metadata: { name } });
    toast.success("Deleted");
    load();
  };

  return (
    <PageContainer>
      <PageHeader
        title="Projects"
        subtitle="Underlying real-world ventures backing your tokenized products."
        actions={canWrite(activeRole) && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="size-4 mr-2" /> New Project</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create project</DialogTitle></DialogHeader>
              <form onSubmit={create} className="space-y-4">
                <div className="space-y-2"><Label>Name</Label><Input name="name" required maxLength={120} /></div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select name="type" defaultValue="other">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{PROJECT_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace("_"," ")}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Description</Label><Textarea name="description" maxLength={2000} rows={4} /></div>
                <DialogFooter><Button type="submit" disabled={loading}>{loading ? "Creating…" : "Create"}</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      />

      {items.length === 0 ? (
        <EmptyState title="No projects yet" description="Projects represent the real-world ventures behind your tokenized products." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map(p => (
            <div key={p.id} className="glass-card p-6 group">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{p.type.replace("_"," ")}</p>
                  <h3 className="text-lg font-semibold mt-1">{p.name}</h3>
                </div>
                <StatusBadge status={p.status} />
              </div>
              <p className="text-sm text-muted-foreground line-clamp-3 mb-4">{p.description ?? "No description."}</p>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{new Date(p.created_at).toLocaleDateString()}</span>
                {canDelete(activeRole) && (
                  <button onClick={() => remove(p.id, p.name)} className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive/80">
                    <Trash2 className="size-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
