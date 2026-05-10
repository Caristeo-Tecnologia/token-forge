const partners = ["Vale Verde Mineração", "Atlas Commodities", "Horizon Lithium", "Sul Minerals", "Pacific Ore Co.", "Continental Trade"];

export function LandingPartners() {
  return (
    <section id="parceiros" className="mx-auto max-w-[1440px] px-6 py-20 lg:px-10 lg:py-28">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-bold tracking-tight text-[var(--lp-primary)] md:text-4xl">Empresas parceiras</h2>
        <p className="mt-3 text-lg text-[var(--lp-text-muted)]">Fornecedores e operações verificadas.</p>
      </div>
      <div className="mt-14 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6 lg:gap-6">
        {partners.map(name => (
          <div
            key={name}
            className="flex min-h-[100px] items-center justify-center rounded-[24px] border border-[var(--lp-border)] bg-[var(--lp-card)] px-4 py-6 text-center text-sm font-semibold text-[var(--lp-text-muted)] shadow-sm lp-transition hover:-translate-y-1 hover:border-[var(--lp-gold-2)] hover:shadow-[var(--lp-shadow-panel)]"
          >
            {name}
          </div>
        ))}
      </div>
    </section>
  );
}
