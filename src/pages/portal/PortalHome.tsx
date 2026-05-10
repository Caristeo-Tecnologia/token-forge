import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import type { Database } from "@/integrations/supabase/types";

type CustomerRow = Database["public"]["Tables"]["customers"]["Row"];

export default function PortalHome() {
  const { user, supplierProfile, customerProfile, signOut } = useAuth();

  // Suppliers belong in /app — redirect-style hint (we don't auto-navigate to
  // avoid a flash; the AppLayout itself is reachable via the link).
  if (supplierProfile) {
    return (
      <SupplierRedirect
        userEmail={user?.email ?? null}
        signOut={signOut}
        supplierName={supplierProfile.fantasy_name || supplierProfile.company_name}
      />
    );
  }

  if (customerProfile) {
    return (
      <BuyerHome
        customer={customerProfile}
        userEmail={user?.email ?? null}
        signOut={signOut}
      />
    );
  }

  return <FallbackHome userEmail={user?.email ?? null} signOut={signOut} />;
}

function PortalHeader({
  subtitle,
  email,
  signOut,
}: {
  subtitle: string;
  email: string | null;
  signOut: () => Promise<void>;
}) {
  return (
    <header className="border-b border-border/60 bg-background/80 backdrop-blur-md sticky top-0 z-10 px-6 py-4 flex items-center justify-between">
      <div>
        <span className="font-semibold tracking-tight">Farmchain</span>
        <span className="text-muted-foreground text-sm ml-2">· {subtitle}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground hidden sm:inline">{email}</span>
        <Button variant="outline" size="sm" onClick={() => signOut()}>
          Sign out
        </Button>
      </div>
    </header>
  );
}

function SupplierRedirect({
  userEmail,
  signOut,
  supplierName,
}: {
  userEmail: string | null;
  signOut: () => Promise<void>;
  supplierName: string;
}) {
  useEffect(() => {
    document.title = "Supplier portal · Farmchain";
  }, []);

  return (
    <div className="min-h-screen mesh-bg">
      <PortalHeader subtitle="Supplier portal" email={userEmail} signOut={signOut} />
      <main className="max-w-lg mx-auto p-8 space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Hello, {supplierName}</h1>
        <p className="text-sm text-muted-foreground">
          Your supplier workspace lives in the dashboard. Open it to manage pools,
          documents and settings.
        </p>
        <div className="glass-card p-6 space-y-3">
          <Button asChild className="w-full">
            <Link to="/app">Open supplier dashboard</Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link to="/marketplace">Browse public marketplace</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}

function BuyerHome({
  customer,
  userEmail,
  signOut,
}: {
  customer: CustomerRow;
  userEmail: string | null;
  signOut: () => Promise<void>;
}) {
  useEffect(() => {
    document.title = "Buyer portal · Farmchain";
  }, []);

  return (
    <div className="min-h-screen mesh-bg">
      <PortalHeader subtitle="Buyer portal" email={userEmail} signOut={signOut} />
      <main className="max-w-lg mx-auto p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Welcome</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {customer.name ? `Hi, ${customer.name}` : "Your buyer account is active."}
          </p>
        </div>
        <div className="glass-card p-6 space-y-3">
          <p className="text-sm text-muted-foreground">
            Explore tokenized offerings and manage your activity.
          </p>
          <Button asChild className="w-full">
            <Link to="/marketplace">Browse marketplace</Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link to="/catalog">Legacy catalog</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}

function FallbackHome({
  userEmail,
  signOut,
}: {
  userEmail: string | null;
  signOut: () => Promise<void>;
}) {
  return (
    <div className="min-h-screen mesh-bg">
      <PortalHeader subtitle="Portal" email={userEmail} signOut={signOut} />
      <main className="max-w-lg mx-auto p-8 space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Something is missing</h1>
        <p className="text-sm text-muted-foreground">
          Your account is signed in but we couldn't find a supplier or buyer profile linked to it.
          Try logging out and signing in again, or contact the platform administrator.
        </p>
        <Button asChild variant="outline">
          <Link to="/auth">Back to sign-in</Link>
        </Button>
      </main>
    </div>
  );
}
