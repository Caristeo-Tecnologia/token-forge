import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type Company = { id: string; name: string; slug: string; brand_color: string | null };
type Membership = { company_id: string; role: "owner" | "admin" | "manager" | "viewer"; companies: Company };

interface AuthCtx {
  user: User | null;
  session: Session | null;
  loading: boolean;
  memberships: Membership[];
  activeCompany: Company | null;
  activeRole: Membership["role"] | null;
  setActiveCompanyId: (id: string) => void;
  refreshMemberships: () => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [activeCompanyId, setActiveCompanyIdState] = useState<string | null>(
    () => localStorage.getItem("activeCompanyId")
  );

  const fetchMemberships = async (uid: string) => {
    const { data } = await supabase
      .from("company_members")
      .select("company_id, role, companies(id, name, slug, brand_color)")
      .eq("user_id", uid);
    const list = (data ?? []) as unknown as Membership[];
    setMemberships(list);
    if (list.length && !activeCompanyId) {
      setActiveCompanyIdState(list[0].company_id);
      localStorage.setItem("activeCompanyId", list[0].company_id);
    }
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        setTimeout(() => fetchMemberships(s.user.id), 0);
      } else {
        setMemberships([]);
      }
    });
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) fetchMemberships(s.user.id);
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

  return (
    <Ctx.Provider value={{
      user, session, loading, memberships, activeCompany, activeRole,
      setActiveCompanyId,
      refreshMemberships: () => user ? fetchMemberships(user.id) : Promise.resolve(),
      signOut: async () => { await supabase.auth.signOut(); },
    }}>
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
export const canDelete = (role: AuthCtx["activeRole"]) =>
  role === "owner" || role === "admin";
export const canAdmin = (role: AuthCtx["activeRole"]) =>
  role === "owner" || role === "admin";
