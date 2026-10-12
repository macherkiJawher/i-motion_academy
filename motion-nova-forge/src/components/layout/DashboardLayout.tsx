import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Bell, LogOut, Menu, X, Zap } from "lucide-react";
import { useEffect, useState, type ComponentType } from "react";
import { Button } from "@/components/ui/button";
import { homeForRole, useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import type { Role } from "@/types/domain";

export interface NavItem {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  exact?: boolean;
}

interface Props {
  title: string;
  role: Role;
  items: NavItem[];
}

/**
 * Shared shell for the participant and admin spaces.
 * Access control is client-side only here — the NestJS API remains the
 * authority and every request is sent with the bearer token.
 */
export function DashboardLayout({ title, role, items }: Props) {
  const { user, ready, logout } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (ready && !user) navigate({ to: "/login", replace: true });
    else if (ready && user && user.role !== role) {
      navigate({ to: homeForRole(user.role), replace: true });
    }
  }, [ready, user, role, navigate]);

  useEffect(() => setOpen(false), [pathname]);

  if (!ready || !user || user.role !== role) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="glass rounded-2xl px-6 py-4 text-sm text-muted-foreground">Chargement de votre espace…</div>
      </div>
    );
  }

  const isActive = (item: NavItem) =>
    item.exact ? pathname === item.to : pathname === item.to || pathname.startsWith(`${item.to}/`);

  const initials = `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.toUpperCase();

  return (
    <div className="relative min-h-screen pt-24 lg:pt-28">
      <div className="mx-auto flex w-full max-w-[100rem] gap-6 px-4 pb-16 lg:px-8">
        <aside
          className={cn(
            "glass-strong fixed inset-x-4 top-24 z-50 rounded-3xl p-3 lg:sticky lg:top-28 lg:z-auto lg:block lg:h-[calc(100vh-9rem)] lg:w-64 lg:shrink-0 lg:overflow-y-auto",
            open ? "block" : "hidden lg:block",
          )}
        >
          <div className="flex items-center gap-3 px-3 py-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[image:var(--gradient-electric)]">
              <Zap className="h-4 w-4 text-primary-foreground" />
            </span>
            <div className="min-w-0">
              <p className="font-display text-sm font-semibold leading-tight">{title}</p>
              <p className="truncate text-xs text-muted-foreground">Espace {role === "ADMIN" ? "administrateur" : "participant"}</p>
            </div>
          </div>

          <nav aria-label={`Navigation ${title}`} className="mt-2 flex flex-col gap-1">
            {items.map((item) => {
              const active = isActive(item);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "relative flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition-colors",
                    active ? "text-foreground" : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground",
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId={`dash-active-${role}`}
                      className="absolute inset-0 rounded-2xl border border-electric/50 bg-electric/20 shadow-[0_0_24px_-14px_var(--electric)]"
                      transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    />
                  )}
                  <item.icon className={cn("relative h-4 w-4", active && "text-electric")} />
                  <span className="relative">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-4 border-t border-border/60 px-3 pt-4">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-xs font-semibold">
                {initials}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm">{user.firstName} {user.lastName}</p>
                <p className="truncate text-xs text-muted-foreground">{user.email}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="mt-3 w-full justify-start text-muted-foreground"
              onClick={() => {
                logout();
                navigate({ to: "/login", replace: true });
              }}
            >
              <LogOut className="h-4 w-4" /> Se déconnecter
            </Button>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="mb-4 flex items-center justify-between lg:hidden">
            <Button variant="glass" size="sm" onClick={() => setOpen((v) => !v)}>
              {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />} Menu
            </Button>
            <Button asChild variant="ghost" size="icon" aria-label="Notifications">
              <Link to={role === "ADMIN" ? "/admin/notifications" : "/dashboard/notifications"}>
                <Bell className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
