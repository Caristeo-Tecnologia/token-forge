import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MapPin } from "lucide-react";

const assets = [
  {
    title: "Ouro — Faixa MG",
    location: "Minas Gerais, Brasil",
    supply: "420 oz equivalentes",
    roi: "18.4%",
    progress: 78,
    img: "https://images.unsplash.com/photo-1610375461246-83e67ef2ef38?w=800&q=80&auto=format&fit=crop",
  },
  {
    title: "Lítio — Salares",
    location: "Atacama, Chile",
    supply: "1.2kt LCE",
    roi: "21.2%",
    progress: 62,
    img: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&q=80&auto=format&fit=crop",
  },
  {
    title: "Cobre — Tier-1",
    location: "Peru",
    supply: "890 t refinável",
    roi: "15.6%",
    progress: 71,
    img: "https://images.unsplash.com/photo-1565193566174-634f84874dc8?w=800&q=80&auto=format&fit=crop",
  },
];

export function LandingFeatured() {
  return (
    <section id="destaque" className="bg-[var(--lp-section-bg)] py-20 lg:py-28">
      <div className="mx-auto max-w-[1440px] px-6 lg:px-10">
        <h2 className="text-center text-3xl font-bold tracking-tight text-[var(--lp-primary)] md:text-4xl">
          Ativos em destaque
        </h2>
        <div className="mt-14 grid gap-8 lg:grid-cols-3">
          {assets.map(a => (
            <article
              key={a.title}
              className="overflow-hidden rounded-[32px] border border-[var(--lp-border)] bg-[var(--lp-card)] shadow-sm lp-transition hover:-translate-y-1 hover:shadow-[var(--lp-shadow-panel)]"
            >
              <div className="h-[220px] overflow-hidden">
                <img src={a.img} alt="" className="h-full w-full object-cover lp-transition hover:scale-[1.02]" />
              </div>
              <div className="space-y-4 p-6">
                <div>
                  <h3 className="text-xl font-bold text-[var(--lp-primary)]">{a.title}</h3>
                  <p className="mt-1 flex items-center gap-1 text-sm text-[var(--lp-text-muted)]">
                    <MapPin className="size-3.5" />
                    {a.location}
                  </p>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--lp-text-muted)]">Supply disponível</span>
                  <span className="font-semibold text-[var(--lp-primary)]">{a.supply}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--lp-text-muted)]">ROI esperado</span>
                  <span className="font-semibold text-[var(--lp-success)]">{a.roi}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[var(--lp-border)]">
                  <div className="lp-progress-gold h-full rounded-full" style={{ width: `${a.progress}%` }} />
                </div>
                <Button className="w-full rounded-xl bg-[var(--lp-primary)] font-semibold text-white lp-transition hover:bg-[var(--lp-green-2)]" asChild>
                  <Link to="/marketplace">Investir agora</Link>
                </Button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
