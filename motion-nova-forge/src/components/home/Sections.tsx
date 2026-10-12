import { Link } from "@tanstack/react-router";
import { ArrowUpRight, CalendarDays, GraduationCap, MapPin, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Reveal, RevealText } from "@/components/fx/Reveal";
import { Magnetic, TiltCard } from "@/components/fx/Magnetic";
import { Button } from "@/components/ui/button";
import { catalogService, sessionService } from "@/services";
import type { Training as ApiTraining, TrainingSession } from "@/types/domain";
import {
  formatCatalogDate,
  formatCatalogMoney,
  isPublishableTraining,
  isUpcomingSession,
  localizedSessionMode,
  localizedTrainingText,
  trainingCategory,
  trainingTitle,
} from "@/lib/training-catalog";

/* ------------------------------------------------ Training universe grid -- */

export function Universe() {
  const {
    data = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["trainings"],
    queryFn: () => catalogService.trainings(),
  });
  const activeTrainings = data.filter(
    (training) =>
      isPublishableTraining(training) && training.axisCode !== "BTP" && training.axisCode !== "BTS",
  );
  const featured: ApiTraining[] = [];

  for (const axis of ["EMS"] as const) {
    const training = activeTrainings.find((item) => item.axisCode === axis);
    if (training) featured.push(training);
  }
  for (const training of activeTrainings) {
    if (featured.length >= 6) break;
    if (!featured.some((item) => item.id === training.id)) featured.push(training);
  }

  const catalogGridClass =
    featured.length === 1
      ? "mx-auto max-w-2xl md:grid-cols-1"
      : featured.length === 2
        ? "mx-auto max-w-5xl md:grid-cols-2"
        : featured.length === 4
          ? "mx-auto max-w-5xl md:grid-cols-2 lg:grid-cols-2"
          : featured.length === 5
            ? "md:grid-cols-6 lg:grid-cols-6"
            : featured.length === 3
              ? "md:grid-cols-3 lg:grid-cols-3"
              : "md:grid-cols-2 lg:grid-cols-3";

  return (
    <section className="relative mx-auto max-w-6xl px-6 py-24">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <Reveal>
            <span className="text-xs uppercase tracking-[0.3em] text-electric">
              Catalogue de formations
            </span>
          </Reveal>
          <h2 className="mt-4 max-w-xl font-display text-[clamp(2rem,4.4vw,3.4rem)] font-semibold uppercase leading-[1.03]">
            <RevealText text="Des parcours pour apprendre, évoluer et se spécialiser." />
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            L'EMS est une spécialité forte de l'académie, aux côtés du coaching, du bien-être, des
            langues, de la gestion et des parcours diplômants.
          </p>
        </div>
        <Reveal delay={0.1}>
          <Button asChild variant="outlineGlow">
            <Link to="/trainings">
              Voir toutes les formations <ArrowUpRight className="h-4 w-4" />
            </Link>
          </Button>
        </Reveal>
      </div>

      {isLoading && (
        <div
          className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3"
          aria-label="Chargement des formations"
        >
          {[0, 1, 2].map((item) => (
            <div key={item} className="glass h-72 animate-pulse rounded-3xl" />
          ))}
        </div>
      )}
      {isError && (
        <div className="glass mt-10 rounded-3xl p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Impossible de charger les formations pour le moment.
          </p>
          <Button variant="glass" className="mt-4" onClick={() => void refetch()}>
            Réessayer
          </Button>
        </div>
      )}
      {!isLoading && !isError && featured.length > 0 && (
        <div className={`mt-14 grid grid-cols-1 gap-4 sm:gap-5 ${catalogGridClass}`}>
          {featured.map((training, index) => {
            const prerequisite = localizedTrainingText(training, training.prerequisites);
            const recognition =
              training.recognitionType === "I_MOTION_CERTIFICATE"
                ? training.certification || "Nom de la certification non renseigné"
                : training.recognitionType === "BTP_DIPLOMA" ||
                    training.recognitionType === "BTS_DIPLOMA"
                  ? training.approvalStatus === "APPROVED"
                    ? "Diplôme homologué"
                    : training.approvalStatus === "PENDING"
                      ? "Homologation en cours"
                      : "Statut d'homologation non renseigné"
                  : "Aucune certification indiquée";
            const accentClass =
              index % 3 === 0
                ? "border-electric/25"
                : index % 3 === 1
                  ? "border-violet/25"
                  : "border-white/10";
            const glowClass = index % 3 === 1 ? "bg-violet/10" : "bg-electric/10";
            const compositionClass =
              index % 3 === 2 ? "rounded-xl border border-white/10 bg-white/3 px-3 py-2" : "";
            const spanClass =
              featured.length === 5 && index >= 3
                ? "md:col-span-3 lg:col-span-3"
                : featured.length === 5
                  ? "md:col-span-2 lg:col-span-2"
                  : "";

            return (
              <Reveal key={training.id} delay={index * 0.06} className={spanClass}>
                <TiltCard max={3} className="h-full">
                  <article
                    className={`glass hover-lift group relative flex h-full                     min-h-72 flex-col overflow-hidden rounded-3xl border ${accentClass} p-5 transition-[border-color,box-shadow,transform] duration-500 hover:-translate-y-1 hover:border-electric/50 hover:shadow-[0_20px_55px_-35px_var(--electric)] sm:p-6`}
                  >
                    <div
                      aria-hidden="true"
                      className={`pointer-events-none absolute -right-12 -top-14 h-40 w-40 rounded-full ${glowClass} blur-3xl transition-opacity duration-500 group-hover:opacity-80`}
                    />
                    <div className="relative flex items-center justify-between gap-3">
                      <span
                        className={`rounded-full border px-3 py-1 text-[0.65rem] uppercase tracking-[0.15em] ${index % 3 === 1 ? "border-violet/30 bg-violet/10 text-violet" : "border-electric/30 bg-electric/10 text-electric"}`}
                      >
                        {trainingCategory(training.axisCode)}
                      </span>
                      <span className="font-mono text-[0.65rem] tracking-[0.16em] text-muted-foreground/75">
                        {String(index + 1).padStart(2, "0")}{" "}
                        <span className="text-electric/70">/</span>{" "}
                        {String(featured.length).padStart(2, "0")}
                      </span>
                    </div>
                    <h3
                      className={`relative mt-6 line-clamp-2                       min-h-13 max-w-[22ch] font-display font-semibold leading-tight ${index === 0 ? "text-2xl" : "text-xl"}`}
                    >
                      {trainingTitle(training)}
                    </h3>
                    <div
                      className={`relative mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground ${compositionClass}`}
                    >
                      <span className="rounded-full border border-white/10 bg-white/3 px-3 py-1.5">
                        {training.durationHours ?? "Volume horaire à définir"}{training.durationHours !== null ? " h" : ""}
                      </span>
                      <span className="h-1 w-1 rounded-full bg-electric/70" aria-hidden="true" />
                      <span className="font-display text-sm font-semibold text-foreground">
                        {formatCatalogMoney(training.price, training.currency)}
                      </span>
                    </div>
                    <div className="relative mt-4 min-h-14 space-y-1.5 border-l border-electric/30 pl-3 text-xs leading-relaxed text-muted-foreground">
                      {prerequisite && (
                        <p className="line-clamp-1">
                          <span className="text-foreground/80">Prérequis · </span>
                          {prerequisite}
                        </p>
                      )}
                      <p className="line-clamp-2">
                        <span className="text-foreground/80">Certification · </span>
                        {recognition}
                      </p>
                    </div>
                    <div className="relative mt-auto flex items-center justify-between gap-3 border-t border-border/70 pt-4">
                      <span className="text-[0.6rem] uppercase tracking-[0.14em] text-muted-foreground">
                        Programme
                      </span>
                      <Button
                        asChild
                        variant="outlineGlow"
                        size="sm"
                        className="min-h-10 gap-1.5 px-4"
                      >
                        <Link to="/trainings/$slug" params={{ slug: training.slug }}>
                          Voir le programme <ArrowUpRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </article>
                </TiltCard>
              </Reveal>
            );
          })}
        </div>
      )}
      {!isLoading && !isError && featured.length === 0 && (
        <div className="glass mt-10 rounded-3xl p-8 text-center text-sm text-muted-foreground">
          Aucune formation n'est publiée pour le moment. Consultez le catalogue ou contactez
          l'académie.
        </div>
      )}
    </section>
  );
}

