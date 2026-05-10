const items = [
  { code: "GLD-MG14", change: "12%" },
  { code: "LTH-09", change: "7%" },
  { code: "COP-22", change: "18%" },
  { code: "NBL-44", change: "3%" },
  { code: "AU-BR21", change: "9%" },
];

export function LandingTicker() {
  return (
    <section
      className="border-y border-[var(--lp-border-ticker)] bg-[var(--lp-card)] py-4"
      aria-label="Cotações"
    >
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-center gap-x-10 gap-y-3 px-6 lg:justify-between lg:px-10">
        {[...items, ...items].map((it, i) => (
          <span key={`${it.code}-${i}`} className="flex items-center gap-2 text-sm font-semibold text-[var(--lp-primary)] lp-transition hover:text-[var(--lp-green-2)]">
            <span>{it.code}</span>
            <span className="text-[var(--lp-success)]">↑ {it.change}</span>
          </span>
        ))}
      </div>
    </section>
  );
}
