import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowRight,
  BookOpen,
  BriefcaseBusiness,
  CalendarDays,
  Mail,
  MapPin,
  Phone,
  Users,
} from "lucide-react";
import { Reveal } from "@/components/fx/Reveal";
import { EmsImage } from "@/components/fx/EmsImage";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { media } from "@/data/media";
import { catalogService, trainerService } from "@/services";
import type { AxisCode, Location, Training } from "@/types/domain";
import {
  isPendingDiploma,
  isPublishableTraining,
  localizedTrainingText,
  trainingTitle,
} from "@/lib/training-catalog";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "À propos d’i-Motion Académie — Notre offre et notre méthode" },
      {
        name: "description",
        content:
          "Découvrez les domaines de formation d’i-Motion Académie, les informations de programme et de reconnaissance publiées, les formateurs et les lieux de session.",
      },
      { property: "og:title", content: "À propos d’i-Motion Académie" },
      {
        property: "og:description",
        content: "L’offre, la méthode et le fonctionnement des formations i-Motion Académie.",
      },
    ],
  }),
  component: About,
});

const axisLabels: Record<AxisCode, string> = {
  EMS: "EMS",
  SPORT_COACHING: "Sport et coaching",
  WELLNESS: "Bien-être et nutrition",
  LANGUAGES: "Langues",
  MANAGEMENT: "Gestion",
  AI: "Intelligence artificielle",
  BTP: "BTP",
  BTS: "BTS",
};

const clubCities = [
  "Ariana",
  "Ennasr",
  "Les Berges du Lac 1",
  "Aouina",
  "Bardo",
  "Boumhal",
  "Hammamet",
  "Sousse",
];

const clubTechnologies = ["I Motion", "I Model", "I Shape", "I Face Esthétique"];

function certificationDetails(training: Training): string {
  if (training.approvalStatus === "PENDING")
    return "Homologation en attente, selon la fiche publiée.";
  if (training.approvalStatus === "APPROVED")
    return "Homologation indiquée comme approuvée dans la fiche publiée.";

  switch (training.recognitionType) {
    case "I_MOTION_CERTIFICATE":
      return "Certificat i-Motion indiqué dans la fiche publiée.";
    case "BTP_DIPLOMA":
      return "Diplôme BTP indiqué dans la fiche publiée.";
    case "BTS_DIPLOMA":
      return "Diplôme BTS indiqué dans la fiche publiée.";
    default:
      return "Aucune certification ou reconnaissance n’est indiquée dans la fiche publiée.";
  }
}

function physicalLocationLabel(location: Location): string {
  return [location.name, location.city, location.country].filter(Boolean).join(" · ");
}

function hasReliableCoordinates(
  location: Location,
): location is Location & { latitude: number; longitude: number } {
  return (
    typeof location.latitude === "number" &&
    Number.isFinite(location.latitude) &&
    location.latitude >= -90 &&
    location.latitude <= 90 &&
    typeof location.longitude === "number" &&
    Number.isFinite(location.longitude) &&
    location.longitude >= -180 &&
    location.longitude <= 180
  );
}

