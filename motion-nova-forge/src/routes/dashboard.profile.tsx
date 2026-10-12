import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DashHeader, Panel, formatDate, statusLabel } from "@/components/dash/Primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { downloadFile, errorMessage } from "@/api/client";
import { registrationService, userService } from "@/services";
import type { Registration, User } from "@/types/domain";

type ProfileFields = Pick<User, "firstName" | "lastName" | "email" | "phone">;

export const Route = createFileRoute("/dashboard/profile")({
  head: () => ({
    meta: [{ title: "Profile — i-Motion Academy" }, { name: "robots", content: "noindex" }],
  }),
  component: Page,
});

function Page() {
  const { user, update } = useAuth();
  const queryClient = useQueryClient();
  const [fields, setFields] = useState<ProfileFields | null>(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const profile = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: () => userService.getProfile(user!.id),
    enabled: Boolean(user?.id),
  });
  const registrations = useQuery({
    queryKey: ["regs", user?.id],
    queryFn: () => registrationService.mine(user!.id),
    enabled: Boolean(user?.id),
  });
  const latestRegistration = registrations.data?.[0];

  useEffect(() => {
    if (profile.data) {
      setFields({
        firstName: profile.data.firstName,
        lastName: profile.data.lastName,
        email: profile.data.email,
        phone: profile.data.phone,
      });
    }
  }, [profile.data]);

  const saveProfile = useMutation({
    mutationFn: (input: ProfileFields) => userService.updateProfile(user!.id, input),
    onSuccess: (updated) => {
      const nextFields = {
        firstName: updated.firstName,
        lastName: updated.lastName,
        email: updated.email,
        phone: updated.phone,
      };
      setFields(nextFields);
      update(updated);
      queryClient.setQueryData(["profile", updated.id], updated);
      setError("");
      setSaved(true);
    },
    onError: (reason: unknown) => {
      setError(errorMessage(reason));
      setSaved(false);
    },
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!fields) return;
    setError("");
    setSaved(false);
    saveProfile.mutate({
      ...fields,
      firstName: fields.firstName.trim(),
      lastName: fields.lastName.trim(),
      email: fields.email.trim(),
      phone: fields.phone?.trim() || null,
    });
  }

  const setField = (field: keyof ProfileFields, value: string) => {
    setFields(
      (current) =>
        current && {
          ...current,
          [field]: field === "phone" && value === "" ? null : value,
        },
    );
    setSaved(false);
  };

  return (
    <>
      <DashHeader title="Profile" subtitle="Manage your personal information." />
      <Panel
        title="Personal information"
        description="Update the details associated with your account."
      >
        {profile.isError ? (
          <p role="alert" className="text-sm text-destructive">
            {errorMessage(profile.error)}
          </p>
        ) : profile.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading your profile…</p>
        ) : !profile.data ? (
          <p role="alert" className="text-sm text-destructive">
            Your profile could not be found.
          </p>
        ) : !fields ? (
          <p className="text-sm text-muted-foreground">Loading your profile…</p>
        ) : (
          <form onSubmit={submit} className="grid gap-5 sm:grid-cols-2">
            <label className="grid gap-2 text-sm">
              First name
              <Input
                autoComplete="given-name"
                maxLength={100}
                required
                value={fields.firstName}
                onChange={(event) => setField("firstName", event.target.value)}
              />
            </label>
            <label className="grid gap-2 text-sm">
              Last name
              <Input
                autoComplete="family-name"
                maxLength={100}
                required
                value={fields.lastName}
                onChange={(event) => setField("lastName", event.target.value)}
              />
            </label>
            <label className="grid gap-2 text-sm">
              Email
              <Input
                autoComplete="email"
                maxLength={200}
                required
                type="email"
                value={fields.email}
                onChange={(event) => setField("email", event.target.value)}
              />
            </label>
            <label className="grid gap-2 text-sm">
              Phone
              <Input
                autoComplete="tel"
                type="tel"
                value={fields.phone ?? ""}
                onChange={(event) => setField("phone", event.target.value)}
              />
            </label>
            <div className="grid gap-2 text-sm">
              <span>Role</span>
              <p className="text-muted-foreground">{statusLabel(user?.role ?? "")}</p>
            </div>
            <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
              <Button type="submit" disabled={saveProfile.isPending}>
                {saveProfile.isPending ? "Saving…" : "Save changes"}
              </Button>
              {saved && (
                <p role="status" className="text-sm text-emerald-500">
                  Profile updated successfully.
                </p>
              )}
              {error && (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              )}
            </div>
          </form>
        )}
      </Panel>
      <Panel
        title="Informations de ma dernière inscription"
        description="Les informations personnelles saisies lors de votre inscription la plus récente."
        className="mt-6"
      >
        {registrations.isError ? (
          <p role="alert" className="text-sm text-destructive">
            Impossible de charger les informations de votre inscription :{" "}
            {errorMessage(registrations.error)}
          </p>
        ) : registrations.isLoading ? (
          <p className="text-sm text-muted-foreground">
            Chargement de vos informations d’inscription…
          </p>
        ) : !latestRegistration ? (
          <p className="text-sm text-muted-foreground">
            Vous n’avez pas encore d’inscription associée à votre compte.
          </p>
        ) : (
          <LatestRegistration registration={latestRegistration} userId={user!.id} />
        )}
      </Panel>
    </>
  );
}

