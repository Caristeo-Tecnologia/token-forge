import { supabase } from "@/integrations/supabase/client";

export async function logAudit(params: {
  companyId: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  await supabase.from("audit_logs").insert({
    company_id: params.companyId,
    actor_id: params.actorId,
    action: params.action,
    entity_type: params.entityType,
    entity_id: params.entityId ?? null,
    metadata: params.metadata ?? null,
  });
}

export const fmtUsd = (n: number | null | undefined) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n ?? 0);

export const fmtNum = (n: number | null | undefined) =>
  new Intl.NumberFormat("en-US").format(n ?? 0);