function openStreetMapEmbedUrl(location: Location): string | null {
  if (!hasReliableCoordinates(location)) return null;

  const { latitude, longitude } = location;
  const bbox = [longitude - 0.01, latitude - 0.01, longitude + 0.01, latitude + 0.01].join(",");
  return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${latitude}%2C${longitude}`;
}

function LocationDetails({ location, index }: { location: Location; index: number }) {
  const [open, setOpen] = useState(false);
  const mapUrl = openStreetMapEmbedUrl(location);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className={`group flex w-full items-start gap-4 py-5 text-left transition-colors hover:text-cyan focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric focus-visible:ring-offset-4 focus-visible:ring-offset-background ${index === 0 ? "pt-0" : ""}`}
        >
          <span className="mt-0.5 font-display text-xs tabular-nums text-electric">
            {String(index + 1).padStart(2, "0")}
          </span>
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-violet" aria-hidden="true" />
          <span className="min-w-0 flex-1">
            <span className="block font-display text-lg font-medium">
              {physicalLocationLabel(location)}
            </span>
            {location.address && (
              <span className="mt-1 block break-words text-sm text-muted-foreground">
                {location.address}
              </span>
            )}
          </span>
          <span className="shrink-0 self-center text-xs uppercase tracking-[0.16em] text-cyan opacity-75 transition-opacity group-hover:opacity-100">
            Détails
          </span>
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[min(88dvh,52rem)] max-w-2xl overflow-y-auto border-white/10 bg-background/95 p-0 shadow-[0_0_80px_-24px_color-mix(in_oklab,var(--electric)_45%,transparent)] backdrop-blur-xl sm:rounded-2xl">
        <div className="p-6 pr-14 sm:p-8 sm:pr-16">
          <DialogHeader className="text-left">
            <p className="text-xs uppercase tracking-[0.25em] text-cyan">
              Présence · Lieu physique
            </p>
            <DialogTitle className="mt-2 font-display text-2xl font-semibold sm:text-3xl">
              {location.name}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {[location.city, location.country].filter(Boolean).join(" · ")}
            </DialogDescription>
          </DialogHeader>

          <dl className="mt-7 grid gap-5 border-y border-white/10 py-6 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <dt className="text-[0.65rem] uppercase tracking-[0.2em] text-electric">Adresse</dt>
              <dd className="mt-1 break-words text-sm leading-relaxed">
                {location.address || "Aucune adresse renseignée."}
              </dd>
            </div>
            <div>
              <dt className="text-[0.65rem] uppercase tracking-[0.2em] text-electric">Ville</dt>
              <dd className="mt-1 text-sm">{location.city}</dd>
            </div>
            <div>
              <dt className="text-[0.65rem] uppercase tracking-[0.2em] text-electric">Pays</dt>
              <dd className="mt-1 text-sm">{location.country}</dd>
            </div>
            <div>
              <dt className="text-[0.65rem] uppercase tracking-[0.2em] text-electric">
                Type de lieu
              </dt>
              <dd className="mt-1 text-sm">
                {location.type === "PHYSICAL" ? "Lieu physique" : "En ligne"}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-[0.65rem] uppercase tracking-[0.2em] text-electric">Contact</dt>
              <dd className="mt-2 space-y-2 text-sm">
                {location.contactName && <p>{location.contactName}</p>}
                {location.contactPhone && (
                  <a
                    href={`tel:${location.contactPhone}`}
                    className="flex w-fit items-center gap-2 text-muted-foreground transition-colors hover:text-cyan"
                  >
                    <Phone className="h-4 w-4" aria-hidden="true" />
                    {location.contactPhone}
                  </a>
                )}
                {location.contactEmail && (
                  <a
                    href={`mailto:${location.contactEmail}`}
                    className="flex w-fit items-center gap-2 break-all text-muted-foreground transition-colors hover:text-cyan"
                  >
                    <Mail className="h-4 w-4 shrink-0" aria-hidden="true" />
                    {location.contactEmail}
                  </a>
                )}
                {!location.contactName && !location.contactPhone && !location.contactEmail && (
                  <p className="text-muted-foreground">Aucun contact renseigné.</p>
                )}
              </dd>
            </div>
          </dl>

          {open && mapUrl && (
            <div className="overflow-hidden rounded-xl border border-white/10 bg-surface">
              <iframe
                title={`Carte OpenStreetMap — ${location.name}`}
                src={mapUrl}
                loading="lazy"
                referrerPolicy="no-referrer"
                className="h-64 w-full border-0 sm:h-80"
              />
            </div>
          )}
        </div>
        <DialogFooter className="border-t border-white/10 p-4 sm:px-8">
          <DialogClose asChild>
            <Button type="button" variant="glass">
              Fermer
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function About() {
  const {
    data: trainings = [],
    isLoading: trainingsLoading,
    isError: trainingsError,
    refetch: refetchTrainings,
  } = useQuery({
    queryKey: ["about-trainings"],
    queryFn: () => catalogService.trainings(),
  });
  const {
    data: trainers = [],
    isLoading: trainersLoading,
    isError: trainersError,
    refetch: refetchTrainers,
  } = useQuery({
    queryKey: ["about-trainers"],
    queryFn: () => trainerService.list(),
  });
  const {
    data: locations = [],
    isLoading: locationsLoading,
    isError: locationsError,
    refetch: refetchLocations,
  } = useQuery({
    queryKey: ["about-locations"],
    queryFn: () => catalogService.locations(),
  });

  const publishedPrograms = trainings.filter(
    (training) =>
      training.axisCode !== "BTP" && training.axisCode !== "BTS" && isPublishableTraining(training),
  );
  const diplomaPrograms = trainings.filter(
    (training) =>
      (training.axisCode === "BTP" || training.axisCode === "BTS") &&
      (isPublishableTraining(training) || isPendingDiploma(training)),
  );
  const recognitionPrograms = Array.from(
    new Map(
      [...publishedPrograms, ...diplomaPrograms].map((training) => [training.id, training]),
    ).values(),
  );
  const programGroups = Array.from(
    publishedPrograms.reduce((groups, training) => {
      const group = groups.get(training.axisCode) ?? [];
      group.push(training);
      groups.set(training.axisCode, group);
      return groups;
    }, new Map<AxisCode, Training[]>()),
  );
  const physicalLocations = locations.filter(
    (location) => location.active !== false && location.type === "PHYSICAL",
  );

  return (
    <div className="w-full overflow-x-clip">
      <header className="relative min-h-[min(780px,92svh)] overflow-hidden border-b border-white/10">
        <EmsImage
          src={media.emsStudio}
          alt="Entraînement accompagné dans un studio EMS"
          priority
          className="absolute inset-0 h-full rounded-none border-0"
          imgClassName="[filter:contrast(1.08)_saturate(0.85)_brightness(0.7)]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background via-background/45 to-background/15"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-background/75 via-transparent to-violet/10"
        />
        <div className="relative mx-auto flex min-h-[min(780px,92svh)] max-w-7xl flex-col justify-between px-6 pb-10 pt-32 sm:px-10 sm:pb-14 lg:px-16">
          <div className="flex items-start justify-between gap-6">
            <p className="text-xs uppercase tracking-[0.32em] text-cyan">À propos de l’académie</p>
            <span className="hidden border-l border-electric/70 pl-4 text-[0.62rem] uppercase leading-relaxed tracking-[0.22em] text-white/60 sm:block">
              i-Motion
              <br />
              Académie
            </span>
          </div>
          <div className="grid gap-8 lg:grid-cols-[1fr_20rem] lg:items-end">
            <div>
              <h1 className="max-w-5xl font-display text-[clamp(3.2rem,10vw,9rem)] font-semibold uppercase leading-[0.82] tracking-[-0.07em]">
                Former
                <br />
                <span className="text-gradient">les pros</span>
                <br />
                du mouvement.
              </h1>
              <p className="mt-7 max-w-2xl text-base leading-relaxed text-white/75 sm:text-lg">
                Découvrez les formations professionnelles publiées par i-Motion Académie, leurs
                informations disponibles et les sessions proposées.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 lg:justify-end">
              <Button asChild variant="electric" size="lg">
                <Link to="/trainings">
                  Explorer les formations <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="glass" size="lg">
                <Link to="/sessions">Voir les sessions</Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <section
        id="about-expertise"
        aria-labelledby="about-expertise-title"
        className="relative mx-auto max-w-6xl px-6 pb-28 pt-12 sm:px-10 lg:px-6"
      >
        <Reveal>
          <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-electric">01 / Expertise</p>
              <h2
                id="about-expertise-title"
                className="mt-5 max-w-md font-display text-3xl font-semibold leading-tight sm:text-4xl"
              >
                Expertise et domaines d’intervention
              </h2>
              <p className="mt-5 max-w-sm text-sm leading-relaxed text-muted-foreground">
                Les domaines ci-dessous correspondent aux axes des formations actuellement publiées
                au catalogue ; ils reflètent l’offre visible sur la plateforme.
              </p>
            </div>
            <div className="lg:pt-8">
              {trainingsLoading && (
                <p className="text-sm text-muted-foreground">Chargement des domaines publiés…</p>
              )}
              {trainingsError && (
                <p className="text-sm text-destructive" role="alert">
                  Les domaines ne sont pas disponibles car le catalogue n’a pas pu être chargé.
                </p>
              )}
              {!trainingsLoading && !trainingsError && programGroups.length > 0 && (
                <ul
                  className="grid grid-cols-1 gap-x-8 sm:grid-cols-2"
                  aria-label="Domaines des formations publiées"
                >
                  {programGroups.map(([axis], index) => (
                    <li
                      key={axis}
                      className="group flex items-center gap-4 border-t border-white/10 py-5 transition-colors hover:border-electric/50"
                    >
                      <span className="font-display text-xs tabular-nums text-electric/70">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="font-display text-lg font-medium transition-transform group-hover:translate-x-1 sm:text-xl">
                        {axisLabels[axis]}
                      </span>
                      <ArrowRight
                        className="ml-auto h-4 w-4 text-muted-foreground/40 transition-all group-hover:translate-x-1 group-hover:text-electric"
                        aria-hidden="true"
                      />
                    </li>
                  ))}
                </ul>
              )}
              {!trainingsLoading && !trainingsError && programGroups.length === 0 && (
                <p className="border-t border-white/10 py-5 text-sm text-muted-foreground">
                  Aucun domaine n’est affiché car aucune formation générale n’est actuellement
                  publiée.
                </p>
              )}
              <p className="mt-6 border-l-2 border-violet/60 pl-4 text-sm leading-relaxed text-muted-foreground">
                Les parcours BTP et BTS disposent d’un espace distinct, pour consulter leur
                disponibilité et leur statut.
              </p>
            </div>
          </div>
        </Reveal>
      </section>

      <section
        aria-labelledby="about-club"
        className="relative overflow-hidden border-y border-white/10 bg-[radial-gradient(ellipse_at_80%_15%,color-mix(in_oklab,var(--violet)_17%,transparent),transparent_42%),linear-gradient(115deg,color-mix(in_oklab,var(--electric)_7%,var(--background)),var(--background)_48%,color-mix(in_oklab,var(--violet)_9%,var(--background)))] py-16 sm:py-24"
      >
        <div className="mx-auto max-w-7xl px-6 sm:px-10 lg:px-16">
          <Reveal>
            <div className="mb-10 flex flex-col justify-between gap-5 border-b border-white/10 pb-7 sm:flex-row sm:items-end">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-cyan">
                  Écosystème EMS · Réseau de centres
                </p>
                <h2
                  id="about-club"
                  className="mt-4 font-display text-3xl font-semibold leading-none sm:text-5xl"
                >
                  I Motion Club <span className="text-gradient">Tunisia</span>
                </h2>
              </div>
              <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
                Le Club rassemble les centres spécialisés EMS. L’Académie, distinctement, présente
                les formations professionnelles.
              </p>
            </div>
          </Reveal>

          <div className="grid gap-10 lg:grid-cols-[1.08fr_0.92fr] lg:items-stretch lg:gap-16">
            <Reveal className="relative min-h-[24rem] sm:min-h-[30rem]">
              <EmsImage
                src={media.emsGroup}
                alt="Espace d’entraînement aménagé pour l’EMS"
                className="absolute inset-0 h-full rounded-[2.5rem_0.5rem_2.5rem_0.5rem] border-white/10"
                imgClassName="transition-transform duration-1000 hover:scale-[1.03]"
              />
              <div className="pointer-events-none absolute inset-0 rounded-[2.5rem_0.5rem_2.5rem_0.5rem] bg-gradient-to-t from-background via-background/10 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 px-6 pb-6 sm:px-9 sm:pb-9">
                <div>
                  <p className="text-[0.65rem] uppercase tracking-[0.26em] text-cyan">Réseau EMS</p>
                  <p className="mt-2 font-display text-2xl font-semibold sm:text-3xl">
                    Un écosystème de centres
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <span className="block font-display text-6xl font-semibold leading-none text-gradient sm:text-8xl">
                    8
                  </span>
                  <span className="mt-1 block text-[0.6rem] uppercase tracking-[0.24em] text-white/70">
                    centres
                  </span>
                </div>
              </div>
            </Reveal>

            <div className="flex min-w-0 flex-col justify-center">
              <Reveal>
                <p className="max-w-xl text-lg leading-relaxed text-foreground/90 sm:text-xl">
                  I Motion Club Tunisia est le réseau de 8 centres spécialisés dans l’EMS, avec un
                  accompagnement personnalisé dans un cadre moderne et professionnel.
                </p>
                <p className="mt-5 max-w-xl text-sm leading-relaxed text-muted-foreground">
                  Le Club représente l’écosystème EMS et ses centres. i-Motion Académie présente
                  l’offre de formations professionnelles : deux rôles distincts au sein de cet
                  univers.
                </p>
              </Reveal>

              <div className="mt-10">
                <p className="text-[0.65rem] uppercase tracking-[0.26em] text-electric">
                  Présence en Tunisie
                </p>
                <ul className="mt-4 grid grid-cols-2 gap-x-5 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
                  {clubCities.map((city, index) => (
                    <li
                      key={city}
                      className="flex min-h-12 items-center gap-3 border-t border-white/10 py-3"
                    >
                      <span className="font-display text-[0.6rem] tabular-nums text-violet">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="text-sm text-foreground/85">{city}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-14 grid gap-10 border-t border-white/10 pt-9 lg:grid-cols-[0.72fr_1.28fr] lg:gap-16">
            <div>
              <p className="text-[0.65rem] uppercase tracking-[0.26em] text-electric">
                Technologies
              </p>
              <h3 className="mt-3 max-w-sm font-display text-2xl font-semibold sm:text-3xl">
                Les univers du Club
              </h3>
            </div>
            <ul className="grid grid-cols-1 sm:grid-cols-2">
              {clubTechnologies.map((technology, index) => (
                <li
                  key={technology}
                  className="group flex min-h-16 items-center gap-4 border-b border-white/10 py-4 transition-colors hover:border-electric/50 sm:odd:mr-6 sm:even:ml-6"
                >
                  <span className="font-display text-xs tabular-nums text-violet/80">
                    0{index + 1}
                  </span>
                  <span className="font-display text-lg font-medium sm:text-xl">{technology}</span>
                  <span
                    aria-hidden="true"
                    className="ml-auto h-px w-8 bg-gradient-to-r from-electric/70 to-violet/30 transition-all group-hover:w-14"
                  />
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-8 flex flex-col gap-3 border-l-2 border-cyan/60 pl-5 sm:flex-row sm:items-center sm:gap-8 sm:pl-7">
            <p className="shrink-0 text-xs uppercase tracking-[0.25em] text-cyan">
              Nutrition & suivi
            </p>
            <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
              Une section dédiée à la nutrition et au suivi complète la présentation de l’écosystème
              du Club.
            </p>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="about-method"
        className="relative overflow-hidden border-y border-white/10 bg-gradient-to-br from-violet/10 via-background to-electric/5 py-20 sm:py-24"
      >
        <div className="mx-auto max-w-6xl px-6 sm:px-10 lg:px-6">
          <Reveal>
            <div className="max-w-3xl">
              <p className="text-xs uppercase tracking-[0.28em] text-electric">02 / Pédagogie</p>
              <h2
                id="about-method"
                className="mt-5 font-display text-3xl font-semibold sm:text-4xl"
              >
                Une progression qui part du programme réel.
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                Les contenus varient selon la formation. La plateforme détaille modules et prérequis
                lorsqu’ils sont renseignés ; les sessions précisent ensuite les conditions
                pratiques.
              </p>
            </div>
          </Reveal>
          <div className="relative mt-14 grid gap-10 md:grid-cols-2 md:gap-16">
            <div
              aria-hidden="true"
              className="absolute left-5 top-5 hidden h-px w-[calc(100%-2.5rem)] bg-gradient-to-r from-electric/70 via-violet/50 to-transparent md:block"
            />
            <article className="relative grid grid-cols-[3rem_1fr] gap-4 sm:grid-cols-[4rem_1fr] sm:gap-6">
              <span className="relative z-10 grid h-10 w-10 place-items-center rounded-full border border-electric/60 bg-background text-sm font-semibold text-electric shadow-[0_0_26px_-8px_var(--electric)] sm:h-11 sm:w-11">
                01
              </span>
              <div className="pt-1">
                <BookOpen className="h-5 w-5 text-electric" aria-hidden="true" />
                <h3 className="mt-4 font-display text-xl font-semibold">Comprendre le programme</h3>
                <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                  Objectifs, compétences, prérequis, durée et modules sont à consulter sur la fiche
                  de la formation lorsqu’ils y sont renseignés.
                </p>
              </div>
            </article>
            <article className="relative grid grid-cols-[3rem_1fr] gap-4 sm:grid-cols-[4rem_1fr] sm:gap-6">
              <span className="relative z-10 grid h-10 w-10 place-items-center rounded-full border border-violet/60 bg-background text-sm font-semibold text-cyan shadow-[0_0_26px_-8px_var(--violet)] sm:h-11 sm:w-11">
                02
              </span>
              <div className="pt-1">
                <CalendarDays className="h-5 w-5 text-cyan" aria-hidden="true" />
                <h3 className="mt-4 font-display text-xl font-semibold">Choisir les modalités</h3>
                <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                  La session précise dates, format, lieu, disponibilités et formateurs. La part de
                  théorie et de pratique dépend de chaque programme.
                </p>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="about-programs"
        className="mx-auto max-w-6xl px-6 pb-28 pt-20 sm:px-10 lg:px-6"
      >
        <Reveal>
          <div className="flex flex-col gap-6 border-b border-white/10 pb-7 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-electric">03 / Catalogue</p>
              <h2
                id="about-programs"
                className="mt-4 font-display text-3xl font-semibold sm:text-4xl"
              >
                Formations et publics
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                Les domaines et publics ci-dessous sont tirés des programmes actuellement publiés.
                Vérifiez la fiche de chaque formation pour ses conditions précises.
              </p>
            </div>
            <Button asChild variant="electric">
              <Link to="/trainings">Explorer les formations</Link>
            </Button>
          </div>
        </Reveal>

        {trainingsLoading && (
          <p className="mt-6 text-sm text-muted-foreground">Chargement du catalogue…</p>
        )}
        {trainingsError && (
          <div className="mt-6 border-l-2 border-destructive pl-4" role="alert">
            <p className="text-sm">Impossible de charger les formations depuis la plateforme.</p>
            <Button className="mt-3" variant="glass" onClick={() => void refetchTrainings()}>
              Réessayer
            </Button>
          </div>
        )}
        {!trainingsLoading && !trainingsError && programGroups.length === 0 && (
          <p className="mt-6 border-y border-white/10 py-5 text-sm text-muted-foreground">
            Aucune formation générale n’est actuellement publiée. Consultez le catalogue pour voir
            sa disponibilité.
          </p>
        )}

        <div className="mt-8 grid gap-x-12 md:grid-cols-2">
          {programGroups.map(([axis, programs], index) => (
            <article key={axis} className="border-b border-white/10 py-6 first:pt-0">
              <div className="flex items-baseline gap-4">
                <span className="font-display text-xs tabular-nums text-violet">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="font-display text-lg font-semibold">{axisLabels[axis]}</h3>
              </div>
              <ul className="mt-4 space-y-0 pl-8">
                {programs.map((training) => (
                  <li
                    key={training.id}
                    className="border-t border-white/5 py-3 first:border-0 first:pt-0"
                  >
                    <p className="text-sm font-medium leading-relaxed">{trainingTitle(training)}</p>
                    {training.targetAudience && (
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                        Public :{" "}
                        {localizedTrainingText(training, training.targetAudience) ??
                          training.targetAudience}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <div className="mt-10 grid gap-8 border-y border-white/10 sm:grid-cols-2 sm:gap-0">
          <article className="flex flex-col items-start py-6 sm:pr-8">
            <div className="flex items-center gap-3">
              <BriefcaseBusiness className="h-5 w-5 text-electric" aria-hidden="true" />
              <h3 className="font-display text-lg font-semibold">Parcours BTP</h3>
            </div>
            <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">
              Les formations BTP et leur statut sont présentés séparément dans leur espace dédié.
            </p>
            <Link
              to="/btp-bts"
              className="mt-5 inline-flex items-center gap-2 text-sm text-electric transition-colors hover:text-cyan"
            >
              Consulter les parcours BTP <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </article>
          <article className="flex flex-col items-start border-t border-white/10 py-6 sm:border-l sm:border-t-0 sm:pl-8">
            <div className="flex items-center gap-3">
              <BriefcaseBusiness className="h-5 w-5 text-violet" aria-hidden="true" />
              <h3 className="font-display text-lg font-semibold">Parcours BTS</h3>
            </div>
            <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">
              Les diplômes BTS et leurs informations d’homologation sont consultables dans l’espace
              dédié.
            </p>
            <Link
              to="/btp-bts"
              className="mt-5 inline-flex items-center gap-2 text-sm text-electric transition-colors hover:text-cyan"
            >
              Voir les parcours diplômants <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </article>
        </div>
      </section>

      <section
        aria-labelledby="about-recognition"
        className="mx-auto max-w-6xl px-6 pb-28 pt-12 sm:px-10 lg:px-6"
      >
        <Reveal>
          <div className="grid gap-5 border-l-2 border-electric/60 pl-5 sm:grid-cols-[0.8fr_1.2fr] sm:gap-12 sm:pl-8">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-electric">
                04 / Reconnaissance
              </p>
              <h2
                id="about-recognition"
                className="mt-4 font-display text-2xl font-semibold sm:text-3xl"
              >
                Certifications et reconnaissance
              </h2>
            </div>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">
              Les mentions suivantes reprennent les champs de reconnaissance des fiches publiées.
              Elles ne constituent pas une validation indépendante. Lorsqu’une autorité, une
              référence ou une échéance est renseignée, elle est affichée avec le programme
              concerné.
            </p>
          </div>
        </Reveal>
        {trainingsLoading && (
          <p className="mt-5 text-sm text-muted-foreground">Chargement des statuts…</p>
        )}
        {trainingsError && (
          <p className="mt-5 text-sm text-destructive" role="alert">
            Les statuts ne sont pas disponibles car le catalogue n’a pas pu être chargé.
          </p>
        )}
        {!trainingsLoading && !trainingsError && recognitionPrograms.length === 0 && (
          <p className="mt-6 border-y border-white/10 py-5 text-sm text-muted-foreground">
            Aucune information de certification ou de reconnaissance n’est actuellement publiée.
          </p>
        )}
        <ul className="mt-8 grid gap-x-10 sm:grid-cols-2">
          {recognitionPrograms.map((training, index) => (
            <li key={training.id} className="flex gap-4 border-b border-white/10 py-5 first:pt-0">
              <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full border border-electric/30 bg-electric/5 text-electric">
                <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
              <div>
                <span className="text-[0.62rem] uppercase tracking-[0.18em] text-muted-foreground">
                  {index + 1 < 10 ? `0${index + 1}` : index + 1} · Selon la fiche publiée
                </span>
                <h3 className="mt-1 font-display text-base font-semibold">
                  {trainingTitle(training)}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {certificationDetails(training)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section
        aria-labelledby="about-trainers"
        className="mx-auto max-w-6xl px-6 pb-28 pt-8 sm:px-10 lg:px-6"
      >
        <Reveal>
          <div className="flex flex-col gap-5 border-b border-white/10 pb-7 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-electric">
                05 / Équipe pédagogique
              </p>
              <h2
                id="about-trainers"
                className="mt-4 font-display text-3xl font-semibold sm:text-4xl"
              >
                Les personnes derrière les sessions.
              </h2>
            </div>
            <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
              Profils et expertises proviennent du répertoire des formateurs ; l’expérience n’est
              indiquée que lorsqu’elle est renseignée.
            </p>
          </div>
        </Reveal>
        {trainersLoading && (
          <p className="mt-5 text-sm text-muted-foreground">Chargement des profils…</p>
        )}
        {trainersError && (
          <div className="mt-5 border-l-2 border-destructive pl-4" role="alert">
            <p className="text-sm">Impossible de charger le répertoire des formateurs.</p>
            <Button className="mt-3" variant="glass" onClick={() => void refetchTrainers()}>
              Réessayer
            </Button>
          </div>
        )}
        {!trainersLoading && !trainersError && trainers.length === 0 && (
          <p className="mt-5 border-y border-white/10 py-5 text-sm text-muted-foreground">
            Aucun profil de formateur n’est actuellement publié.
          </p>
        )}
        <div className="mt-9 grid gap-x-7 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {trainers.map((trainer) => (
            <article key={trainer.id} className="group min-w-0">
              {trainer.photoUrl && (
                <EmsImage
                  src={trainer.photoUrl}
                  alt={`Portrait de ${trainer.firstName} ${trainer.lastName}`}
                  className="aspect-[4/3] rounded-[2rem_0.5rem_2rem_0.5rem] border-0"
                  imgClassName="transition-transform duration-700 group-hover:scale-105"
                />
              )}
              {!trainer.photoUrl && (
                <div
                  aria-hidden="true"
                  className="relative grid aspect-[4/3] place-items-center overflow-hidden rounded-[2rem_0.5rem_2rem_0.5rem] border border-white/10 bg-gradient-to-br from-electric/15 via-background to-violet/25"
                >
                  <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(var(--electric)_0.7px,transparent_0.7px)] [background-size:16px_16px]" />
                  <span className="relative font-display text-7xl font-semibold tracking-[-0.08em] text-white/80 sm:text-8xl">
                    {trainer.firstName.charAt(0)}
                    {trainer.lastName.charAt(0)}
                  </span>
                </div>
              )}
              <div className="pt-4">
                <h3 className="font-display text-xl font-semibold sm:text-2xl">
                  {trainer.firstName} {trainer.lastName}
                </h3>
                {trainer.speciality && (
                  <p className="mt-1 text-sm text-electric">{trainer.speciality}</p>
                )}
                {trainer.biography && (
                  <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
                    {trainer.biography}
                  </p>
                )}
                {trainer.expertise.length > 0 && (
                  <ul className="mt-4 flex flex-wrap gap-x-3 gap-y-1.5">
                    {trainer.expertise.map((expertise) => (
                      <li
                        key={expertise}
                        className="border-b border-violet/40 pb-1 text-xs text-muted-foreground"
                      >
                        {expertise}
                      </li>
                    ))}
                  </ul>
                )}
                {trainer.yearsExperience > 0 && (
                  <p className="mt-4 text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground/80">
                    Expérience déclarée · {trainer.yearsExperience} ans
                  </p>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section
        aria-labelledby="about-places"
        className="relative overflow-hidden border-y border-white/10 bg-gradient-to-r from-background via-violet/5 to-background py-20 sm:py-24"
      >
        <div className="mx-auto grid max-w-6xl gap-10 px-6 sm:px-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16 lg:px-6">
          <Reveal>
            <p className="text-xs uppercase tracking-[0.28em] text-electric">06 / Présence</p>
            <h2 id="about-places" className="mt-5 font-display text-3xl font-semibold sm:text-4xl">
              Des lieux répertoriés.
              <br />
              <span className="text-muted-foreground">Des sessions à vérifier.</span>
            </h2>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
              Les adresses physiques actives proviennent du répertoire. Le lieu définitif et le
              format sont ceux de la session sélectionnée.
            </p>
          </Reveal>
          <div className="grid min-w-0 gap-8 sm:grid-cols-[0.78fr_1.22fr] sm:items-center">
            <div
              aria-hidden="true"
              className="relative mx-auto grid aspect-square w-full max-w-[18rem] place-items-center overflow-hidden rounded-full border border-electric/20 bg-[radial-gradient(circle_at_50%_45%,color-mix(in_oklab,var(--electric)_14%,transparent),transparent_60%)]"
            >
              <div className="absolute inset-[12%] rounded-full border border-dashed border-white/15" />
              <div className="absolute inset-[27%] rounded-full border border-violet/25" />
              <div className="absolute inset-[42%] rounded-full border border-cyan/30" />
              <div className="absolute h-px w-full rotate-45 bg-gradient-to-r from-transparent via-electric/35 to-transparent" />
              <div className="absolute h-px w-full -rotate-45 bg-gradient-to-r from-transparent via-violet/35 to-transparent" />
              <span className="relative grid h-16 w-16 place-items-center rounded-full border border-electric/40 bg-background/80 text-electric shadow-[0_0_50px_-8px_var(--electric)]">
                <MapPin className="h-7 w-7" aria-hidden="true" />
              </span>
              <span className="absolute bottom-[13%] text-[0.58rem] uppercase tracking-[0.24em] text-muted-foreground">
                Localisation des sessions
              </span>
            </div>
            <div className="min-w-0">
              {locationsLoading && (
                <p className="text-sm text-muted-foreground">Chargement des lieux…</p>
              )}
              {locationsError && (
                <div className="border-l-2 border-destructive pl-4" role="alert">
                  <p className="text-sm">Impossible de charger les lieux depuis la plateforme.</p>
                  <Button className="mt-3" variant="glass" onClick={() => void refetchLocations()}>
                    Réessayer
                  </Button>
                </div>
              )}
              {!locationsLoading && !locationsError && physicalLocations.length === 0 && (
                <p className="border-y border-white/10 py-5 text-sm text-muted-foreground">
                  Aucun lieu physique actif n’est renseigné dans le répertoire. Les modalités d’une
                  session sont précisées sur sa fiche.
                </p>
              )}
              {physicalLocations.length > 0 && (
                <ul className="divide-y divide-white/10">
                  {physicalLocations.map((location, index) => (
                    <li key={location.id}>
                      <LocationDetails location={location} index={index} />
                    </li>
                  ))}
                </ul>
              )}
              <Link
                to="/sessions"
                className="mt-6 inline-flex items-center gap-2 text-sm text-electric transition-colors hover:text-cyan"
              >
                Vérifier les lieux sur les sessions{" "}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="about-journey"
        className="mx-auto max-w-6xl px-6 pb-28 pt-24 sm:px-10 lg:px-6"
      >
        <Reveal>
          <p className="text-xs uppercase tracking-[0.28em] text-electric">07 / Votre parcours</p>
          <h2 id="about-journey" className="mt-4 font-display text-3xl font-semibold sm:text-4xl">
            Du choix à la demande d’inscription.
          </h2>
        </Reveal>
        <ol className="relative mt-12 grid gap-8 md:grid-cols-3 md:gap-8">
          <div
            aria-hidden="true"
            className="absolute left-5 top-5 hidden h-px w-[calc(66.666%-2.5rem)] bg-gradient-to-r from-electric/70 via-violet/50 to-transparent md:block"
          />
          <li className="relative grid grid-cols-[2.75rem_1fr] gap-4 sm:gap-5">
            <span className="relative z-10 grid h-10 w-10 place-items-center rounded-full border border-electric/60 bg-background font-display text-sm text-electric shadow-[0_0_26px_-8px_var(--electric)]">
              01
            </span>
            <div>
              <h3 className="font-display text-lg font-semibold">Choisir</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Parcourez les formations et vérifiez contenu, prérequis et informations disponibles.
              </p>
              <Link
                to="/trainings"
                className="mt-4 inline-flex items-center gap-2 text-sm text-electric hover:underline"
              >
                Voir les formations <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </li>
          <li className="relative grid grid-cols-[2.75rem_1fr] gap-4 sm:gap-5">
            <span className="relative z-10 grid h-10 w-10 place-items-center rounded-full border border-violet/60 bg-background font-display text-sm text-cyan shadow-[0_0_26px_-8px_var(--violet)]">
              02
            </span>
            <div>
              <h3 className="font-display text-lg font-semibold">Comparer</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Comparez dates, lieux, formats et disponibilités des sessions ouvertes.
              </p>
              <Link
                to="/sessions"
                className="mt-4 inline-flex items-center gap-2 text-sm text-electric hover:underline"
              >
                Voir les sessions <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </li>
          <li className="relative grid grid-cols-[2.75rem_1fr] gap-4 sm:gap-5">
            <span className="relative z-10 grid h-10 w-10 place-items-center rounded-full border border-cyan/50 bg-background font-display text-sm text-cyan">
              03
            </span>
            <div>
              <h3 className="font-display text-lg font-semibold">Demander</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Ouvrez la session choisie pour envoyer votre demande ou posez une question à
                l’académie.
              </p>
              <Link
                to="/contact"
                className="mt-4 inline-flex items-center gap-2 text-sm text-electric hover:underline"
              >
                Contacter l’académie <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </li>
        </ol>
      </section>

      <section
        aria-labelledby="about-contact"
        className="relative isolate overflow-hidden border-t border-white/10 py-20 sm:py-28"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-32 top-1/2 h-[28rem] w-[28rem] -translate-y-1/2 rounded-full bg-violet/20 blur-[110px]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-40 bottom-[-10rem] h-[28rem] w-[28rem] rounded-full bg-electric/15 blur-[100px]"
        />
        <div className="pointer-events-none absolute inset-0 -z-10 opacity-25 [background-image:linear-gradient(to_right,color-mix(in_oklab,var(--electric)_20%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklab,var(--violet)_20%,transparent)_1px,transparent_1px)] [background-size:56px_56px] [mask-image:linear-gradient(to_bottom,transparent,black_25%,black_85%,transparent)]" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-6 sm:px-10 lg:grid-cols-[1fr_auto] lg:gap-16 lg:px-6">
          <Reveal>
            <div>
              <p className="flex items-center gap-3 text-xs uppercase tracking-[0.28em] text-electric">
                <Users className="h-4 w-4" aria-hidden="true" />
                08 / Prochaine étape
              </p>
              <h2
                id="about-contact"
                className="mt-5 max-w-3xl font-display text-4xl font-semibold leading-[0.98] sm:text-5xl lg:text-6xl"
              >
                Votre prochain mouvement commence ici.
              </h2>
              <p className="mt-5 max-w-xl text-sm leading-relaxed text-muted-foreground">
                Explorez les programmes et leur calendrier. Pour une question sur votre projet,
                l’académie est à votre écoute.
              </p>
            </div>
          </Reveal>
          <Reveal delay={0.12} className="flex flex-wrap gap-3 lg:max-w-[16rem] lg:justify-end">
            <Button asChild variant="electric" size="lg" className="w-full sm:w-auto">
              <Link to="/trainings">Formations</Link>
            </Button>
            <Button asChild variant="glass" size="lg" className="w-full sm:w-auto">
              <Link to="/btp-bts">BTP & BTS</Link>
            </Button>
            <Button asChild variant="glass" size="lg" className="w-full sm:w-auto">
              <Link to="/sessions">Sessions</Link>
            </Button>
            <Button asChild variant="glass" size="lg" className="w-full sm:w-auto">
              <Link to="/contact">Contacter l’académie</Link>
            </Button>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
