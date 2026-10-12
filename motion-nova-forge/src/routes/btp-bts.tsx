import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { GraduationCap, Search, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, LoadingRows } from "@/components/dash/Primitives";
import { TrainingCard } from "@/components/home/TrainingCard";
import { catalogService } from "@/services";
import type { AxisCode, Training } from "@/types/domain";
import { cn } from "@/lib/utils";
import { isPendingDiploma, isPublishableTraining, trainingTitle } from "@/lib/training-catalog";

export const Route = createFileRoute("/btp-bts")({
  head: () => ({
    meta: [
      { title: "Formations BTP & BTS — i-Motion Academy" },
      { name: "description", content: "Consultez les parcours BTP et BTS publiés ainsi que leur statut d'homologation." },
    ],
  }),
  component: BtpBts,
});

function BtpBts() {
  const [query, setQuery] = useState("");
  const [axis, setAxis] = useState<"ALL" | Extract<AxisCode, "BTP" | "BTS">>("ALL");
  const { data = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["btp-bts-trainings"],
    queryFn: () => catalogService.trainings(),
  });

  const allDiplomas = data.filter(
    (training) => training.axisCode === "BTP" || training.axisCode === "BTS",
  );
  const availableDiplomas = allDiplomas.filter(isPublishableTraining);
  const pendingDiplomas = allDiplomas.filter(isPendingDiploma);
  const availableAxes = Array.from(new Set(availableDiplomas.map((training) => training.axisCode)));
  const trainings = useMemo(
    () =>
      availableDiplomas.filter(
        (training) =>
          (axis === "ALL" || training.axisCode === axis) &&
          [trainingTitle(training), training.axisCode]
            .join(" ")
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [axis, availableDiplomas, query],
  );

  return (
    <>
      <PageHeader
        eyebrow="Parcours diplômants"
        title="Formations BTP & BTS"
        description="Consultez les formations BTP et BTS publiées. Chaque parcours indique son statut d'homologation ; une demande en attente n'est pas ouverte à l'inscription."
      />

      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="glass-strong rounded-3xl p-6 md:p-8">
          <div className="grid gap-6 md:grid-cols-3">
            <div>
              <GraduationCap className="h-6 w-6 text-electric" />
              <h2 className="mt-4 font-display text-lg font-semibold">Parcours BTP & BTS</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Des formations conçues pour développer des compétences professionnelles et préparer votre projet.
              </p>
            </div>
            <div>
              <ShieldCheck className="h-6 w-6 text-electric" />
              <h2 className="mt-4 font-display text-lg font-semibold">Statut vérifié</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                L'état de chaque parcours est repris du dossier publié par l'académie.
              </p>
            </div>
            <div>
              <GraduationCap className="h-6 w-6 text-electric" />
              <h2 className="mt-4 font-display text-lg font-semibold">BTP et BTS</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Seuls les programmes complets et publiés sont proposés à l'inscription.
              </p>
            </div>
          </div>
        </div>

        <div className="glass mt-8 flex flex-col gap-4 rounded-3xl p-4 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-sm">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Rechercher une formation"
              aria-label="Rechercher une formation BTP ou BTS"
              className="glass h-11 w-full rounded-full pl-11 pr-4 text-sm outline-none placeholder:text-muted-foreground/60 focus:shadow-[0_0_28px_-8px_var(--electric)]"
            />
          </div>
          {availableAxes.length > 1 && <div className="flex flex-wrap gap-2" aria-label="Filtrer par diplôme">
            {(["ALL", ...availableAxes] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setAxis(value)}
                className={cn(
                  "rounded-full px-4 py-2 text-xs uppercase tracking-[0.14em] transition-colors",
                  axis === value
                    ? "bg-electric text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {value === "ALL" ? "Tous" : value}
              </button>
            ))}
          </div>}
        </div>

        <div className="mt-8">
          {isLoading && <LoadingRows rows={4} />}
          {isError && <ErrorState message="Impossible de charger les parcours diplômants." onRetry={() => void refetch()} />}
          {!isLoading && !isError && pendingDiplomas.length > 0 && (
            <div className="mb-6 space-y-3">
              {pendingDiplomas.map((training) => (
                <div key={training.id} className="glass flex flex-col gap-3 rounded-2xl p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium">{trainingTitle(training)} · {training.axisCode}</p>
                    <p className="mt-1 text-sm text-muted-foreground">L'homologation est en attente. Ce parcours n'est pas ouvert à l'inscription.</p>
                  </div>
                  <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 text-xs text-amber-200">Homologation en cours</span>
                </div>
              ))}
            </div>
          )}
          {!isLoading && trainings.length === 0 && (
            <EmptyState
              title="Aucun parcours diplômant ouvert"
              description={pendingDiplomas.length > 0
                ? "Les dossiers affichés ci-dessus sont en attente d'homologation et ne peuvent pas encore être proposés à l'inscription."
                : "Aucun cursus BTP ou BTS complet n'est publié actuellement."}
              action={<Button asChild variant="electric"><Link to="/contact">Contacter l'académie</Link></Button>}
            />
          )}
          {!isLoading && trainings.length > 0 && (
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {trainings.map((training) => <TrainingCard key={training.id} training={training} />)}
            </div>
          )}
        </div>
      </section>
    </>
  );
}

