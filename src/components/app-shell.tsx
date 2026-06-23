import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { Menu, Moon, Sun, RefreshCw, Bell, LogIn, ShieldCheck } from "lucide-react";
import logo from "@/assets/logo-rt.png";
import { useTheme } from "@/lib/theme-context";
import { useAuth } from "@/lib/auth-context";
import { navItems } from "./nav-config";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: ReactNode }) {
  const [openMobile, setOpenMobile] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { theme, toggle } = useTheme();
  const { user } = useAuth();

  useEffect(() => setOpenMobile(false), [pathname]);

  return (
    <div className="app-bg min-h-screen flex w-full text-foreground">
      {/* Sidebar - desktop */}
      <aside className="hidden lg:flex flex-col w-64 shrink-0 border-r border-sidebar-border bg-sidebar/80 backdrop-blur-xl sticky top-0 h-screen">
        <SidebarInner pathname={pathname} />
      </aside>

      {/* Mobile drawer */}
      {openMobile && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpenMobile(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-sidebar border-r border-sidebar-border flex flex-col">
            <SidebarInner pathname={pathname} />
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-40 glass border-b border-border/60">
          <div className="flex items-center gap-2 px-3 sm:px-5 h-16">
            <button
              className="lg:hidden h-10 w-10 grid place-items-center rounded-xl hover:bg-accent"
              onClick={() => setOpenMobile(true)}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            <Link to="/" className="flex items-center gap-2.5 min-w-0">
              <img src={logo} alt="Logo RT 06" className="h-9 w-9 rounded-full shrink-0 shadow-soft" />
              <div className="min-w-0 hidden sm:block">
                <div className="text-sm font-bold leading-tight truncate">Sistem Informasi RT 06</div>
                <div className="text-[10px] text-muted-foreground leading-tight">Digitalisasi dan Transparansi</div>
              </div>
            </Link>

            <div className="flex-1" />

            {user ? (
              <Link to="/login" title={`${user.nama} · ${user.role}`} className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl glass text-xs font-semibold">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                <span className="max-w-[120px] truncate">{user.nama}</span>
              </Link>
            ) : (
              <Link to="/login" className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl gradient-primary text-primary-foreground text-xs font-semibold shadow-glow">
                <LogIn className="h-3.5 w-3.5" /> Login
              </Link>
            )}

            <button
              onClick={() => window.location.reload()}
              className="h-10 w-10 grid place-items-center rounded-xl glass hover:bg-accent transition"
              title="Refresh"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            <button
              className="h-10 w-10 grid place-items-center rounded-xl glass hover:bg-accent relative"
              title="Notifikasi"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-destructive" />
            </button>
            <button
              onClick={toggle}
              className="h-10 w-10 grid place-items-center rounded-xl glass hover:bg-accent"
              title="Toggle theme"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </header>

        <main className="flex-1 px-3 sm:px-5 py-4 sm:py-6 pb-28">{children}</main>
      </div>
    </div>
  );
}

function SidebarInner({ pathname }: { pathname: string }) {
  return (
    <>
      <div className="p-5 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <img src={logo} alt="Logo" className="h-12 w-12 rounded-full shadow-glow" />
          <div className="min-w-0">
            <div className="text-sm font-bold leading-tight">SiRT 06 Digital</div>
            <div className="text-[10px] text-muted-foreground leading-tight">Bogeman Wetan • RW 07</div>
          </div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
        {navItems.map((item) => {
          const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition relative",
                active
                  ? "gradient-primary text-primary-foreground shadow-glow"
                  : "text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-sidebar-border">
        <div className="glass rounded-xl p-3 text-[11px] text-muted-foreground text-center">
          © 2026 RT 06 / RW 07
        </div>
      </div>
    </>
  );
}