const regions = [
  { name: "Brasil", ops: "42 operações ativas" },
  { name: "Chile", ops: "18 operações ativas" },
  { name: "Peru", ops: "15 operações ativas" },
  { name: "África do Sul", ops: "11 operações ativas" },
];

export function LandingMap() {
  return (
    <section id="mapa" className="mx-auto max-w-[1440px] px-6 pb-20 lg:px-10 lg:pb-28">
      <div
        className="relative overflow-hidden rounded-[32px] border border-[var(--lp-border)] bg-[var(--lp-primary)] p-8 text-white shadow-[var(--lp-shadow-panel)] lg:grid lg:grid-cols-[1fr_340px] lg:gap-12 lg:p-12"
      >
        <div className="relative min-h-[280px] lg:min-h-[320px]">
          <div className="absolute inset-0 opacity-30">
            <div className="absolute left-[18%] top-[42%] h-4 w-4 rounded-full bg-[var(--lp-gold-2)] shadow-[0_0_24px_var(--lp-gold-2)] lp-transition" />
            <div className="absolute left-[28%] top-[68%] h-3 w-3 rounded-full bg-[var(--lp-gold-1)] shadow-[0_0_18px_var(--lp-gold-1)]" />
            <div className="absolute left-[42%] top-[52%] h-3.5 w-3.5 rounded-full bg-[var(--lp-gold-2)] shadow-[0_0_20px_var(--lp-gold-2)]" />
            <div className="absolute right-[22%] top-[38%] h-3 w-3 rounded-full bg-[var(--lp-gold-1)] shadow-[0_0_16px_var(--lp-gold-1)]" />
            <div className="absolute right-[35%] bottom-[28%] h-4 w-4 rounded-full bg-[var(--lp-gold-2)] shadow-[0_0_22px_var(--lp-gold-2)]" />
          </div>
          <div className="relative flex h-full flex-col justify-end pt-24 lg:pt-0 lg:justify-center">
            <p className="text-xs font-bold uppercase tracking-widest text-[var(--lp-gold-2)]">Presença global</p>
            <h3 className="mt-2 max-w-md text-2xl font-bold leading-tight lg:text-3xl">
              Operações mapeadas e acompanhadas pela plataforma
            </h3>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-white/10 bg-[var(--lp-green-2)]/40 p-6 backdrop-blur-sm lg:mt-0">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--lp-gold-2)]">Operações ativas</p>
          <ul className="mt-6 space-y-4">
            {regions.map(r => (
              <li key={r.name} className="flex items-center justify-between gap-4 border-b border-white/10 pb-4 last:border-0 last:pb-0">
                <span className="font-semibold">{r.name}</span>
                <span className="text-sm text-white/75">{r.ops}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
