import { Link, useRouterState } from "@tanstack/react-router";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "framer-motion";
import { ChevronDown, Dumbbell, HeartPulse, Languages, Menu, X, Zap } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Magnetic } from "@/components/fx/Magnetic";
import { cn } from "@/lib/utils";
import { homeForRole, useAuth } from "@/hooks/useAuth";
import { useT } from "@/hooks/useA11y";

const links = [
  { to: "/", key: "nav.home" },
  { to: "/about", key: "nav.about" },
  { to: "/sessions", key: "nav.sessions" },
  { to: "/contact", key: "nav.contact" },
] as const;
const trainingFamilies = [
  {
    icon: Dumbbell,
    title: "Sport & EMS",
    detail: "EMS, coaching, Pilates, fitness et préparation physique",
  },
  {
    icon: HeartPulse,
    title: "Bien-être & Nutrition",
    detail: "Yoga, mobilité, étirements et nutrition sportive",
  },
  {
    icon: Languages,
    title: "Langues",
    detail: "Français, anglais, allemand, italien, espagnol et chinois",
  },
] as const;

function TrainingMenu({ onNavigate }: { onNavigate?: () => void }) {
  const active = useRouterState({ select: (s) => s.location.pathname.startsWith("/trainings") });
  const t = useT();
  const [open, setOpen] = useState(false);

  return (
    <div
      className="relative"
      onPointerEnter={() => setOpen(true)}
      onPointerLeave={() => setOpen(false)}
    >
      <Link
        to="/trainings"
        search={{ category: "All" }}
        onClick={() => {
          setOpen(false);
          onNavigate?.();
        }}
        className={cn(
          "relative flex items-center gap-1 rounded-full px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground",
          active && "text-foreground",
        )}
      >
        {t("nav.trainings")}
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
        {active && (
          <span className="absolute inset-x-3 -bottom-0.5 h-px bg-[image:var(--gradient-electric)]" />
        )}
      </Link>
      {open && (
        <div className="absolute left-1/2 top-full z-[110] w-[25rem] -translate-x-1/2 pt-3">
          <div className="rounded-2xl border border-border/60 bg-popover p-2 text-popover-foreground shadow-[var(--shadow-soft)]">
            <p className="px-3 pb-2 pt-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
              Explorer nos formations
            </p>
            {trainingFamilies.map(({ icon: Icon, title, detail }) => (
              <Link
                key={title}
                to="/trainings"
                search={{ category: title }}
                onClick={() => {
                  setOpen(false);
                  onNavigate?.();
                }}
                className="flex items-start gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-secondary/70"
              >
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-electric/10 text-electric">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block font-medium text-foreground">{title}</span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                    {detail}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function Navbar() {
  const { scrollY } = useScroll();
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user } = useAuth();
  const t = useT();
  useMotionValueEvent(scrollY, "change", (y) => {
    const prev = scrollY.getPrevious() ?? 0;
    setScrolled(y > 24);
    setHidden(y > prev && y > 220 && !open);
  });
  const navLink = (l: (typeof links)[number]) => {
    const active = l.to === "/" ? pathname === "/" : pathname.startsWith(l.to);
    return (
      <li key={l.to}>
        <Link
          to={l.to}
          className="relative rounded-full px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          {t(l.key)}
          {active && (
            <motion.span
              layoutId="nav-active"
              className="absolute inset-x-3 -bottom-0.5 h-px bg-[image:var(--gradient-electric)]"
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
            />
          )}
        </Link>
      </li>
    );
  };
  const btpActive = pathname.startsWith("/btp-bts");
  return (
    <motion.header
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: hidden ? -120 : 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-x-0 top-0 z-[100] flex justify-center px-4 pt-4"
    >
      <nav
        aria-label="Navigation principale"
        className={cn(
          "flex w-full max-w-6xl items-center justify-between rounded-full px-4 py-2.5 transition-all duration-500",
          scrolled ? "glass-strong shadow-[var(--shadow-soft)]" : "glass",
        )}
      >
        <Link
          to="/"
          className="group flex items-center gap-2.5 pl-2"
          aria-label="i-Motion Academy home"
        >
          <span className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-[image:var(--gradient-electric)]">
            <Zap className="h-4 w-4 text-primary-foreground" />
            <span className="absolute inset-0 rounded-xl bg-electric/50 blur-lg transition-opacity group-hover:opacity-100 opacity-40" />
          </span>
          <span className="font-display text-sm font-semibold tracking-tight">
            i-Motion <span className="text-muted-foreground">Academy</span>
          </span>
        </Link>
        <ul className="hidden items-center gap-1 lg:flex">
          {links.slice(0, 2).map(navLink)}
          <li>
            <TrainingMenu />
          </li>
          <li>
            <Link
              to="/btp-bts"
              className={cn(
                "relative rounded-full px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground",
                btpActive && "text-foreground",
              )}
            >
              BTP & BTS
              {btpActive && (
                <span className="absolute inset-x-3 -bottom-0.5 h-px bg-[image:var(--gradient-electric)]" />
              )}
            </Link>
          </li>
          {links.slice(2).map(navLink)}
        </ul>
        <div className="hidden items-center gap-2 lg:flex">
          {user ? (
            <Magnetic strength={0.25}>
              <Button asChild variant="electric" size="sm">
                <Link to={homeForRole(user.role)}>{t("nav.account")}</Link>
              </Button>
            </Magnetic>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/login">{t("nav.login")}</Link>
              </Button>
              <Magnetic strength={0.25}>
                <Button asChild variant="electric" size="sm">
                  <Link to="/register">{t("nav.join")}</Link>
                </Button>
              </Magnetic>
            </>
          )}
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? t("nav.closeMenu") : t("nav.openMenu")}
          aria-expanded={open}
          className="glass flex h-10 w-10 items-center justify-center rounded-full lg:hidden"
        >
          {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </nav>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="glass-strong absolute inset-x-4 top-20 rounded-3xl p-4 lg:hidden"
          >
            <ul className="flex flex-col">
              {links.slice(0, 2).map((l) => (
                <li key={l.to}>
                  <Link
                    to={l.to}
                    onClick={() => setOpen(false)}
                    className="block rounded-2xl px-4 py-3 text-sm text-muted-foreground"
                  >
                    {t(l.key)}
                  </Link>
                </li>
              ))}
              <li>
                <TrainingMenu onNavigate={() => setOpen(false)} />
              </li>
              <li>
                <Link
                  to="/btp-bts"
                  onClick={() => setOpen(false)}
                  className="block rounded-2xl px-4 py-3 text-sm text-muted-foreground"
                >
                  BTP & BTS
                </Link>
              </li>
              {links.slice(2).map((l) => (
                <li key={l.to}>
                  <Link
                    to={l.to}
                    onClick={() => setOpen(false)}
                    className="block rounded-2xl px-4 py-3 text-sm text-muted-foreground"
                  >
                    {t(l.key)}
                  </Link>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
