import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FarmchainLogoImg, FARMCHAIN_BRAND } from "@/components/FarmchainLogo";

const linkClass =
  "text-[15px] font-medium text-[var(--lp-text-muted)] hover:text-[var(--lp-primary)] lp-transition whitespace-nowrap";

export function LandingNav() {
  return (
    <header className="sticky top-0 z-50 h-[90px] border-b border-[var(--lp-border)] bg-white/[0.82] backdrop-blur-[24px]">
      <div className="mx-auto flex h-full max-w-[1440px] items-center justify-between gap-4 px-6 lg:px-10">
        <Link to="/" className="flex shrink-0 items-center gap-3 lp-transition hover:opacity-90">
          <FarmchainLogoImg className="h-10 max-h-11" alt={FARMCHAIN_BRAND} />
          <span className="hidden font-semibold tracking-tight text-[var(--lp-primary)] sm:inline text-lg">
            {FARMCHAIN_BRAND}
          </span>
        </Link>

        <nav className="hidden lg:flex flex-1 items-center justify-center gap-8 xl:gap-10">
          <a href="#hero" className={linkClass}>
            Home
          </a>
          <Link to="/marketplace" className={linkClass}>
            Marketplace
          </Link>
          <a href="#parceiros" className={linkClass}>
            Empresas
          </a>
          <a href="#como-funciona" className={linkClass}>
            Tokenização
          </a>
          <a href="#beneficios" className={linkClass}>
            Compliance
          </a>
        </nav>

        <div className="flex shrink-0 items-center gap-3">
          <Button variant="ghost" className={cn("hidden sm:inline-flex font-semibold text-[var(--lp-primary)]", "lp-transition")} asChild>
            <Link to="/auth">Login</Link>
          </Button>
          <Button
            className="h-[52px] rounded-2xl bg-[var(--lp-primary)] px-5 font-semibold text-white shadow-sm lp-transition hover:bg-[var(--lp-green-2)] hover:shadow-md"
            asChild
          >
            <Link to="/marketplace">Explorar ativos</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
