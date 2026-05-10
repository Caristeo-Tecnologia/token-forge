import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { buildPostLoginSnapshot, getPostLoginPath } from "@/lib/auth-routes";

type Company = { id: string; name: string; slug: string; brand_color: string | null };
type Membership = { company_id: string; role: "owner" | "admin" | "manager" | "viewer"; companies: Company };

type PlatformAdminRow = Database["public"]["Tables"]["platform_admins"]["Row"];
type SupplierRow = Database["public"]["Tables"]["suppliers"]["Row"];
type CustomerRow = Database["public"]["Tables"]["customers"]["Row"];

interface AuthCtx {
  user: User | null;
  session: Session | null;
  loading: boolean;
  membershipsLoaded: boolean;
  memberships: Membership[];
  activeCompany: Company | null;
  activeRole: Membership["role"] | null;
  setActiveCompanyId: (id: string) => void;
  refreshMemberships: () => Promise<void>;
  signOut: () => Promise<void>;

  platformAdmin: PlatformAdminRow | null;
  supplierProfile: SupplierRow | null;
  customerProfile: CustomerRow | null;

  /** True when memberships + platform/supplier/customer profiles have been fetched */
  sessionReady: boolean;
  /** OAuth / edge: logged in but no platform role, supplier, customer, or company */
  needsRegistrationCompletion: boolean;
  supplierApproved: boolean;
  isPlatformAdmin: boolean;
  /** Resolved destination when sessionReady; null while loading */
  postLoginPath: string | null;
}

const Ctx = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [membershipsLoaded, setMembershipsLoaded] = useState(false);
  const [platformAdmin, setPlatformAdmin] = useState<PlatformAdminRow | null>(null);
  const [supplierProfile, setSupplierProfile] = useState<SupplierRow | null>(null);
  const [customerProfile, setCustomerProfile] = useState<CustomerRow | null>(null);
  const [profilesLoaded, setProfilesLoaded] = useState(false);

  const [activeCompanyId, setActiveCompanyIdState] = useState<string | null>(() =>
    localStorage.getItem("activeCompanyId"),
  );

  const fetchSessionData = async (uid: string) => {
    setMembershipsLoaded(false);
    setProfilesLoaded(false);
    try {
      const [memRes, paRes, supRes, custRes] = await Promise.all([
        supabase
          .from("company_members")
          .select("company_id, role, companies(id, name, slug, brand_color)")
          .eq("user_id", uid),
        supabase.from("platform_admins").select("*").eq("user_id", uid).maybeSingle(),
        supabase.from("suppliers").select("*").eq("user_id", uid).maybeSingle(),
        supabase.from("customers").select("*").eq("user_id", uid).maybeSingle(),
      ]);

      const list = (memRes.data ?? []) as unknown as Membership[];
      setMemberships(list);
      if (list.length) {
        const stored = localStorage.getItem("activeCompanyId");
        const valid = stored && list.some(m => m.company_id === stored);
        if (!valid) {
          setActiveCompanyIdState(list[0].company_id);
          localStorage.setItem("activeCompanyId", list[0].company_id);
        }
      }

      setPlatformAdmin(paRes.data ?? null);
      setSupplierProfile(supRes.data ?? null);
      setCustomerProfile(custRes.data ?? null);
    } finally {
      setMembershipsLoaded(true);
      setProfilesLoaded(true);
    }
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        setTimeout(() => fetchSessionData(s.user.id), 0);
      } else {
        setMemberships([]);
        setPlatformAdmin(null);
        setSupplierProfile(null);
        setCustomerProfile(null);
        setMembershipsLoaded(true);
        setProfilesLoaded(true);
      }
    });
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        fetchSessionData(s.user.id);
      } else {
        setMembershipsLoaded(true);
        setProfilesLoaded(true);
      }
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setActiveCompanyId = (id: string) => {
    setActiveCompanyIdState(id);
    localStorage.setItem("activeCompanyId", id);
  };

  const activeMembership = memberships.find(m => m.company_id === activeCompanyId) ?? memberships[0] ?? null;
  const activeCompany = activeMembership?.companies ?? null;
  const activeRole = activeMembership?.role ?? null;

  const sessionReady = membershipsLoaded && profilesLoaded;
  const isPlatformAdmin = !!platformAdmin?.active;
  const supplierApproved = supplierProfile?.status === "approved";

  const needsRegistrationCompletion = !!(
    user &&
    sessionReady &&
    !isPlatformAdmin &&
    !supplierProfile &&
    !customerProfile &&
    memberships.length === 0
  );

  const postLoginPath = useMemo(() => {
    if (!user || !sessionReady) return null;
    const snap = buildPostLoginSnapshot({
      platformAdmin,
      supplier: supplierProfile,
      customer: customerProfile,
      membershipsLength: memberships.length,
    });
    return getPostLoginPath(snap);
  }, [user, sessionReady, platformAdmin, supplierProfile, customerProfile, memberships.length]);

  return (
    <Ctx.Provider
      value={{
        user,
        session,
        loading,
        membershipsLoaded: sessionReady,
        memberships,
        activeCompany,
        activeRole,
        setActiveCompanyId,
        refreshMemberships: async () => {
          if (user) await fetchSessionData(user.id);
        },
        signOut: async () => {
          await supabase.auth.signOut();
        },
        platformAdmin,
        supplierProfile,
        customerProfile,
        sessionReady,
        needsRegistrationCompletion,
        supplierApproved,
        isPlatformAdmin,
        postLoginPath,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

export const canWrite = (role: AuthCtx["activeRole"]) =>
  role === "owner" || role === "admin" || role === "manager";
export const canDelete = (role: AuthCtx["activeRole"]) => role === "owner" || role === "admin";
export const canAdmin = (role: AuthCtx["activeRole"]) => role === "owner" || role === "admin";