type RegistrationDetails = Pick<
  Registration,
  | "participantName"
  | "participantEmail"
  | "phone"
  | "birthDate"
  | "address"
  | "city"
  | "country"
  | "educationLevel"
  | "workExperience"
  | "employmentStatus"
  | "motivation"
  | "referralSource"
  | "notes"
>;

function LatestRegistration({
  registration,
  userId,
}: {
  registration: Registration;
  userId: string;
}) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [documentError, setDocumentError] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [details, setDetails] = useState<RegistrationDetails>(() => ({
    participantName: registration.participantName,
    participantEmail: registration.participantEmail,
    phone: registration.phone ?? null,
    birthDate: registration.birthDate?.slice(0, 10) ?? null,
    address: registration.address ?? null,
    city: registration.city ?? null,
    country: registration.country ?? null,
    educationLevel: registration.educationLevel ?? null,
    workExperience: registration.workExperience ?? null,
    employmentStatus: registration.employmentStatus ?? null,
    motivation: registration.motivation ?? null,
    referralSource: registration.referralSource ?? null,
    notes: registration.notes ?? null,
  }));
  const update = useMutation({
    mutationFn: () =>
      registrationService.updateOwnDetails(registration.id, {
        ...details,
        participantName: details.participantName.trim(),
        participantEmail: details.participantEmail.trim(),
        phone: details.phone?.trim() || null,
        address: details.address?.trim() || null,
        city: details.city?.trim() || null,
        country: details.country?.trim() || null,
        educationLevel: details.educationLevel?.trim() || null,
        workExperience: details.workExperience?.trim() || null,
        employmentStatus: details.employmentStatus?.trim() || null,
        motivation: details.motivation?.trim() || null,
        referralSource: details.referralSource?.trim() || null,
        notes: details.notes?.trim() || null,
      }),
    onSuccess: (updated) => {
      setDetails({
        participantName: updated.participantName,
        participantEmail: updated.participantEmail,
        phone: updated.phone ?? null,
        birthDate: updated.birthDate?.slice(0, 10) ?? null,
        address: updated.address ?? null,
        city: updated.city ?? null,
        country: updated.country ?? null,
        educationLevel: updated.educationLevel ?? null,
        workExperience: updated.workExperience ?? null,
        employmentStatus: updated.employmentStatus ?? null,
        motivation: updated.motivation ?? null,
        referralSource: updated.referralSource ?? null,
        notes: updated.notes ?? null,
      });
      queryClient.setQueryData<Registration[]>(["regs", userId], (current) =>
        current?.map((item) => (item.id === updated.id ? updated : item)),
      );
      setEditing(false);
      setError("");
      setSaved(true);
    },
    onError: (reason: unknown) => {
      setError(errorMessage(reason));
      setSaved(false);
    },
  });

  function setField(field: keyof RegistrationDetails, value: string) {
    setDetails((current) => ({
      ...current,
      [field]: field === "birthDate" || value === "" ? null : value,
    }));
  }

  async function openDocument(kind: "identity" | "qualification") {
    const tab = window.open("about:blank", "_blank");
    if (!tab) {
      setDocumentError("Autorisez les fenêtres pop-up pour consulter ce document.");
      return;
    }
    setDocumentError("");
    try {
      const file = await downloadFile(`/registrations/${registration.id}/documents/${kind}`);
      const url = URL.createObjectURL(file);
      tab.location.href = url;
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (reason) {
      tab.close();
      setDocumentError(errorMessage(reason));
    }
  }

  function cancelEditing() {
    setDetails({
      participantName: registration.participantName,
      participantEmail: registration.participantEmail,
      phone: registration.phone ?? null,
      birthDate: registration.birthDate?.slice(0, 10) ?? null,
      address: registration.address ?? null,
      city: registration.city ?? null,
      country: registration.country ?? null,
      educationLevel: registration.educationLevel ?? null,
      workExperience: registration.workExperience ?? null,
      employmentStatus: registration.employmentStatus ?? null,
      motivation: registration.motivation ?? null,
      referralSource: registration.referralSource ?? null,
      notes: registration.notes ?? null,
    });
    setEditing(false);
    setError("");
  }

  const rows: [string, string | null | undefined][] = [
    ["Nom complet", details.participantName],
    ["E-mail", details.participantEmail],
    ["Téléphone", details.phone],
    ["Date de naissance", details.birthDate ? formatDate(details.birthDate) : null],
    ["Adresse", details.address],
    ["Ville", details.city],
    ["Pays", details.country],
    ["Niveau d’études", details.educationLevel],
    ["Situation professionnelle", details.employmentStatus],
    ["Expérience professionnelle", details.workExperience],
    ["Motivation", details.motivation],
    ["Comment avez-vous connu l’académie ?", details.referralSource],
    ["Remarques", details.notes],
  ];

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4 text-sm">
        <div>
          <p className="font-medium">{registration.trainingTitle || "Formation"}</p>
          <p className="text-muted-foreground">
            Référence {registration.reference} · Session du{" "}
            {formatDate(registration.sessionStartDate)}
          </p>
        </div>
        <p className="text-muted-foreground">Envoyée le {formatDate(registration.createdAt)}</p>
      </div>
      {editing ? (
        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            setError("");
            update.mutate();
          }}
        >
          <label className="grid gap-2 text-sm">
            Nom complet
            <Input
              required
              maxLength={200}
              value={details.participantName}
              onChange={(event) => setField("participantName", event.target.value)}
            />
          </label>
          <label className="grid gap-2 text-sm">
            E-mail
            <Input
              required
              type="email"
              maxLength={200}
              value={details.participantEmail}
              onChange={(event) => setField("participantEmail", event.target.value)}
            />
          </label>
          <label className="grid gap-2 text-sm">
            Téléphone
            <Input
              type="tel"
              maxLength={40}
              value={details.phone ?? ""}
              onChange={(event) => setField("phone", event.target.value)}
            />
          </label>
          <label className="grid gap-2 text-sm">
            Date de naissance
            <Input
              type="date"
              value={details.birthDate ?? ""}
              onChange={(event) => setField("birthDate", event.target.value)}
            />
          </label>
          <label className="grid gap-2 text-sm sm:col-span-2">
            Adresse
            <Input
              maxLength={300}
              value={details.address ?? ""}
              onChange={(event) => setField("address", event.target.value)}
            />
          </label>
          <label className="grid gap-2 text-sm">
            Ville
            <Input
              maxLength={120}
              value={details.city ?? ""}
              onChange={(event) => setField("city", event.target.value)}
            />
          </label>
          <label className="grid gap-2 text-sm">
            Pays
            <Input
              maxLength={120}
              value={details.country ?? ""}
              onChange={(event) => setField("country", event.target.value)}
            />
          </label>
          <label className="grid gap-2 text-sm">
            Niveau d’études
            <Input
              maxLength={160}
              value={details.educationLevel ?? ""}
              onChange={(event) => setField("educationLevel", event.target.value)}
            />
          </label>
          <label className="grid gap-2 text-sm">
            Situation professionnelle
            <Input
              maxLength={160}
              value={details.employmentStatus ?? ""}
              onChange={(event) => setField("employmentStatus", event.target.value)}
            />
          </label>
          <label className="grid gap-2 text-sm sm:col-span-2">
            Expérience professionnelle
            <Textarea
              rows={3}
              value={details.workExperience ?? ""}
              onChange={(event) => setField("workExperience", event.target.value)}
            />
          </label>
          <label className="grid gap-2 text-sm sm:col-span-2">
            Motivation
            <Textarea
              rows={3}
              value={details.motivation ?? ""}
              onChange={(event) => setField("motivation", event.target.value)}
            />
          </label>
          <label className="grid gap-2 text-sm">
            Comment avez-vous connu l’académie ?
            <Input
              maxLength={80}
              value={details.referralSource ?? ""}
              onChange={(event) => setField("referralSource", event.target.value)}
            />
          </label>
          <label className="grid gap-2 text-sm sm:col-span-2">
            Remarques
            <Textarea
              rows={3}
              value={details.notes ?? ""}
              onChange={(event) => setField("notes", event.target.value)}
            />
          </label>
          <div className="flex flex-wrap gap-3 sm:col-span-2">
            <Button type="submit" disabled={update.isPending}>
              {update.isPending ? "Enregistrement…" : "Enregistrer les modifications"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={cancelEditing}
              disabled={update.isPending}
            >
              Annuler
            </Button>
          </div>
        </form>
      ) : (
        <>
          <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
            {rows.map(([label, value]) => (
              <div key={label} className="min-w-0">
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="mt-1 whitespace-pre-wrap break-words text-sm">
                  {value?.trim() || "—"}
                </dd>
              </div>
            ))}
          </dl>
          <div className="mt-6 border-t border-border/60 pt-5">
            <h3 className="mb-3 text-sm font-medium">Documents transmis</h3>
            <div className="flex flex-wrap gap-3">
              <DocumentButton
                label="Pièce d’identité"
                available={Boolean(registration.identityDocumentAvailable)}
                onClick={() => void openDocument("identity")}
              />
              <DocumentButton
                label="Justificatif de diplôme"
                available={Boolean(registration.qualificationDocumentAvailable)}
                onClick={() => void openDocument("qualification")}
              />
            </div>
            {documentError && (
              <p role="alert" className="mt-3 text-sm text-destructive">
                {documentError}
              </p>
            )}
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <Button
              type="button"
              onClick={() => {
                setEditing(true);
                setSaved(false);
              }}
            >
              Modifier mes informations
            </Button>
            {saved && (
              <p role="status" className="text-sm text-emerald-500">
                Modifications enregistrées.
              </p>
            )}
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
          </div>
        </>
      )}
      {editing && error && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

function DocumentButton({
  label,
  available,
  onClick,
}: {
  label: string;
  available: boolean;
  onClick: () => void;
}) {
  return (
    <Button type="button" variant="outline" disabled={!available} onClick={onClick}>
      {available ? `Voir ${label.toLowerCase()}` : `${label} non transmis`}
    </Button>
  );
}
