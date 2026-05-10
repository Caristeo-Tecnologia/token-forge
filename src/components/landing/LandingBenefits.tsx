import { Droplets, Eye, Globe, Lock } from "lucide-react";

const benefits = [
  {
    title: "Liquidez",
    desc: "Acesso a mercados secundários com estrutura pensada para transparência e registro.",
    Icon: Droplets,
  },
  {
    title: "Transparência",
    desc: "Documentação, marcos de projeto e rastreabilidade integrados ao ciclo da operação.",
    Icon: Eye,
  },
  {
    title: "Mercado global",
    desc: "Conecte investidores institucionais e qualificados a operações reais em múltiplas jurisdições.",
    Icon: Globe,
  },
  {
    title: "Segurança",
    desc: "Camadas de permissão, auditoria e conformidade alinhadas ao modelo institucional.",
    Icon: Lock,
  },
];

export function LandingBenefits() {
  return (
    <section id="beneficios" className="mx-auto max-w-[1440px] px-6 py-20 lg:px-10 lg:py-28">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 lg:gap-8">
        {benefits.map(({ title, desc, Icon }) => (
          <div
            key={title}
            className="rounded-[28px] border border-[var(--lp-border)] bg-[var(--lp-card)] p-8 shadow-sm lp-transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex size-12 items-center justify-center rounded-2xl bg-[var(--lp-badge-bg)]">
              <Icon className="size-6 text-[var(--lp-primary)]" strokeWidth={2} />
            </div>
            <h3 className="mt-5 text-xl font-bold text-[var(--lp-primary)]">{title}</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-[var(--lp-text-muted)]">{desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
