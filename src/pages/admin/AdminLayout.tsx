import { NavLink, Outlet } from "react-router-dom";
import { Shield, Users, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function AdminLayout() {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen flex bg-background mesh-bg">
      <aside className="w-56 shrink-0 border-r border-border/60 bg-sidebar/70 backdrop-blur-xl flex flex-col p-4">
        <div className="flex items-center gap-2 mb-8 px-2">
          <Shield className="size-6 text-primary" />
          <span className="font-semibold">Platform admin</span>
        </div>
        <nav className="space-y-1 flex-1">
          <NavLink
            to="/admin"
            end
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground hover:bg-secondary",
              )
            }
          >
            <Users className="size-4" /> Suppliers
          </NavLink>
        </nav>
        <div className="text-xs text-muted-foreground truncate px-2 mb-2">{user?.email}</div>
        <Button variant="outline" size="sm" className="w-full gap-2" onClick={() => signOut()}>
          <LogOut className="size-4" /> Sign out
        </Button>
      </aside>
      <main className="flex-1 overflow-auto p-8">
        <Outlet />
      </main>
    </div>
  );
}
