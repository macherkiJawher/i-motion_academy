import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays, MapPin, Users } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import {
  EmptyState,
  LoadingRows,
  Panel,
  StatusBadge,
  formatDate,
  formatMoney,
  statusLabel,
  statusTone,
} from "@/components/dash/Primitives";
import { useAuth } from "@/hooks/useAuth";
import { catalogService, sessionService } from "@/services";
import { registrationService } from "@/services";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { isPublishableTraining, isUpcomingSession, trainingTitle } from "@/lib/training-catalog";

const REFERRAL_SOURCES = [
  "Facebook",
  "Instagram",
  "LinkedIn",
  "TikTok",
  "Ami(e)",
  "Famille",
  "Affiche publicitaire",
  "Google / Internet",
] as const;
const EDUCATION_LEVELS = [
  "Collège",
  "Lycée",
  "Baccalauréat",
  "Bac+1",
  "Bac+2",
  "Bac+3 ou plus",
  "Autre",
] as const;
const EMPLOYMENT_STATUSES = [
  "Étudiant(e)",
  "Salarié(e)",
  "Demandeur(euse) d'emploi",
  "Indépendant(e)",
  "Sans emploi",
  "Autre",
] as const;
type RegistrationSubmission = Omit<
  Parameters<typeof registrationService.create>[0],
  "userId" | "sessionId"
> & {
  identityFile?: File;
  qualificationFile?: File;
};

function modeName(mode: "On-site" | "Hybrid" | "Live online") {
  if (mode === "On-site") return "Présentiel";
  if (mode === "Hybrid") return "Hybride";
  return "À distance";
}

