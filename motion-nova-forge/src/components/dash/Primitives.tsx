import { motion } from "framer-motion";
import type { ComponentType, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PaginationControls({
  page,
  pageCount,
  pageSize,
  totalItems,
  onPageChange,
}: {
  page: number;
  pageCount: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
}) {
  if (totalItems <= pageSize) return null;
  const firstItem = (page - 1) * pageSize + 1;
  const lastItem = Math.min(page * pageSize, totalItems);
  const buttonClass =
    "rounded-lg border border-border/60 px-3 py-1.5 text-sm transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <nav
      aria-label="Pagination"
      className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border/50 pt-4"
    >
      <p className="text-sm text-muted-foreground">
        Affichage {firstItem}–{lastItem} sur {totalItems}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className={buttonClass}
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Précédent
        </button>
        <span className="min-w-20 text-center text-sm text-muted-foreground">
          Page {page} / {pageCount}
        </span>
        <button
          type="button"
          className={buttonClass}
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
        >
          Suivant
        </button>
      </div>
    </nav>
  );
}

/* --------------------------------- head -------------------------------- */

export function DashHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="font-display text-2xl font-semibold tracking-tight sm:text-3xl"
        >
          {title}
        </motion.h1>
        {subtitle && <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/* --------------------------------- card -------------------------------- */

export function Panel({
  title,
  description,
  actions,
  className,
  children,
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn("glass rounded-3xl p-5 sm:p-6", className)}>
      {(title || actions) && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            {title && <h2 className="font-display text-base font-semibold">{title}</h2>}
            {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

/* --------------------------------- kpi --------------------------------- */

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  delta,
  index = 0,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: ComponentType<{ className?: string }>;
  delta?: number;
  index?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }}
      className="glass group relative overflow-hidden rounded-3xl p-5"
    >
      <span className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-electric/10 blur-2xl transition-opacity group-hover:opacity-100 opacity-60" />
      <div className="relative flex items-start justify-between">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
        {Icon && <Icon className="h-4 w-4 text-electric" />}
      </div>
      <p className="relative mt-3 font-display text-3xl font-semibold tracking-tight">{value}</p>
      <div className="relative mt-1 flex items-center gap-2 text-xs">
        {typeof delta === "number" && (
          <span className={delta >= 0 ? "text-electric" : "text-destructive"}>
            {delta >= 0 ? "+" : ""}
            {delta}%
          </span>
        )}
        {hint && <span className="text-muted-foreground">{hint}</span>}
      </div>
    </motion.div>
  );
}

/* -------------------------------- badge -------------------------------- */

const tones = {
  neutral: "border-border/70 bg-secondary/50 text-muted-foreground",
  electric: "border-electric/40 bg-electric/10 text-electric",
  success: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  warning: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  danger: "border-red-400/30 bg-red-400/10 text-red-300",
} as const;

export type Tone = keyof typeof tones;

export function StatusBadge({ children, tone = "neutral" }: { children: ReactNode; tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.7rem] font-medium tracking-wide",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}

export function statusTone(status: string): Tone {
  switch (status) {
    case "CONFIRMED":
    case "PAID":
    case "COMPLETED":
    case "ISSUED":
    case "RESOLVED":
    case "OPEN":
      return "success";
    case "PENDING":
    case "PARTIAL":
    case "ALMOST_FULL":
    case "IN_PROGRESS":
      return "warning";
    case "CANCELLED":
    case "FAILED":
    case "FULL":
      return "danger";
    case "NEW":
      return "electric";
    default:
      return "neutral";
  }
}

export function statusLabel(status: string) {
  const map: Record<string, string> = {
    OPEN: "Ouvert",
    DRAFT: "Brouillon",
    ALMOST_FULL: "Presque complet",
    FULL: "Complet",
    CLOSED: "Fermé",
    PENDING: "En attente",
    PARTIAL: "Partiel",
    CONFIRMED: "Confirmé",
    PAID: "Payé",
    COMPLETED: "Terminé",
    ISSUED: "Émis",
    RESOLVED: "Résolu",
    CANCELLED: "Annulé",
    FAILED: "Échoué",
    NEW: "Nouveau",
    IN_PROGRESS: "En cours",
    APPROVED: "Approuvé",
    NOT_APPLICABLE: "N/A",
  };

  return (
    map[status] ??
    status
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/^\w/, (c) => c.toUpperCase())
  );
}

/* -------------------------------- table -------------------------------- */

export function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="-mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
      <table className="w-full min-w-[42rem] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-border/60">
            {head.map((h) => (
              <th
                key={h}
                className="whitespace-nowrap px-3 py-3 text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function Row({ children }: { children: ReactNode }) {
  return (
    <tr className="border-b border-border/40 transition-colors last:border-0 hover:bg-secondary/30">
      {children}
    </tr>
  );
}

export function Cell({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <td className={cn("whitespace-nowrap px-3 py-3.5 align-middle", className)}>{children}</td>
  );
}

/* ------------------------------ misc states ---------------------------- */

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="glass flex flex-col items-center justify-center rounded-3xl px-6 py-14 text-center">
      <span className="mb-4 h-12 w-12 rounded-2xl bg-[image:var(--gradient-electric)] opacity-70 blur-[1px]" />
      <p className="font-display text-base font-semibold">{title}</p>
      {description && <p className="mt-2 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function LoadingRows({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-14 animate-pulse rounded-2xl bg-secondary/40" />
      ))}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="glass rounded-3xl border border-destructive/30 p-6 text-center">
      <p className="text-sm text-destructive">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 text-xs text-electric underline-offset-4 hover:underline"
        >
          Réessayer
        </button>
      )}
    </div>
  );
}

/* ------------------------------- helpers ------------------------------- */

export function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(`${value.slice(0, 10)}T12:00:00Z`).toLocaleDateString("fr-TN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatMoney(amount: number, currency = "TND") {
  try {
    return new Intl.NumberFormat("fr-TN", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${new Intl.NumberFormat("fr-TN", { maximumFractionDigits: 0 }).format(amount)} ${currency}`;
  }
}
