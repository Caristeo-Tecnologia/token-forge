import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export function LandingDualCta() {
  return (
    <section className="mx-auto max-w-[1440px] px-6 pb-20 lg:px-10 lg:pb-28">
      <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
        <div className="rounded-[28px] border border-[var(--lp-border)] bg-[var(--lp-card)] p-10 shadow-sm lp-transition hover:shadow-[var(--lp-shadow-panel)]">
          <h3 className="text-2xl font-bold text-[var(--lp-primary)]">Precisa de capital?</h3>
          <p className="mt-3 text-[var(--lp-text-muted)]">Tokenize sua operação mineral com suporte estrutural e visibilidade institucional.</p>
          <Button className="mt-8 h-[52px] rounded-2xl bg-[var(--lp-primary)] px-8 font-semibold text-white lp-transition hover:bg-[var(--lp-green-2)]" asChild>
            <Link to="/auth?signup=1">Cadastrar operação</Link>
          </Button>
        </div>
        <div className="rounded-[28px] border border-[var(--lp-border)] bg-[var(--lp-card)] p-10 shadow-sm lp-transition hover:shadow-[var(--lp-shadow-panel)]">
          <h3 className="text-2xl font-bold text-[var(--lp-primary)]">Quer investir?</h3>
          <p className="mt-3 text-[var(--lp-text-muted)]">Explore ativos reais tokenizados com informações padronizadas e fluxo dedicado.</p>
          <Button className="mt-8 h-[52px] rounded-2xl bg-[var(--lp-primary)] px-8 font-semibold text-white lp-transition hover:bg-[var(--lp-green-2)]" asChild>
            <Link to="/marketplace">Explorar marketplace</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
