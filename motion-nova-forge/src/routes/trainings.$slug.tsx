import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion, useScroll, useTransform } from "framer-motion";
import { Award, Check, Clock } from "lucide-react";
import { useRef } from "react";
import { Reveal, RevealText } from "@/components/fx/Reveal";
import { Magnetic } from "@/components/fx/Magnetic";
import { Button } from "@/components/ui/button";
import { EmsImage } from "@/components/fx/EmsImage";
import { api } from "@/api/client";
import { catalogService, sessionService } from "@/services";
import type { Training, TrainingSession } from "@/types/domain";
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

interface TrainingFeedback {
  id: string;
  rating: number;
  comment: string;
  feedbackType: string;
  userName: string;
  createdAt: string;
}

const trainingLevelLabels: Record<Training["level"], string> = {
  Foundation: "Fondamental",
  Advanced: "Avancé",
  Master: "Master",
};

const durationUnitLabels: Record<NonNullable<Training["durationUnit"]>, [string, string]> = {
  HOURS: ["heure", "heures"],
  DAYS: ["jour", "jours"],
  WEEKS: ["semaine", "semaines"],
  MONTHS: ["mois", "mois"],
  YEARS: ["an", "ans"],
};

function formatTrainingDuration(training: Training) {
  const unit = training.durationUnit ?? "HOURS";
  const value = training.durationValue ?? training.durationHours;
  if (value == null) return "Durée non renseignée";
  const formattedValue = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(value);
  const [singular, plural] = durationUnitLabels[unit];
  const duration = `${formattedValue} ${value === 1 ? singular : plural}`;

  return unit === "HOURS" || training.durationHours === null
    ? duration
    : `${duration} · ${training.durationHours} h de cours`;
}

export const Route = createFileRoute("/trainings/$slug")({
  loader: async ({ params }) => {
    const [trainings, sessions] = await Promise.all([
      catalogService.trainings(),
      sessionService.list(),
    ]);
    const training = trainings.find((item) => item.slug === params.slug);
    if (!training || !isPublishableTraining(training)) throw notFound();

    const nextSession = sessions
      .filter((session) => session.trainingId === training.id && isUpcomingSession(session, trainings))
      .sort((a, b) => a.startDate.localeCompare(b.startDate))[0] ?? null;

    return { training, nextSession };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Formation indisponible — i-Motion Academy" }, { name: "robots", content: "noindex" }] };
    }
    const t = loaderData.training;
    const title = trainingTitle(t);
    return {
      meta: [
        { title: `${title} — i-Motion Academy` },
        { name: "description", content: localizedTrainingText(t, t.description) ?? title },
        { property: "og:title", content: `${title} — i-Motion Academy` },
        { property: "og:description", content: localizedTrainingText(t, t.description) ?? title },
      ],
    };
  },
  component: TrainingDetail,
});

