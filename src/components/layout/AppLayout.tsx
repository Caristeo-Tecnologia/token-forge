import { NavLink, useLocation, Outlet } from "react-router-dom";
import {
  LayoutDashboard, FolderKanban, Package, FileText, Coins,
  Files, Megaphone, Users, ShieldCheck, LogOut, Building2, ChevronDown,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const nav = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/app/projects", label: "Projects", icon: FolderKanban },
  { to: "/app/products", label: "Products", icon: Package },
  { to: "/app/contracts", label: "Contracts", icon: FileText },
  { to: "/app/tokens", label: "Tokens", icon: Coins },
];

const adminNav = [
  { to: "/app/documents", label: "Documents", icon: Files },
  { to: "/app/updates", label: "Updates", icon: Megaphone },
  { to: "/app/users", label: "Users", icon: Users },
  { to: "/app/audit", label: "Audit Log", icon: ShieldCheck },
];

export default function AppLayout() {
  const { user, memberships, activeCompany, activeRole, setActiveCompanyId, signOut } = useAuth();
  const loc = useLocation();

  return (
    <div className="min-h-screen flex bg-background mesh-bg">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 border-r border-border/60 bg-sidebar/70 backdrop-blur-xl flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-border/60">
          <div className="size-8 bg-primary rounded-lg flex items-center justify-center mr-3">
            <div className="size-3.5 border-2 border-primary-foreground rounded-sm rotate-45" />
          </div>
          <span className="font-semibold tracking-tight text-lg">Aetheria</span>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">Platform</p>
          {nav.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-secondary"
                }`
              }
            >
              <item.icon className="size-4" /> {item.label}
            </NavLink>
          ))}

          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2 mt-6">Admin</p>
          {adminNav.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-secondary"
                }`
              }
            >
              <item.icon className="size-4" /> {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-border/60">
          <a
            href="/catalog"
            target="_blank"
            rel="noreferrer"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            View public catalog →
          </a>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-border/60 bg-background/80 backdrop-blur-md sticky top-0 z-10 flex items-center justify-between px-8">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 px-3 py-1.5 bg-secondary rounded-lg hover:bg-muted transition-colors">
                <Building2 className="size-4 text-primary" />
                <span className="text-sm font-medium">{activeCompany?.name ?? "Select company"}</span>
                <ChevronDown className="size-3.5 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              <DropdownMenuLabel>Switch company</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {memberships.map(m => (
                <DropdownMenuItem key={m.company_id} onClick={() => setActiveCompanyId(m.company_id)}>
                  <Building2 className="size-4 mr-2" />
                  <span className="flex-1">{m.companies.name}</span>
                  <span className="text-[10px] uppercase text-muted-foreground tracking-wider">{m.role}</span>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => (window.location.href = "/onboarding?new=1")}>
                + New company
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 hover:bg-secondary rounded-lg px-2 py-1 transition-colors">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium leading-none">{user?.email}</p>
                  <p className="text-[11px] text-muted-foreground mt-1 capitalize">{activeRole ?? "—"}</p>
                </div>
                <div className="size-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-semibold">
                  {(user?.email?.[0] ?? "?").toUpperCase()}
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{user?.email}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut}>
                <LogOut className="size-4 mr-2" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main key={loc.pathname} className="flex-1 animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
