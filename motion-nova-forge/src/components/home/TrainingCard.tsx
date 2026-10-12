import { Link } from "@tanstack/react-router";
import {
  Activity,
  ArrowUpRight,
  Award,
  BookOpen,
  BrainCircuit,
  BriefcaseBusiness,
  Building2,
  Clock3,
  Dumbbell,
  HeartPulse,
  Languages,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { TiltCard } from "@/components/fx/Magnetic";
import { EmsImage } from "@/components/fx/EmsImage";
import type { Training, TrainingDurationUnit } from "@/types/domain";
import {
  formatCatalogMoney,
  localizedTrainingText,
  trainingCategory,
  trainingTitle,
} from "@/lib/training-catalog";

const AXIS_ICONS: Record<Training["axisCode"], LucideIcon> = {
  EMS: Activity,
  LANGUAGES: Languages,
  MANAGEMENT: BriefcaseBusiness,
  AI: BrainCircuit,
  SPORT_COACHING: Dumbbell,
  WELLNESS: HeartPulse,
  BTP: Building2,
  BTS: BookOpen,
};

const DURATION_LABELS: Record<TrainingDurationUnit, string> = {
  HOURS: "h",
  DAYS: "jours",
  WEEKS: "semaines",
  MONTHS: "mois",
  YEARS: "ans",
};

export function TrainingCard({ training: t }: { training: Training }) {
  const description =
    localizedTrainingText(t, t.description) ?? localizedTrainingText(t, t.tagline);
  const diploma = t.recognitionType === "BTP_DIPLOMA" || t.recognitionType === "BTS_DIPLOMA";
  const recognition = diploma
    ? t.approvalStatus === "APPROVED"
      ? "Diplôme homologué"
      : t.approvalStatus === "PENDING"
        ? "Homologation en cours"
        : null
    : t.recognitionType === "I_MOTION_CERTIFICATE"
      ? t.certification
        ? t.certification
        : "Nom de la certification non renseigné"
      : null;
  const durationUnit = t.durationUnit ?? "HOURS";
  const durationValue = t.durationValue ?? t.durationHours;
  const AxisIcon = AXIS_ICONS[t.axisCode];

  return (
    <TiltCard max={4} className="h-full">
      <Link
        to="/trainings/$slug"
        params={{ slug: t.slug }}
        className="glass hover-lift group relative flex h-full min-h-[27rem] flex-col overflow-hidden rounded-2xl border border-white/10 transition-[border-color,box-shadow] duration-300 hover:border-electric/35 hover:shadow-[0_18px_48px_-28px_var(--electric)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric"
      >
        <div className="relative aspect-[16/10] shrink-0 overflow-hidden border-b border-white/10 bg-secondary/50">
          {t.coverUrl ? (
            <EmsImage
              src={t.coverUrl}
              alt={trainingTitle(t)}
              className="absolute inset-0 h-full w-full rounded-none border-0"
              imgClassName="group-hover:scale-105"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center overflow-hidden bg-[linear-gradient(135deg,color-mix(in_oklab,var(--background)_96%,var(--electric)),color-mix(in_oklab,var(--background)_84%,var(--violet)))]">
              <div
                aria-hidden="true"
                className="absolute inset-0 opacity-[0.14] [background-image:linear-gradient(color-mix(in_oklab,var(--electric)_35%,transparent)_1px,transparent_1px),linear-gradient(90deg,color-mix(in_oklab,var(--electric)_35%,transparent)_1px,transparent_1px)] [background-size:28px_28px]"
              />
              <AxisIcon
                aria-hidden="true"
                className="h-14 w-14 text-electric/65 transition-transform duration-500 group-hover:scale-110"
                strokeWidth={1.15}
              />
              <span className="absolute bottom-4 left-5 font-display text-xs uppercase text-foreground/70">
                {trainingCategory(t.axisCode)}
              </span>
            </div>
          )}

          <div className="absolute inset-x-4 top-4 flex items-start justify-between gap-2">
            <span className="max-w-[70%] truncate rounded-full border border-white/15 bg-background/70 px-3 py-1.5 text-[0.62rem] font-medium text-foreground shadow-sm backdrop-blur-md">
              {trainingCategory(t.axisCode)}
            </span>
            {recognition && (
              <span className="flex max-w-[55%] items-center gap-1.5 rounded-full border border-mint/20 bg-background/75 px-2.5 py-1.5 text-[0.62rem] text-mint shadow-sm backdrop-blur-md">
                <Award className="h-3 w-3 shrink-0" />
                <span className="truncate">{recognition}</span>
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-1 flex-col p-5">
          <h3 className="line-clamp-2 min-h-[3.25rem] font-display text-lg font-semibold leading-snug text-foreground">
            {trainingTitle(t)}
          </h3>
          <p className="mt-2 line-clamp-3 min-h-[4.25rem] text-sm leading-relaxed text-muted-foreground">
            {description ?? ""}
          </p>

          <div className="mt-auto">
            <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/10 pt-4">
              <span className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
                <Clock3 className="h-4 w-4 shrink-0 text-electric" />
                <span className="truncate">
                  {durationValue ?? "Durée non renseignée"} {durationValue != null ? DURATION_LABELS[durationUnit] : ""}
                  {durationUnit !== "HOURS" && t.durationHours !== null ? ` · ${t.durationHours} h de cours` : ""}
                </span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block text-[0.6rem] uppercase text-muted-foreground">Prix indicatif</span>
                <span className="font-display text-base font-semibold text-foreground">
                  {formatCatalogMoney(t.price, t.currency)}
                </span>
              </span>
            </div>

            <div className="mt-4 flex items-center justify-between rounded-xl border border-electric/20 bg-electric/[0.04] px-4 py-3 text-xs font-medium text-foreground transition-colors group-hover:border-electric/45 group-hover:bg-electric/[0.08]">
              <span>Découvrir la formation</span>
              <span className="flex h-7 w-7 items-center justify-center rounded-full border border-electric/25 text-electric transition-transform duration-300 group-hover:translate-x-0.5">
                <ArrowUpRight className="h-4 w-4" />
              </span>
            </div>
          </div>
        </div>
      </Link>
    </TiltCard>
  );
}
