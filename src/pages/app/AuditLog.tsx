import { useEffect, useState } from "react";
import { useAuth, canAdmin } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { PageContainer, PageHeader, EmptyState } from "@/components/PageHeader";

type Log = {
  id: string; action: string; entity_type: string; entity_id: string | null;
  actor_id: string | null; metadata: any; created_at: string;
};

export default function AuditLog() {
  const { activeCompany, activeRole } = useAuth();
  const [logs, setLogs] = useState<Log[]>([]);

  useEffect(() => {
    document.title = "Audit · Aetheria";
    if (!activeCompany || !canAdmin(activeRole)) return;
    supabase.from("audit_logs").select("*").eq("company_id", activeCompany.id)
      .order("created_at", { ascending: false }).limit(500)
      .then(({ data }) => setLogs((data ?? []) as Log[]));
  }, [activeCompany, activeRole]);

  if (!canAdmin(activeRole)) {
    return <PageContainer><EmptyState title="Restricted" description="Audit logs are only visible to owners and admins." /></PageContainer>;
  }

  return (
    <PageContainer>
      <PageHeader title="Audit Log" subtitle="Immutable record of sensitive actions across this company." />
      {logs.length === 0 ? <EmptyState title="No activity yet" /> : (
        <div className="glass-card overflow-hidden">
          <table className="w-full text-left">
            <thead><tr className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider bg-secondary/40">
              <th className="px-6 py-3">When</th><th className="px-6 py-3">Action</th>
              <th className="px-6 py-3">Entity</th><th className="px-6 py-3">Metadata</th>
            </tr></thead>
            <tbody className="divide-y divide-border/60">
              {logs.map(l => (
                <tr key={l.id} className="hover:bg-secondary/40 transition-colors align-top">
                  <td className="px-6 py-3 text-xs text-muted-foreground whitespace-nowrap">{new Date(l.created_at).toLocaleString()}</td>
                  <td className="px-6 py-3 font-mono text-xs">{l.action}</td>
                  <td className="px-6 py-3 text-sm">{l.entity_type}{l.entity_id ? <span className="text-muted-foreground"> · {l.entity_id.slice(0, 8)}</span> : null}</td>
                  <td className="px-6 py-3 font-mono text-[11px] text-muted-foreground max-w-md truncate">{l.metadata ? JSON.stringify(l.metadata) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PageContainer>
  );
}