function OpenStreetMap({
  latitude,
  longitude,
  label,
}: {
  latitude: number;
  longitude: number;
  label: string;
}) {
  const delta = 0.008;
  const bbox = `${longitude - delta},${latitude - delta},${longitude + delta},${latitude + delta}`;
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${latitude},${longitude}&zoom=12`;

  return (
    <div className="mt-6 overflow-hidden rounded-2xl border border-border/70">
      <iframe
        title={`Carte de ${label}`}
        src={mapUrl}
        className="h-64 w-full border-0"
        loading="lazy"
      />
      <div className="flex items-center justify-between gap-3 border-t border-border/70 px-3 py-2 text-[0.68rem] text-muted-foreground">
        <span>© Contributeurs OpenStreetMap</span>
        <a
          href={`https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=16/${latitude}/${longitude}`}
          target="_blank"
          rel="noreferrer"
          className="text-electric hover:underline"
        >
          Ouvrir la carte
        </a>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/sessions/$id")({
  head: () => ({
    meta: [
      { title: "Détails de la session — i-Motion Academy" },
      {
        name: "description",
        content: "Consultez les dates, le lieu, les disponibilités et le tarif de cette session.",
      },
      { property: "og:title", content: "Détails de la session — i-Motion Academy" },
      {
        property: "og:description",
        content: "Consultez les dates, le lieu, les disponibilités et le tarif de cette session.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SessionDetail,
});

function SessionDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ["sessions", id],
    queryFn: () => sessionService.get(id),
  });
  const { data: trainings = [], isLoading: trainingsLoading } = useQuery({
    queryKey: ["trainings"],
    queryFn: () => catalogService.trainings(),
  });
  const training = data ? trainings.find((item) => item.id === data.trainingId) : undefined;
  const registration = useMutation({
    mutationFn: async (input: RegistrationSubmission) => {
      const { identityFile, qualificationFile, ...fields } = input;
      const created = await registrationService.create({
        ...fields,
        ...(user ? { userId: user.id } : {}),
        sessionId: id,
      });
      if (identityFile instanceof File || qualificationFile instanceof File) {
        const documents = new FormData();
        if (identityFile instanceof File) documents.append("identityDocument", identityFile);
        if (qualificationFile instanceof File)
          documents.append("qualificationDocument", qualificationFile);
        await registrationService.uploadDocuments(created.id, documents);
      }
      return created;
    },
    onSuccess: () => {
      setSubmitted(true);
      setFormError(null);
      void queryClient.invalidateQueries({ queryKey: ["sessions", id] });
      void queryClient.invalidateQueries({ queryKey: ["sessions"] });
      void queryClient.invalidateQueries({ queryKey: ["regs", user?.id] });
    },
    onError: () =>
      setFormError(
        "La demande d'inscription n'a pas pu être envoyée. Réessayez ou contactez l'académie.",
      ),
  });

  if (isLoading || trainingsLoading)
    return (
      <div className="mx-auto max-w-4xl px-4 pt-40">
        <LoadingRows rows={4} />
      </div>
    );
  if (!data || !training || !isPublishableTraining(training) || !isUpcomingSession(data, trainings))
    return (
      <div className="mx-auto max-w-4xl px-4 pt-40">
        <EmptyState
          title="Session indisponible"
          description="Cette session n'est pas ouverte à l'inscription ou son programme n'est plus publié."
          action={
            <Button asChild variant="electric">
              <Link to="/sessions">Retour au calendrier</Link>
            </Button>
          }
        />
      </div>
    );

  const sessionLocations = data.locations?.length
    ? data.locations
    : data.locationName
      ? [
          {
            id: data.locationId,
            name: data.locationName,
            city: data.city,
            address: data.address ?? "",
            latitude: data.latitude,
            longitude: data.longitude,
          },
        ]
      : [];
  const sessionTrainers = data.trainers?.length
    ? data.trainers.map((trainer) => `${trainer.firstName} ${trainer.lastName}`)
    : data.trainerName
      ? [data.trainerName]
      : [];

  return (
    <>
      <PageHeader
        eyebrow="Session"
        title={trainingTitle(training)}
        description={`${sessionLocations.map((location) => [location.name, location.city].filter(Boolean).join(", ")).join(" · ") || "Lieu à confirmer"} · ${modeName(data.mode)} · ${formatDate(data.startDate)} → ${formatDate(data.endDate)}`}
      />
      <section className="mx-auto grid w-full max-w-5xl gap-6 px-4 pb-24 lg:grid-cols-[1.6fr_1fr]">
        <Panel title="Informations pratiques">
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-electric" /> {formatDate(data.startDate)} →{" "}
              {formatDate(data.endDate)} · {data.startTime.slice(0, 5)}–{data.endTime.slice(0, 5)}
            </li>
            {sessionLocations.length > 0 ? (
              sessionLocations.map((location) => (
                <li key={location.id ?? location.name} className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-electric" />
                  <span>
                    {[location.name, location.city].filter(Boolean).join(", ")}
                    {location.address ? (
                      <span className="block text-xs">{location.address}</span>
                    ) : null}
                  </span>
                </li>
              ))
            ) : (
              <li className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-electric" /> Lieu à confirmer
              </li>
            )}
            <li className="flex items-center gap-2">
              <Users className="h-4 w-4 text-electric" /> {data.seatsLeft} places disponibles sur{" "}
              {data.capacity}
            </li>
          </ul>
          {sessionTrainers.length > 0 && (
            <p className="mt-6 text-sm text-muted-foreground">
              {sessionTrainers.length > 1 ? "Formateurs" : "Formateur"} ·{" "}
              {sessionTrainers.join(", ")}
            </p>
          )}
          {data.scheduleDetails && (
            <p className="mt-5 whitespace-pre-line text-sm text-muted-foreground">
              Calendrier détaillé · {data.scheduleDetails}
            </p>
          )}
          {data.meetingUrl && (
            <p className="mt-5 text-sm">
              <a
                href={data.meetingUrl}
                target="_blank"
                rel="noreferrer"
                className="text-electric hover:underline"
              >
                Rejoindre la session à distance
              </a>
            </p>
          )}
          {(data.mode === "Hybrid" || data.mode === "Live online") && !data.meetingUrl && (
            <p className="mt-5 text-sm text-muted-foreground">
              Le lien de visioconférence sera communiqué par l’académie après confirmation de
              l’inscription.
            </p>
          )}
          {sessionLocations.some(
            (location) =>
              typeof location.latitude === "number" && typeof location.longitude === "number",
          ) && (
            <div className="mt-5 space-y-4">
              {sessionLocations.map(
                (location) =>
                  typeof location.latitude === "number" &&
                  typeof location.longitude === "number" && (
                    <OpenStreetMap
                      key={location.id ?? location.name}
                      latitude={location.latitude}
                      longitude={location.longitude}
                      label={location.name}
                    />
                  ),
              )}
            </div>
          )}
          {(data.certification || training.certification) && (
            <p className="mt-2 text-sm text-muted-foreground">
              Certification · {data.certification || training.certification}
            </p>
          )}
        </Panel>
        <Panel title="Inscription">
          <StatusBadge tone={statusTone(data.status)}>{statusLabel(data.status)}</StatusBadge>
          <p className="mt-4 font-display text-3xl font-semibold">
            {formatMoney(data.price, data.currency)}
          </p>
          {submitted ? (
            <div className="mt-6 rounded-2xl border border-mint/30 bg-mint/10 p-4 text-sm text-mint">
              Inscription envoyée. L'académie va examiner votre demande prochainement.
            </div>
          ) : !user ? (
            <div className="mt-6 space-y-3">
              <p className="text-sm text-muted-foreground">
                Connectez-vous pour poursuivre votre inscription à cette session.
              </p>
              <Button asChild variant="electric" className="w-full">
                <Link to="/login" search={{ returnTo: `/sessions/${id}` }}>
                  Se connecter pour s'inscrire
                </Link>
              </Button>
            </div>
          ) : (
            <RegistrationForm
              user={user}
              disabled={
                data.status === "FULL" ||
                data.status === "CLOSED" ||
                data.lifecycleStatus === "CANCELLED" ||
                data.lifecycleStatus === "COMPLETED" ||
                registration.isPending
              }
              error={formError}
              onSubmit={(input) => registration.mutate(input)}
            />
          )}
          <div className="mt-4 flex flex-col gap-2">
            <Button asChild variant="glass">
              <Link to="/trainings/$slug" params={{ slug: training.slug }}>
                Voir la formation
              </Link>
            </Button>
          </div>
        </Panel>
      </section>
    </>
  );
}

function RegistrationForm({
  user,
  disabled,
  error,
  onSubmit,
}: {
  user: { firstName: string; lastName: string; email: string; phone: string | null } | null;
  disabled: boolean;
  error: string | null;
  onSubmit: (input: RegistrationSubmission) => void;
}) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const identityFile = form.get("identityDocument");
    const qualificationFile = form.get("qualificationDocument");
    onSubmit({
      firstName: String(form.get("firstName") ?? ""),
      lastName: String(form.get("lastName") ?? ""),
      email: String(form.get("email") ?? ""),
      phone: String(form.get("phone") ?? ""),
      birthDate: String(form.get("birthDate") ?? ""),
      address: String(form.get("address") ?? ""),
      city: String(form.get("city") ?? ""),
      country: String(form.get("country") ?? ""),
      educationLevel: String(form.get("educationLevel") ?? ""),
      workExperience: String(form.get("workExperience") ?? ""),
      employmentStatus: String(form.get("employmentStatus") ?? ""),
      ...(identityFile instanceof File ? { identityFile } : {}),
      ...(qualificationFile instanceof File ? { qualificationFile } : {}),
      motivation: String(form.get("motivation") ?? ""),
      referralSource: String(form.get("referralSource") ?? ""),
    });
  }

  return (
    <form className="mt-6 space-y-6" onSubmit={submit}>
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-electric">
          Informations personnelles
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <input
            name="firstName"
            required
            placeholder="Prénom"
            defaultValue={user?.firstName ?? ""}
            className="h-10 rounded-xl border border-border bg-background px-3 text-sm"
          />
          <input
            name="lastName"
            required
            placeholder="Nom"
            defaultValue={user?.lastName ?? ""}
            className="h-10 rounded-xl border border-border bg-background px-3 text-sm"
          />
          <input
            name="email"
            type="email"
            required
            placeholder="Adresse e-mail"
            defaultValue={user?.email ?? ""}
            className="h-10 rounded-xl border border-border bg-background px-3 text-sm"
          />
          <input
            name="phone"
            placeholder="Téléphone"
            defaultValue={user?.phone ?? ""}
            className="h-10 rounded-xl border border-border bg-background px-3 text-sm"
          />
          <label className="text-xs text-muted-foreground">
            Date de naissance
            <input
              name="birthDate"
              type="date"
              required
              className="mt-1 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
            />
          </label>
        </div>
      </div>
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-electric">Adresse</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <input
            name="address"
            required
            placeholder="Adresse complète"
            className="h-10 rounded-xl border border-border bg-background px-3 text-sm sm:col-span-2"
          />
          <input
            name="city"
            required
            placeholder="Ville"
            className="h-10 rounded-xl border border-border bg-background px-3 text-sm"
          />
          <input
            name="country"
            required
            placeholder="Pays"
            className="h-10 rounded-xl border border-border bg-background px-3 text-sm"
          />
        </div>
      </div>
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-electric">Parcours</p>
        <div className="mt-3 grid gap-3">
          <select
            name="educationLevel"
            required
            defaultValue=""
            className="h-10 rounded-xl border border-border bg-background px-3 text-sm"
          >
            <option value="" disabled>
              Niveau d'études
            </option>
            {EDUCATION_LEVELS.map((level) => (
              <option key={level}>{level}</option>
            ))}
          </select>
          <select
            name="employmentStatus"
            required
            defaultValue=""
            className="h-10 rounded-xl border border-border bg-background px-3 text-sm"
          >
            <option value="" disabled>
              Situation professionnelle
            </option>
            {EMPLOYMENT_STATUSES.map((status) => (
              <option key={status}>{status}</option>
            ))}
          </select>
          <textarea
            name="workExperience"
            required
            placeholder="Expérience professionnelle"
            className="min-h-24 rounded-xl border border-border bg-background px-3 py-2 text-sm"
          />
        </div>
      </div>
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-electric">Documents et motivation</p>
        <div className="mt-3 grid gap-3">
          <label className="text-xs text-muted-foreground">
            Pièce d'identité
            <input
              name="identityDocument"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              required
              className="mt-1 block w-full text-sm"
            />
          </label>
          <label className="text-xs text-muted-foreground">
            CV ou justificatif de diplôme
            <input
              name="qualificationDocument"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              required
              className="mt-1 block w-full text-sm"
            />
          </label>
          <textarea
            name="motivation"
            required
            placeholder="Message de motivation"
            className="min-h-28 rounded-xl border border-border bg-background px-3 py-2 text-sm"
          />
        </div>
      </div>
      <div>
        <label className="text-xs text-muted-foreground">Comment avez-vous connu i-Motion ?</label>
        <select
          name="referralSource"
          required
          defaultValue=""
          className="mt-1 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
        >
          <option value="" disabled>
            Sélectionner une source
          </option>
          {REFERRAL_SOURCES.map((source) => (
            <option key={source}>{source}</option>
          ))}
        </select>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" variant="electric" className="w-full" disabled={disabled}>
        {disabled ? "Envoi..." : "S'inscrire à cette session"}
      </Button>
    </form>
  );
}