export function DiplomaPaths() {
  return (
    <section className="mx-auto max-w-6xl px-6 pb-12">
      <Reveal>
        <Link
          to="/btp-bts"
          className="glass hover-lift group flex flex-col gap-6 rounded-3xl border border-electric/20 p-7 transition-colors hover:border-electric/50 md:flex-row md:items-center md:justify-between md:p-9"
        >
          <div className="flex items-start gap-5">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-electric/10 text-electric">
              <GraduationCap className="h-6 w-6" />
            </span>
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-electric">
                Parcours diplômants
              </p>
              <h2 className="mt-2 font-display text-2xl font-semibold">BTP & BTS</h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                Consultez les formations, leurs conditions d'admission et leur statut
                d'homologation.
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-2 text-sm font-medium text-foreground group-hover:text-electric">
            Découvrir les parcours <ArrowUpRight className="h-4 w-4" />
          </span>
        </Link>
      </Reveal>
    </section>
  );
}

export function UpcomingSessions() {
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
  const upcoming = sessions
    .filter((session) => isUpcomingSession(session, trainings))
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .slice(0, 3);

  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-electric">Calendrier</p>
          <h2 className="mt-3 font-display text-[clamp(2rem,4.2vw,3.2rem)] font-semibold">
            Prochaines sessions ouvertes
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Dates, formats, disponibilités et tarifs issus du calendrier de l'académie.
          </p>
        </div>
        <Button asChild variant="outlineGlow">
          <Link to="/sessions">
            Toutes les sessions <ArrowUpRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      {isLoading && <div className="mt-10 h-40 animate-pulse rounded-3xl bg-secondary/50" />}
      {isError && (
        <div className="glass mt-10 rounded-3xl p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Impossible de charger le calendrier pour le moment.
          </p>
          <Button variant="glass" className="mt-4" onClick={() => void refetch()}>
            Réessayer
          </Button>
        </div>
      )}
      {!isLoading && !isError && upcoming.length > 0 && (
        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {upcoming.map((session, index) => {
            const training = trainings.find((item) => item.id === session.trainingId)!;
            return (
              <Reveal key={session.id} delay={index * 0.06}>
                <article className="glass flex h-full flex-col rounded-3xl p-6">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs uppercase tracking-[0.16em] text-electric">
                      {formatCatalogDate(session.startDate)}
                    </span>
                    <span className="rounded-full border border-mint/30 bg-mint/10 px-2.5 py-1 text-xs text-mint">
                      {session.status === "ALMOST_FULL"
                        ? "Dernières places"
                        : `${session.seatsLeft} places`}
                    </span>
                  </div>
                  <h3 className="mt-5 font-display text-lg font-semibold">
                    {trainingTitle(training)}
                  </h3>
                  <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                    <p className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-electric" />
                      {session.locationName || session.city}
                    </p>
                    <p className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-electric" />
                      {localizedSessionMode(session.mode)}
                    </p>
                    <p className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-electric" />
                      {session.seatsLeft} places disponibles
                    </p>
                  </div>
                  <div className="mt-5 flex flex-1 items-end justify-between gap-3 border-t border-border/70 pt-4">
                    <span className="font-display text-lg font-semibold">
                      {formatCatalogMoney(session.price, session.currency)}
                    </span>
                    <Button asChild variant="glass" size="sm">
                      <Link to="/sessions/$id" params={{ id: session.id }}>
                        Voir la session <ArrowUpRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </article>
              </Reveal>
            );
          })}
        </div>
      )}
      {!isLoading && !isError && upcoming.length === 0 && (
        <div className="glass mt-10 rounded-3xl p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Aucune session ouverte à venir n'est publiée actuellement.
          </p>
          <Button asChild variant="glass" className="mt-4">
            <Link to="/contact">Demander des informations</Link>
          </Button>
        </div>
      )}
    </section>
  );
}

