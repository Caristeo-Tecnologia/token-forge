import { Link } from "react-router-dom";

const cols = [
  {
    title: "Marketplace",
    links: [
      { label: "Explorar ativos", to: "/marketplace" },
      { label: "Catálogo público", to: "/catalog" },
    ],
  },
  {
    title: "Compliance",
    links: [
      { label: "Transparência", href: "#beneficios" },
      { label: "Como funciona", href: "#como-funciona" },
    ],
  },
  {
    title: "Empresas",
    links: [
      { label: "Parceiros", href: "#parceiros" },
      { label: "Cadastro fornecedor", to: "/auth?signup=1" },
    ],
  },
  {
    title: "Documentação",
    links: [
      { label: "Login", to: "/auth" },
      { label: "Área da app", to: "/app" },
    ],
  },
];

export function LandingFooter() {
  return (
    <footer className="bg-[var(--lp-primary)] text-white">
      <div className="mx-auto max-w-[1440px] px-6 py-16 lg:px-10 lg:py-20">
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-4">
          {cols.map(col => (
            <div key={col.title}>
              <p className="text-sm font-bold uppercase tracking-wider text-[var(--lp-gold-2)]">{col.title}</p>
              <ul className="mt-5 space-y-3">
                {col.links.map(item =>
                  "to" in item ? (
                    <li key={item.label}>
                      <Link to={item.to} className="text-sm text-white/85 lp-transition hover:text-white">
                        {item.label}
                      </Link>
                    </li>
                  ) : (
                    <li key={item.label}>
                      <a href={item.href} className="text-sm text-white/85 lp-transition hover:text-white">
                        {item.label}
                      </a>
                    </li>
                  ),
                )}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-14 border-t border-white/15 pt-8 text-center text-sm text-white/65">
          © {new Date().getFullYear()} Farmchain
        </div>
      </div>
    </footer>
  );
}