function TrainingDetail() {
  const { training, nextSession } = Route.useLoaderData() as {
    training: Training;
    nextSession: TrainingSession | null;
  };
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.9], [1, 0]);
  const { data: feedbacks = [] } = useQuery<TrainingFeedback[]>({
    queryKey: ["training-feedback", training.slug],
    queryFn: () => api.get<TrainingFeedback[]>(`/feedback/public/training/${training.slug}`),
    staleTime: 1000 * 60 * 5,
  });
  const title = trainingTitle(training);
  const description = localizedTrainingText(training, training.description)!;
  const tagline = localizedTrainingText(training, training.tagline);
  const targetAudience = localizedTrainingText(training, training.targetAudience);
  const prerequisites = localizedTrainingText(training, training.prerequisites);
  const skills = training.skills
    .map((skill) => localizedTrainingText(training, skill))
    .filter((skill): skill is string => Boolean(skill));
  const objectives = training.objectives ?? [];
  const program = training.program ?? [];
  const visibleFeedbacks = feedbacks.filter((feedback) =>
    localizedTrainingText(training, feedback.comment),
  );

  return (
    <>
      <section ref={heroRef} className="relative overflow-hidden pb-16 pt-40">
        <motion.div
          style={{ y, opacity }}
          className="pointer-events-none absolute inset-x-0 top-10 -z-10 mx-auto h-136 max-w-4xl rounded-full bg-electric/15 blur-[140px]"
        />
        <div className="mx-auto grid max-w-6xl gap-12 px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-16">
          <div>
            <Reveal>
              <div className="flex flex-wrap items-center gap-2">
                <span className="glass rounded-full px-3 py-1.5 text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground">
                  {trainingCategory(training.axisCode)}
                </span>
                {training.recognitionType === "I_MOTION_CERTIFICATE" && training.certification && (
                  <span className="flex items-center gap-1.5 rounded-full bg-mint/15 px-3 py-1.5 text-[0.65rem] uppercase tracking-[0.16em] text-mint">
                    <Award className="h-3 w-3" /> {training.certification}
                  </span>
                )}
              </div>
            </Reveal>

            <h1 className="mt-6 max-w-3xl font-display text-[clamp(2.4rem,6vw,4.4rem)] font-semibold leading-[1.02]">
              <RevealText text={title} />
            </h1>
            <Reveal delay={0.2}>
              <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground">{description}</p>
              {tagline && <p className="mt-3 max-w-xl text-sm font-medium text-electric">{tagline}</p>}
            </Reveal>

            <Reveal delay={0.3}>
              <div className="mt-10 flex flex-wrap items-center gap-8">
                <Magnetic>
                  <Button asChild variant="electric" size="lg">
                    <Link
                      to={nextSession ? "/sessions/$id" : "/sessions"}
                      params={nextSession ? { id: nextSession.id } : undefined}
                    >
                      {nextSession ? "Voir la prochaine session" : "Voir le calendrier"}
                    </Link>
                  </Button>
                </Magnetic>
                <dl className="flex flex-wrap gap-8 text-sm">
                  <div>
                    <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5 text-electric" /> Durée
                    </dt>
                    <dd className="mt-1 font-display font-semibold">{formatTrainingDuration(training)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Niveau</dt>
                    <dd className="mt-1 font-display font-semibold">{trainingLevelLabels[training.level]}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">
                      {nextSession ? "Tarif de la session" : "Tarif indicatif de la formation"}
                    </dt>
                    <dd className="mt-1 font-display font-semibold">
                      {formatCatalogMoney(
                        nextSession?.price ?? training.price,
                        nextSession?.currency ?? training.currency,
                      )}
                    </dd>
                  </div>
                </dl>
              </div>
            </Reveal>
          </div>

          {training.coverUrl && <Reveal delay={0.15}>
            <EmsImage
              src={training.coverUrl}
              alt={title}
              className="aspect-4/3 rounded-[2.5rem] border-border/70"
              priority
            />
          </Reveal>}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-12 lg:grid-cols-[1.6fr_1fr]">
          <div>
            {(targetAudience || prerequisites || training.certification) && (
              <Reveal>
                <div className="grid gap-4 sm:grid-cols-2">
                  {targetAudience && (
                    <div className="glass rounded-3xl p-6">
                      <h2 className="font-display text-lg font-semibold">Public cible</h2>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{targetAudience}</p>
                    </div>
                  )}
                  {prerequisites && (
                    <div className="glass rounded-3xl p-6">
                      <h2 className="font-display text-lg font-semibold">Prérequis</h2>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{prerequisites}</p>
                    </div>
                  )}
                  {training.certification && (
                    <div className="glass rounded-3xl p-6 sm:col-span-2">
                      <h2 className="font-display text-lg font-semibold">Certification</h2>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        {training.certification}
                        {training.approvalStatus === "APPROVED" && " · Homologation approuvée"}
                      </p>
                    </div>
                  )}
                </div>
              </Reveal>
            )}
            {objectives.length > 0 && (
              <Reveal className="mt-10">
                <h2 className="font-display text-2xl font-semibold">Objectifs de la formation</h2>
                <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                  {objectives.map((objective) => (
                    <li key={objective} className="glass flex items-start gap-3 rounded-2xl px-4 py-3 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-mint" /> {objective}
                    </li>
                  ))}
                </ul>
              </Reveal>
            )}
            {program.length > 0 && (
              <Reveal className="mt-10">
                <h2 className="font-display text-2xl font-semibold">Programme</h2>
                <ol className="mt-6 space-y-3">
                  {program.map((module, index) => (
                    <li key={`${module.title}-${index}`} className="glass rounded-2xl p-5">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <h3 className="font-display font-semibold">{module.title}</h3>
                        {module.hours !== undefined && module.hours !== null && (
                          <span className="text-xs text-muted-foreground">{module.hours} h</span>
                        )}
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{module.detail}</p>
                    </li>
                  ))}
                </ol>
              </Reveal>
            )}
            {skills.length > 0 && <Reveal className="mt-10">
              <h2 className="font-display text-2xl font-semibold">Compétences acquises</h2>
              <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                {skills.map((skill) => (
                  <li key={skill} className="glass flex items-center gap-3 rounded-2xl px-4 py-3 text-sm">
                    <Check className="h-4 w-4 shrink-0 text-mint" /> {skill}
                  </li>
                ))}
              </ul>
            </Reveal>}
            <Reveal className="mt-14">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-electric">Retours vérifiés</p>
                  <h2 className="mt-2 font-display text-2xl font-semibold">Avis des participants</h2>
                </div>
                {visibleFeedbacks.length > 0 && (
                  <span className="text-sm text-muted-foreground">{visibleFeedbacks.length} avis approuvé{visibleFeedbacks.length > 1 ? "s" : ""}</span>
                )}
              </div>
              {visibleFeedbacks.length > 0 ? (
                <div className="mt-6 space-y-4">
                  {visibleFeedbacks.map((feedback) => (
                    <article key={feedback.id} className="glass rounded-2xl p-5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <span className="text-sm font-medium">{feedback.userName}</span>
                        <span className="text-sm text-electric">{"★".repeat(feedback.rating)}{"☆".repeat(5 - feedback.rating)}</span>
                      </div>
                      {feedback.comment && <p className="mt-3 text-sm leading-relaxed text-muted-foreground">“{localizedTrainingText(training, feedback.comment)}”</p>}
                      <p className="mt-3 text-xs text-muted-foreground">{new Date(feedback.createdAt).toLocaleDateString("fr-FR")}</p>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="mt-5 text-sm text-muted-foreground">Les premiers avis approuvés apparaîtront ici.</p>
              )}
            </Reveal>
          </div>

          <aside className="lg:sticky lg:top-28 lg:self-start">
            <Reveal>
              <div className="glass-strong rounded-3xl p-7">
                <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Prochaine étape</p>
                <h2 className="mt-4 font-display text-2xl font-semibold">
                  {nextSession ? "Réservez votre place" : "Aucune session ouverte"}
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {nextSession
                    ? `${nextSession.city} · ${localizedSessionMode(nextSession.mode)} · ${formatCatalogDate(nextSession.startDate)}`
                    : "Aucune session ouverte pour le moment. Le tarif affiché est indicatif pour la formation ; il ne correspond pas à une session réservable."}
                </p>
                <Button asChild variant="electric" className="mt-6 w-full">
                  <Link
                    to={nextSession ? "/sessions/$id" : "/sessions"}
                    params={nextSession ? { id: nextSession.id } : undefined}
                  >
                    {nextSession ? "Voir la session" : "Voir le calendrier"}
                  </Link>
                </Button>
              </div>
            </Reveal>
          </aside>
        </div>
      </section>
    </>
  );
}