export function HomeFaq() {
  const questions = [
    {
      question: "Comment choisir une formation ?",
      answer:
        "Chaque fiche précise le public visé, les prérequis, la durée et la certification lorsqu'elle est renseignée. Vous pouvez aussi contacter l'académie pour être orienté.",
    },
    {
      question: "Où trouver les dates, formats et tarifs ?",
      answer:
        "Les sessions ouvertes affichent leur date, leur lieu, leur format, leurs places disponibles et leur tarif dans le calendrier.",
    },
    {
      question: "Les formations délivrent-elles toutes la même certification ?",
      answer:
        "Non. La reconnaissance dépend du programme. La fiche indique le certificat ou le statut d'homologation associé lorsqu'il est disponible.",
    },
  ];

  return (
    <section className="mx-auto max-w-4xl px-6 py-20">
      <Reveal>
        <p className="text-xs uppercase tracking-[0.3em] text-electric">Informations pratiques</p>
        <h2 className="mt-3 font-display text-[clamp(2rem,4.2vw,3rem)] font-semibold">
          Questions fréquentes
        </h2>
      </Reveal>
      <div className="mt-8 divide-y divide-border/70 border-y border-border/70">
        {questions.map((item) => (
          <details key={item.question} className="group py-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium marker:hidden">
              {item.question}
              <span
                aria-hidden="true"
                className="text-electric transition-transform group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">
              {item.answer}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ CTA --- */

export function FinalCTA() {
  return (
    <section className="relative mx-auto max-w-5xl px-6 py-28 text-center">
      <Reveal>
        <h2 className="font-display text-[clamp(2.4rem,6vw,4.6rem)] font-semibold leading-[1.02]">
          Votre prochain parcours <span className="text-gradient">commence ici</span>
        </h2>
        <p className="mx-auto mt-6 max-w-lg text-sm leading-relaxed text-muted-foreground">
          Consultez les programmes et choisissez une session ouverte adaptée à votre projet.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Magnetic>
            <Button asChild variant="electric" size="lg">
              <Link to="/sessions">Voir les sessions ouvertes</Link>
            </Button>
          </Magnetic>
          <Button asChild variant="glass" size="lg">
            <Link to="/contact">Contacter l'académie</Link>
          </Button>
        </div>
      </Reveal>
    </section>
  );
}
