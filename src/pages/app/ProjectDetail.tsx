import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, canWrite, canDelete } from "@/contexts/AuthContext";
import { PageContainer, EmptyState } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { ProductFormDialog } from "@/components/products/ProductForm";
import { fmtNum, fmtUsd, logAudit } from "@/lib/platform";

type Project = {
  id: string; name: string; type: string; status: string;
  description: string | null; created_at: string;
};
type Product = {
  id: string; name: string; symbol: string; status: string;
  total_supply: number; token_price_usd: number; funding_target_usd: number;
  token_unit_definition: string;
};

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const { activeCompany, activeRole, user } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!activeCompany || !id) return;
    setLoading(true);
    const [pj, pr] = await Promise.all([
      supabase.from("projects").select("*").eq("id", id).eq("company_id", activeCompany.id).maybeSingle(),
      supabase.from("products").select("id,name,symbol,status,total_supply,token_price_usd,funding_target_usd,token_unit_definition")
        .eq("project_id", id).eq("company_id", activeCompany.id).order("created_at", { ascending: false }),
    ]);
    setProject((pj.data ?? null) as Project | null);
    setProducts((pr.data ?? []) as Product[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [activeCompany, id]);
  useEffect(() => { if (project) document.title = `${project.name} · Aetheria`; }, [project]);

  const remove = async () => {
    if (!project || !activeCompany || !user) return;
    if (!confirm(`Delete project "${project.name}"? This will also delete its products.`)) return;
    const { error } = await supabase.from("projects").delete().eq("id", project.id);
    if (error) return toast.error(error.message);
    await logAudit({ companyId: activeCompany.id, actorId: user.id, action: "delete", entityType: "project", entityId: project.id, metadata: { name: project.name } });
    toast.success("Project deleted");
    nav("/app/projects");
  };

  if (loading) {
    return <PageContainer><p className="text-muted-foreground">Loading…</p></PageContainer>;
  }

  if (!project) {
    return (
      <PageContainer>
        <EmptyState
          title="Project not found"
          description="It may have been deleted or you don't have access."
          action={<Link to="/app/projects"><Button>Back to projects</Button></Link>}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <Link to="/app/projects" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
        <ArrowLeft className="size-3.5" /> Projects
      </Link>

      <div className="glass-card p-8 mb-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">{project.type.replace("_", " ")}</p>
            <h1 className="text-3xl font-semibold tracking-tight">{project.name}</h1>
            <div className="mt-3"><StatusBadge status={project.status} /></div>
          </div>
          <div className="flex gap-2">
            {canWrite(activeRole) && (
              <Button onClick={() => setOpen(true)}>
                <Plus className="size-4 mr-2" /> New Product
              </Button>
            )}
            {canDelete(activeRole) && (
              <Button variant="outline" onClick={remove} className="text-destructive hover:text-destructive">
                <Trash2 className="size-4 mr-2" /> Delete
              </Button>
            )}
          </div>
        </div>
        {project.description && (
          <p className="text-muted-foreground mt-6 max-w-3xl whitespace-pre-line">{project.description}</p>
        )}
        <p className="text-xs text-muted-foreground mt-6">Created {new Date(project.created_at).toLocaleDateString()}</p>
      </div>

      <h2 className="text-lg font-semibold mb-4">Products</h2>
      {products.length === 0 ? (
        <EmptyState
          title="No products yet"
          description="Tokenize the first asset offering for this project."
          action={canWrite(activeRole) ? <Button onClick={() => setOpen(true)}><Plus className="size-4 mr-2" /> New Product</Button> : undefined}
        />
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
              {products.map(p => (
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

      <ProductFormDialog
        open={open}
        onOpenChange={setOpen}
        projects={[{ id: project.id, name: project.name }]}
        defaultProjectId={project.id}
        lockProject
        onCreated={load}
      />
    </PageContainer>
  );
}
