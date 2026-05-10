import { useAuth } from "@/contexts/AuthContext";
import { Navigate, useLocation } from "react-router-dom";
import { ReactNode } from "react";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  if (!user) return <Navigate to="/auth" state={{ from: loc }} replace />;
  return <>{children}</>;
}

export function RequireCompany({ children }: { children: ReactNode }) {
  const { user, loading, memberships, membershipsLoaded } = useAuth();
  if (loading || (user && !membershipsLoaded)) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  if (!user) return <Navigate to="/auth" replace />;
  if (memberships.length === 0) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
}

/** Issuer workspace: blocks pending/rejected/suspended suppliers from using /app until approved */
export function RequireAppAccess({ children }: { children: ReactNode }) {
  const { user, loading, membershipsLoaded, memberships, supplierProfile, customerProfile } = useAuth();
  if (loading || (user && !membershipsLoaded)) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  }
  if (!user) return <Navigate to="/auth" replace />;
  const st = supplierProfile?.status;
  if (st === "pending" || st === "rejected" || st === "suspended") {
    return <Navigate to="/pending-supplier" replace />;
  }
  if (memberships.length === 0) {
    if (customerProfile) return <Navigate to="/portal" replace />;
    return <Navigate to="/onboarding" replace />;
  }
  return <>{children}</>;
}

export function RequirePlatformAdmin({ children }: { children: ReactNode }) {
  const { user, loading, membershipsLoaded, isPlatformAdmin } = useAuth();
  if (loading || (user && !membershipsLoaded)) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  }
  if (!user) return <Navigate to="/auth" replace />;
  if (!isPlatformAdmin) return <Navigate to="/app" replace />;
  return <>{children}</>;
}
