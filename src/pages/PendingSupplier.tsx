import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

export default function PendingSupplier() {
  const { supplierProfile, sessionReady, postLoginPath, signOut } = useAuth();

  if (!sessionReady) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  }

  if (!supplierProfile) {
    return <Navigate to={postLoginPath ?? "/auth"} replace />;
  }

  if (supplierProfile.status === "approved") {
    return <Navigate to="/app" replace />;
  }

  const msg =
    supplierProfile.status === "pending"
      ? "Your supplier registration is pending approval by a platform administrator."
      : supplierProfile.status === "rejected"
        ? "Your supplier registration was rejected. Contact support if you believe this is an error."
        : "Your supplier account is suspended.";

  return (
    <div className="min-h-screen mesh-bg flex items-center justify-center p-6">
      <div className="glass-card max-w-md p-8 space-y-4 text-center">
        <h1 className="text-xl font-semibold tracking-tight">Supplier status</h1>
        <p className="text-sm text-muted-foreground">{msg}</p>
        <p className="text-xs text-muted-foreground">{supplierProfile.company_name}</p>
        <Button variant="outline" className="w-full" onClick={() => signOut()}>
          Sign out
        </Button>
      </div>
    </div>
  );
}
