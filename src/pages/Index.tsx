import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";

export default function Index() {
  useEffect(() => { document.title = "Aetheria · Tokenized Asset Offerings"; }, []);
  return (
    <div className="min-h-screen mesh-bg">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto h-16 flex items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="size-8 bg-primary rounded-lg flex items-center justify-center">
              <div className="size-3.5 border-2 border-primary-foreground rounded-sm rotate-45" />
            </div>
            <span className="font-semibold tracking-tight text-lg">Aetheria</span>
          </div>
          <nav className="flex items-center gap-6">
            <Link to="/catalog" className="text-sm text-muted-foreground hover:text-foreground">Catalog</Link>
            <Link to="/auth"><Button size="sm">Sign in</Button></Link>
          </nav>
        </div>
      </header>

      <section className="max-w-5xl mx-auto px-6 py-24 text-center">
        <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-4">White-label · Solana-ready</p>
        <h1 className="text-5xl sm:text-6xl font-semibold tracking-tight">Tokenized asset offerings,<br />structured.</h1>
        <p className="text-lg text-muted-foreground mt-6 max-w-2xl mx-auto">
          A full-stack platform for companies to structure, manage, and publish tokenized investment products backed by real-world assets — gold, real estate, energy, and more.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link to="/auth"><Button size="lg">Launch your platform</Button></Link>
          <Link to="/catalog"><Button size="lg" variant="outline">Browse offerings</Button></Link>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-24 grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { t: "Multi-tenant by design", d: "Each company runs an isolated white-label instance with its own data, branding, and team." },
          { t: "Simulated smart contracts", d: "Mint, allocate, and transfer tokens on a ledger that's structured for future Solana integration." },
          { t: "Compliance-first UX", d: "Lifecycle workflows, audit logs, role-based permissions, and risk acknowledgment built in." },
        ].map(f => (
          <div key={f.t} className="glass-card p-6">
            <h3 className="font-semibold">{f.t}</h3>
            <p className="text-sm text-muted-foreground mt-2">{f.d}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
