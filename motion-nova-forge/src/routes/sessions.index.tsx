import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays, MapPin, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import {
  EmptyState,
  ErrorState,
  LoadingRows,
  StatusBadge,
  formatDate,
  formatMoney,
  statusLabel,
  statusTone,
} from "@/components/dash/Primitives";
import { Reveal } from "@/components/fx/Reveal";
import { catalogService, sessionService } from "@/services";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { isUpcomingSession, trainingTitle } from "@/lib/training-catalog";
import type { TrainingSession } from "@/types/domain";

const modeText: Record<TrainingSession["mode"], string> = {
  "On-site": "Présentiel",
  Hybrid: "Hybride",
  "Live online": "À distance",
};

export const Route = createFileRoute("/sessions/")({
  head: () => ({
    meta: [
      { title: "Sessions et dates — i-Motion Academy" },
      {
        name: "description",
        content:
          "Consultez les dates, lieux, formats, disponibilités et tarifs des sessions de formation publiées par i-Motion Academy.",
      },
      { property: "og:title", content: "Sessions et dates — i-Motion Academy" },
      {
        property: "og:description",
        content: "Dates, lieux, formateurs et disponibilités des sessions ouvertes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SessionsPage,
});

function SessionsPage() {
  const { user } = useAuth();
  const {
    data: sessions = [],
    isLoading: sessionsLoading,
    isError: sessionsError,
    refetch,
  } = useQuery({
    queryKey: ["sessions"],
    queryFn: () => sessionService.list(),
  });
  const {
    data: trainings = [],
    isLoading: trainingsLoading,
    isError: trainingsError,
  } = useQuery({
    queryKey: ["trainings"],
    queryFn: () => catalogService.trainings(),
  });
  const isLoading = sessionsLoading || trainingsLoading;
  const isError = sessionsError || trainingsError;
  const [city, setCity] = useState("Toutes");
  const [mode, setMode] = useState("Tous");
  const [category, setCategory] = useState("Tous");
  const availableSessions = sessions.filter((session) => isUpcomingSession(session, trainings));

  const cities = useMemo(
    () => [
      "Toutes",
      ...new Set(
        availableSessions.flatMap((session) =>
          session.locations?.length
            ? session.locations.map((location) => location.city).filter(Boolean)
            : [session.city].filter(Boolean),
        ),
      ),
    ],
    [availableSessions],
  );
  const modes = ["Tous", "On-site", "Hybrid", "Live online"];
  const categoryLabels: Record<string, string> = {
    EMS: "Sport et EMS",
    SPORT_COACHING: "Sport et coaching",
    WELLNESS: "Bien-être et nutrition",
    LANGUAGES: "Langues",
    MANAGEMENT: "Gestion",
    AI: "Intelligence artificielle",
    BTP: "BTP",
    BTS: "BTS",
  };
  const categories = useMemo(
    () => ["Tous", ...new Set(availableSessions.map((session) => session.axisCode))],
    [availableSessions],
  );

  const filtered = availableSessions
    .filter((session) =>
      city === "Toutes"
        ? true
        : session.locations?.length
          ? session.locations.some((location) => location.city === city)
          : session.city === city,
    )
    .filter((session) => (mode === "Tous" ? true : session.mode === mode))
    .filter((session) => (category === "Tous" ? true : session.axisCode === category))
    .sort((a, b) => a.startDate.localeCompare(b.startDate));

  return (
    <>
      <PageHeader
        eyebrow="Calendrier"
        title="Sessions et dates"
        description="Choisissez une session ouverte, consultez ses modalités et envoyez votre demande d'inscription."
      />

      <section className="mx-auto w-full max-w-6xl px-4 pb-24">
        <div className="glass mb-8 flex flex-wrap items-center gap-4 rounded-3xl p-4">
          <Filter label="Ville" options={cities} value={city} onChange={setCity} />
          <Filter
            label="Format"
            options={modes.map((value) =>
              value === "Tous" ? value : modeText[value as TrainingSession["mode"]],
            )}
            value={mode === "Tous" ? mode : modeText[mode as TrainingSession["mode"]]}
            onChange={(value) =>
              setMode(Object.entries(modeText).find(([, label]) => label === value)?.[0] ?? "Tous")
            }
          />
          <Filter
            label="Catégorie"
            options={categories.map((value) =>
              value === "Tous" ? value : (categoryLabels[value] ?? value),
            )}
            value={category === "Tous" ? "Tous" : (categoryLabels[category] ?? category)}
            onChange={(value) =>
              setCategory(
                categories.find((item) => (categoryLabels[item] ?? item) === value) ?? "Tous",
              )
            }
          />
          <span className="ml-auto text-xs text-muted-foreground">
            {filtered.length} session{filtered.length > 1 ? "s" : ""}
          </span>
        </div>

        {isLoading && <LoadingRows rows={5} />}
        {isError && (
          <ErrorState message="Le calendrier n'a pas pu être chargé." onRetry={() => refetch()} />
        )}

        {!isLoading && !isError && filtered.length === 0 && (
          <EmptyState
            title="Aucune session ouverte à venir"
            description="Aucune session répondant à ces critères n'est actuellement publiée. Contactez l'académie pour obtenir des informations."
            action={
              <Button asChild variant="electric">
                <Link to="/contact">Contacter l'académie</Link>
              </Button>
            }
          />
        )}

        <div className="space-y-4">
          {filtered.map((session, i) => {
            const training = trainings.find((item) => item.id === session.trainingId)!;
            const locationNames = session.locations?.length
              ? session.locations.map((location) =>
                  [location.name, location.city].filter(Boolean).join(", "),
                )
              : [[session.locationName, session.city].filter(Boolean).join(", ")].filter(Boolean);
            const trainerNames = session.trainers?.length
              ? session.trainers.map((trainer) => `${trainer.firstName} ${trainer.lastName}`)
              : [session.trainerName].filter(Boolean);
            return (
              <Reveal key={session.id} delay={i * 0.05}>
                <article className="glass group flex flex-wrap items-center gap-6 rounded-3xl p-5 transition-colors hover:border-electric/30 sm:p-6">
                  <div className="flex min-w-[7rem] flex-col rounded-2xl border border-border/60 bg-secondary/40 px-4 py-3 text-center">
                    <span className="font-display text-2xl font-semibold text-gradient">
                      {new Date(`${session.startDate}T12:00:00Z`).getDate()}
                    </span>
                    <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      {new Date(`${session.startDate}T12:00:00Z`).toLocaleDateString("fr-TN", {
                        month: "short",
                        timeZone: "UTC",
                      })}
                    </span>
                  </div>

                  <div className="min-w-[14rem] flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-display text-lg font-semibold">
                        {trainingTitle(training)}
                      </h2>
                      <StatusBadge tone={statusTone(session.status)}>
                        {statusLabel(session.status)}
                      </StatusBadge>
                    </div>
                    <p className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarDays className="h-3.5 w-3.5" /> {formatDate(session.startDate)} →{" "}
                        {formatDate(session.endDate)}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5" />{" "}
                        {locationNames.length ? locationNames.join(" · ") : "Lieu à confirmer"} ·{" "}
                        {modeText[session.mode]}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5" /> {session.seatsLeft} / {session.capacity}{" "}
                        places disponibles
                      </span>
                    </p>
                    {trainerNames.length > 0 && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        {trainerNames.length > 1 ? "Formateurs" : "Formateur"} ·{" "}
                        {trainerNames.join(", ")}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-4">
                    <p className="font-display text-lg font-semibold">
                      {formatMoney(session.price, session.currency)}
                    </p>
                    <Button asChild variant="glass" size="sm">
                      <Link to="/sessions/$id" params={{ id: session.id }}>
                        Voir la session
                      </Link>
                    </Button>
                    <Button asChild variant="electric" size="sm">
                      {user ? (
                        <Link to="/sessions/$id" params={{ id: session.id }}>
                          S'inscrire
                        </Link>
                      ) : (
                        <Link to="/login" search={{ returnTo: `/sessions/${session.id}` }}>
                          S'inscrire
                        </Link>
                      )}
                    </Button>
                  </div>
                </article>
              </Reveal>
            );
          })}
        </div>
      </section>
    </>
  );
}

function Filter({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</span>
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(o)}
          className={cn(
            "rounded-full border px-3 py-1.5 text-xs transition-colors",
            value === o
              ? "border-electric/40 bg-electric/10 text-electric"
              : "border-border/60 text-muted-foreground hover:text-foreground",
          )}
        >
          {o}
        </button>
      ))}
    </div>
  );
}
