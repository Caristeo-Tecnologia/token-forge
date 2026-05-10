import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MapPin } from "lucide-react";

const carouselItems = [
  {
    title: "Operação Ouro MG-14",
    location: "Minas Gerais • Brasil",
    roi: "18.4%",
    cap: "78%",
  },
  {
    title: "Projeto Lítio NE-08",
    location: "Rio Grande do Norte • Brasil",
    roi: "22.1%",
    cap: "65%",
  },
  {
    title: "Cobre AT-21",
    location: "Chile",
    roi: "15.9%",
    cap: "82%",
  },
];

export function LandingHero() {
  const [slide, setSlide] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setSlide(s => (s + 1) % carouselItems.length), 5200);
    return () => clearInterval(t);
  }, []);

  const item = carouselItems[slide];

  return (
    <section id="hero" className="relative lp-hero-gradient overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%23053331' stroke-width='0.5'%3E%3Cpath d='M0 30h60M30 0v60'/%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />
      <div className="pointer-events-none absolute -right-32 top-20 h-72 w-72 rounded-full bg-[var(--lp-gold-2)]/20 blur-3xl" />
      <div className="pointer-events-none absolute -left-24 bottom-40 h-64 w-64 rounded-full bg-[var(--lp-primary)]/10 blur-3xl" />

      <div className="relative mx-auto grid max-w-[1440px] min-h-[min(920px,100vh)] gap-12 px-6 py-16 lg:grid-cols-[1fr_520px] lg:items-center lg:gap-16 lg:px-10 lg:py-20">
        <div className="max-w-xl xl:max-w-2xl">
          <div
            className="mb-6 inline-flex items-center rounded-full border px-4 py-2 text-sm font-semibold text-[var(--lp-primary)] lp-transition"
            style={{
              backgroundColor: "var(--lp-badge-bg)",
              borderColor: "var(--lp-badge-border)",
            }}
          >
            Ativos reais tokenizados
          </div>

          <h1 className="text-[clamp(2.5rem,5vw,4.5rem)] font-bold leading-[1.08] tracking-tight text-[var(--lp-primary)]">
            Tokenização moderna
            <br />
            para ativos minerais
            <br />e commodities reais
          </h1>

          <p
            className="mt-6 max-w-[620px] text-[22px] font-normal leading-[170%] text-[var(--lp-text-muted)]"
            style={{ maxWidth: 620 }}
          >
            Invista em operações auditadas de mineração, extração e commodities tokenizadas com liquidez,
            rastreabilidade e transparência.
          </p>

          <div className="mt-10 flex flex-wrap gap-4">
            <Button
              className="h-[52px] rounded-2xl bg-[var(--lp-primary)] px-8 text-base font-semibold text-white lp-transition hover:bg-[var(--lp-green-2)]"
              asChild
            >
              <Link to="/marketplace">Explorar marketplace</Link>
            </Button>
            <Button
              variant="outline"
              className="h-[52px] rounded-2xl border-[var(--lp-primary)] bg-transparent px-8 text-base font-semibold text-[var(--lp-primary)] lp-transition hover:bg-[var(--lp-primary)]/5"
              asChild
            >
              <Link to="/auth?signup=1">Tornar-se fornecedor</Link>
            </Button>
          </div>

          <div className="mt-14 grid grid-cols-2 gap-8 sm:grid-cols-4">
            {[
              { v: "R$ 18.4M", l: "Tokenizados" },
              { v: "124+", l: "Operações" },
              { v: "3.2K", l: "Investidores" },
              { v: "94%", l: "Concluídas" },
            ].map(m => (
              <div key={m.l}>
                <p className="text-2xl font-bold tabular-nums text-[var(--lp-primary)]">{m.v}</p>
                <p className="mt-1 text-sm font-medium text-[var(--lp-text-muted)]">{m.l}</p>
              </div>
            ))}
          </div>
        </div>

        <div id="marketplace-preview" className="relative lg:justify-self-end w-full max-w-[520px] mx-auto lg:mx-0">
          <div
            className="rounded-[28px] border border-[var(--lp-border)] p-6 backdrop-blur-[24px] lp-transition"
            style={{
              background: "rgba(255,255,255,0.74)",
              boxShadow: "var(--lp-shadow-panel)",
              minHeight: 560,
            }}
          >
            <div className="mb-6 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-pulse rounded-full bg-[var(--lp-success)] opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[var(--lp-success)]" />
                </span>
                <span className="text-xs font-bold uppercase tracking-widest text-[var(--lp-primary)]">
                  Live marketplace
                </span>
              </div>
            </div>

            <div key={slide} className="animate-fade-in space-y-4">
              <div
                className={cn(
                  "rounded-[24px] border border-[var(--lp-border)] p-5 lp-card-gradient lp-transition",
                  "hover:-translate-y-0.5",
                )}
                style={{ minHeight: 170 }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold text-[var(--lp-primary)]">{item.title}</p>
                    <p className="mt-1 flex items-center gap-1 text-sm text-[var(--lp-text-muted)]">
                      <MapPin className="size-3.5 shrink-0" />
                      {item.location}
                    </p>
                  </div>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-[var(--lp-text-muted)]">ROI estimado</p>
                    <p className="text-lg font-bold text-[var(--lp-primary)]">{item.roi}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-[var(--lp-text-muted)]">Captação</p>
                    <p className="text-lg font-bold text-[var(--lp-primary)]">{item.cap}</p>
                  </div>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--lp-border)]">
                  <div className="lp-progress-gold h-full rounded-full transition-all duration-500" style={{ width: item.cap }} />
                </div>
                <Button
                  className="mt-5 w-full rounded-xl bg-[var(--lp-primary)] font-semibold text-white lp-transition hover:bg-[var(--lp-green-2)]"
                  asChild
                >
                  <Link to="/marketplace">Ver oportunidade</Link>
                </Button>
              </div>

              <div className="flex justify-center gap-1.5 pt-2">
                {carouselItems.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    aria-label={`Slide ${i + 1}`}
                    className={cn(
                      "h-1.5 rounded-full lp-transition",
                      i === slide ? "w-6 bg-[var(--lp-primary)]" : "w-1.5 bg-[var(--lp-border)] hover:bg-[var(--lp-gold-1)]",
                    )}
                    onClick={() => setSlide(i)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
