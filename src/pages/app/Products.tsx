import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth, canWrite } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { PageContainer, PageHeader, EmptyState } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { fmtUsd, fmtNum } from "@/lib/platform";
import { ProductFormDialog } from "@/components/products/ProductForm";

type Product = {
  id: string; name: string; symbol: string; status: string;
  total_supply: number; token_price_usd: number; funding_target_usd: number;
  token_unit_type: string; token_unit_definition: string;
  project_id: string; created_at: string;
};
type Project = { id: string; name: string };

export default function Products() {
  const { activeCompany, activeRole } = useAuth();
  const [items, setItems] = useState<Product[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [open, setOpen] = useState(false);

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

  return (
    <PageContainer>
      <PageHeader
        title="Products"
        subtitle="Tokenized investment products. Each follows the lifecycle: Draft → Review → Approved → Published."
        actions={canWrite(activeRole) && projects.length > 0 && (
          <>
            <Button onClick={() => setOpen(true)}><Plus className="size-4 mr-2" /> New Product</Button>
            <ProductFormDialog open={open} onOpenChange={setOpen} projects={projects} onCreated={load} />
          </>
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
