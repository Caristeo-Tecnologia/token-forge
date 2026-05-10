import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type SupplierRow = Database["public"]["Tables"]["suppliers"]["Row"];

export default function SupplierApprovals() {
  const [rows, setRows] = useState<SupplierRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("suppliers")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setRows((data ?? []) as SupplierRow[]);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to load suppliers");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const setStatus = async (id: string, status: "approved" | "rejected") => {
    setBusyId(id);
    try {
      const { error } = await supabase.from("suppliers").update({ status }).eq("id", id);
      if (error) throw error;
      toast.success(status === "approved" ? "Supplier approved" : "Supplier rejected");
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return <p className="text-muted-foreground text-sm">Loading pending suppliers…</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Supplier approvals</h1>
        <p className="text-sm text-muted-foreground mt-1">Approve or reject supplier registrations.</p>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No pending suppliers.</p>
      ) : (
        <ul className="space-y-3">
          {rows.map(s => (
            <li key={s.id} className="glass-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="font-medium">{s.company_name}</p>
                <p className="text-sm text-muted-foreground">{s.email ?? "—"} · {s.phone ?? "—"}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(s.created_at).toLocaleString()}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busyId === s.id}
                  onClick={() => void setStatus(s.id, "rejected")}
                >
                  Reject
                </Button>
                <Button size="sm" disabled={busyId === s.id} onClick={() => void setStatus(s.id, "approved")}>
                  Approve
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
