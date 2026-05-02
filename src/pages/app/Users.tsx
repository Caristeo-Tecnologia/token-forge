import { useEffect, useState } from "react";
import { useAuth, canAdmin } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { PageContainer, PageHeader, EmptyState } from "@/components/PageHeader";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { logAudit } from "@/lib/platform";

type Member = {
  id: string; user_id: string; role: "owner" | "admin" | "manager" | "viewer";
  profiles: { email: string | null; full_name: string | null } | null;
};

export default function Users() {
  const { activeCompany, activeRole, user } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);

  const load = async () => {
    if (!activeCompany) return;
    const { data } = await supabase.from("company_members")
      .select("id,user_id,role,profiles(email,full_name)")
      .eq("company_id", activeCompany.id);
    setMembers((data ?? []) as unknown as Member[]);
  };

  useEffect(() => { document.title = "Users · Aetheria"; load(); }, [activeCompany]);

  if (!canAdmin(activeRole)) {
    return <PageContainer><EmptyState title="Restricted" description="Only owners and admins can manage users." /></PageContainer>;
  }

  const updateRole = async (m: Member, newRole: Member["role"]) => {
    if (!activeCompany || !user) return;
    const { error } = await supabase.from("company_members").update({ role: newRole }).eq("id", m.id);
    if (error) return toast.error(error.message);
    await logAudit({ companyId: activeCompany.id, actorId: user.id, action: "permission_change", entityType: "member", entityId: m.id, metadata: { from: m.role, to: newRole } });
    toast.success("Role updated");
    load();
  };

  return (
    <PageContainer>
      <PageHeader title="Users & Permissions" subtitle="Granular roles across all platform modules." />
      <div className="glass-card overflow-hidden">
        <table className="w-full text-left">
          <thead><tr className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider bg-secondary/40">
            <th className="px-6 py-3">User</th><th className="px-6 py-3">Email</th><th className="px-6 py-3 w-48">Role</th>
          </tr></thead>
          <tbody className="divide-y divide-border/60">
            {members.map(m => (
              <tr key={m.id}>
                <td className="px-6 py-3 font-medium">{m.profiles?.full_name ?? "—"}</td>
                <td className="px-6 py-3 text-sm text-muted-foreground">{m.profiles?.email ?? "—"}</td>
                <td className="px-6 py-3">
                  <Select value={m.role} onValueChange={(v) => updateRole(m, v as Member["role"])} disabled={m.user_id === user?.id}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="owner">Owner — full control</SelectItem>
                      <SelectItem value="admin">Admin — manage everything except ownership</SelectItem>
                      <SelectItem value="manager">Manager — create & edit</SelectItem>
                      <SelectItem value="viewer">Viewer — read only</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground mt-4">
        Inviting new members by email is coming next. For now, ask them to sign up, then you can promote them once they're in the system.
      </p>
    </PageContainer>
  );
}
