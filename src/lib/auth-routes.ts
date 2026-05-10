import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type SupplierStatus = Database["public"]["Enums"]["supplier_status"];

/** Inputs for deciding where to send the user after login or when hitting /auth while authenticated */
export type PostLoginSnapshot = {
  isPlatformAdmin: boolean;
  /** When the user has a suppliers row */
  supplierStatus: SupplierStatus | null;
  hasCompanyMembership: boolean;
  /** When the user has a customers row */
  isCustomer: boolean;
};

export function getPostLoginPath(p: PostLoginSnapshot): string {
  if (p.isPlatformAdmin) return "/admin";
  if (p.supplierStatus === "pending") return "/pending-supplier";
  if (p.supplierStatus === "rejected" || p.supplierStatus === "suspended") return "/pending-supplier";
  if (p.hasCompanyMembership) return "/app";
  if (p.isCustomer) return "/portal";
  return "/onboarding";
}

export function buildPostLoginSnapshot(input: {
  platformAdmin: { active: boolean } | null;
  supplier: { status: SupplierStatus } | null;
  customer: { id: string } | null;
  membershipsLength: number;
}): PostLoginSnapshot {
  return {
    isPlatformAdmin: !!input.platformAdmin?.active,
    supplierStatus: input.supplier?.status ?? null,
    hasCompanyMembership: input.membershipsLength > 0,
    isCustomer: !!input.customer,
  };
}

/** Use after login/signup before navigate, so path does not rely on a React re-render */
export async function fetchPostLoginPathForUser(userId: string): Promise<string> {
  const [memRes, paRes, supRes, custRes] = await Promise.all([
    supabase.from("company_members").select("company_id").eq("user_id", userId),
    supabase.from("platform_admins").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("suppliers").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("customers").select("*").eq("user_id", userId).maybeSingle(),
  ]);
  const membershipsLength = (memRes.data ?? []).length;
  return getPostLoginPath(
    buildPostLoginSnapshot({
      platformAdmin: paRes.data,
      supplier: supRes.data,
      customer: custRes.data,
      membershipsLength,
    }),
  );
}
