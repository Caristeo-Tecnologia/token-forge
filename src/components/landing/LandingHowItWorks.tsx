import { Building2, ShieldCheck, Coins, Store, Share2 } from "lucide-react";

const steps = [
  { title: "Fornecedor", Icon: Building2 },
  { title: "Auditoria", Icon: ShieldCheck },
  { title: "Tokenização", Icon: Coins },
  { title: "Marketplace", Icon: Store },
  { title: "Distribuição", Icon: Share2 },
];

export function LandingHowItWorks() {
  return (
    <section id="como-funciona" className="mx-auto max-w-[1440px] px-6 py-20 lg:px-10 lg:py-28">
      <h2 className="text-center text-3xl font-bold tracking-tight text-[var(--lp-primary)] md:text-4xl">Como funciona</h2>

      <div className="relative mt-16">
        <div className="scrollbar-hide flex gap-4 overflow-x-auto pb-4 pt-2 md:justify-between md:overflow-visible md:pb-0">
          {steps.map(({ title, Icon }, i) => (
            <div key={title} className="relative flex min-w-[140px] flex-1 flex-col items-center md:min-w-0">
              {i < steps.length - 1 ? (
                <div
                  className="pointer-events-none absolute left-[calc(50%+28px)] top-7 hidden h-px w-[calc(100%-56px)] md:block"
                  style={{
                    background: "linear-gradient(90deg, var(--lp-gold-1), var(--lp-gold-2))",
                    opacity: 0.55,
                  }}
                />
              ) : null}
              <div
                className="relative z-[1] flex size-14 items-center justify-center rounded-full border-2 border-[var(--lp-gold-2)] bg-[var(--lp-card)] shadow-sm lp-transition hover:border-[var(--lp-primary)]"
              >
                <Icon className="size-6 text-[var(--lp-primary)]" strokeWidth={2} />
              </div>
              <p className="mt-4 text-center text-sm font-semibold text-[var(--lp-primary)]">{title}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
