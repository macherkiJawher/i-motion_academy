import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { errorMessage } from "@/api/client";
import {
  Cell,
  DashHeader,
  EmptyState,
  ErrorState,
  LoadingRows,
  PaginationControls,
  Panel,
  Row,
  StatusBadge,
  Table,
  formatDate,
  statusLabel,
  statusTone,
} from "@/components/dash/Primitives";
import { useClientPagination } from "@/hooks/useClientPagination";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { catalogService, sessionService, trainerService } from "@/services";
import type { SessionLifecycleStatus, SessionStatus, TrainingSession } from "@/types/domain";
import { isPublishableTraining } from "@/lib/training-catalog";

export const Route = createFileRoute("/admin/sessions")({
  head: () => ({
    meta: [{ title: "Sessions — i-Motion Academy" }, { name: "robots", content: "noindex" }],
  }),
  component: Page,
});

const field =
  "h-10 w-full rounded-xl border border-border/60 bg-secondary/40 px-3 text-sm outline-none focus:border-electric/50";

const STATUSES: SessionStatus[] = ["OPEN", "CLOSED"];
const LIFECYCLE_STATUSES: SessionLifecycleStatus[] = [
  "DRAFT",
  "SCHEDULED",
  "CANCELLED",
  "COMPLETED",
];
const MODES: TrainingSession["mode"][] = ["On-site", "Hybrid", "Live online"];
const MAX_ASSIGNMENTS = 20;

interface FormState {
  trainingId: string;
  trainerIds: string[];
  locationIds: string[];
  preserveLegacyTrainer: boolean;
  preserveLegacyLocation: boolean;
  mode: TrainingSession["mode"];
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  meetingUrl: string;
  scheduleDetails: string;
  capacity: number;
  price: number;
  priceCustomized: boolean;
  status: SessionStatus;
  lifecycleStatus: SessionLifecycleStatus;
}

const EMPTY: FormState = {
  trainingId: "",
  trainerIds: [],
  locationIds: [],
  preserveLegacyTrainer: false,
  preserveLegacyLocation: false,
  mode: "On-site",
  startDate: "",
  endDate: "",
  startTime: "09:00",
  endTime: "17:00",
  meetingUrl: "",
  scheduleDetails: "",
  capacity: 12,
  price: 0,
  priceCustomized: false,
  status: "OPEN",
  lifecycleStatus: "SCHEDULED",
};

interface PickerOption {
  id: string;
  label: string;
  active?: boolean;
}

function MultiSelect({
  title,
  hint,
  options,
  values,
  onChange,
  isLoading,
  isError,
  onRetry,
  legacyValue,
  onClearLegacy,
}: {
  title: string;
  hint: string;
  options: PickerOption[];
  values: string[];
  onChange: (values: string[]) => void;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  legacyValue?: string;
  onClearLegacy?: () => void;
}) {
  return (
    <fieldset className="grid gap-2 sm:col-span-2">
      <legend className="text-xs font-medium text-muted-foreground">{title}</legend>
      <p className="text-xs text-muted-foreground">{hint}</p>
      {legacyValue && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs">
          <span>Valeur historique conservée : {legacyValue}</span>
          {onClearLegacy && (
            <button type="button" className="text-electric hover:underline" onClick={onClearLegacy}>
              Effacer cette ancienne valeur
            </button>
          )}
        </div>
      )}
      <div className="max-h-40 space-y-1 overflow-y-auto rounded-xl border border-border/60 bg-secondary/20 p-2">
        {isLoading ? (
          <p className="px-2 py-3 text-xs text-muted-foreground">Chargement des options…</p>
        ) : isError ? (
          <div className="flex items-center justify-between gap-2 px-2 py-3 text-xs text-destructive">
            <span>La liste n’a pas pu être chargée.</span>
            <button type="button" className="underline" onClick={onRetry}>
              Réessayer
            </button>
          </div>
        ) : options.length === 0 ? (
          <p className="px-2 py-3 text-xs text-muted-foreground">Aucune option disponible.</p>
        ) : (
          options.map((option) => {
            const checked = values.includes(option.id);
            const archived = option.active === false;
            const limitReached = !checked && values.length >= MAX_ASSIGNMENTS;
            return (
              <label
                key={option.id}
                className={`flex items-center gap-2 rounded-lg px-2 py-2 text-sm ${
                  (archived && !checked) || limitReached
                    ? "cursor-not-allowed opacity-50"
                    : "cursor-pointer hover:bg-secondary/70"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={(archived && !checked) || limitReached}
                  onChange={(event) =>
                    onChange(
                      event.target.checked
                        ? [...values, option.id]
                        : values.filter((id) => id !== option.id),
                    )
                  }
                  className="accent-electric"
                />
                <span className="min-w-0 flex-1">{option.label}</span>
                {archived && <span className="text-[0.65rem] text-muted-foreground">Archivé</span>}
              </label>
            );
          })
        )}
      </div>
      <span className="text-[0.7rem] text-muted-foreground">
        {values.length} sélectionné{values.length > 1 ? "s" : ""} · maximum {MAX_ASSIGNMENTS}
      </span>
    </fieldset>
  );
}

function Page() {
  const qc = useQueryClient();
  const {
    data = [],
    isLoading,
    isError: sessionsError,
    refetch: refetchSessions,
  } = useQuery({
    queryKey: ["admin-sessions"],
    queryFn: () => sessionService.adminList(),
  });
  const trainingsQuery = useQuery({
    queryKey: ["admin-trainings"],
    queryFn: () => catalogService.adminTrainings(),
  });
  const trainings = trainingsQuery.data ?? [];
  const eligibleTrainings = trainings.filter(isPublishableTraining);
  const trainersQuery = useQuery({
    queryKey: ["admin-trainers"],
    queryFn: () => trainerService.adminList(),
  });
  const locationsQuery = useQuery({
    queryKey: ["admin-locations"],
    queryFn: () => catalogService.adminLocations(),
  });
  const trainers = trainersQuery.data ?? [];
  const locations = locationsQuery.data ?? [];
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<SessionStatus | SessionLifecycleStatus | "ALL">(
    "ALL",
  );
  const [sortOrder, setSortOrder] = useState<
    "DATE_ASC" | "DATE_DESC" | "FILL_RATE_DESC" | "FILL_RATE_ASC"
  >("DATE_ASC");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TrainingSession | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const normalizedSearch = search.trim().toLocaleLowerCase("fr");
  const visibleSessions = data
    .filter((session) => {
      const locationsText =
        session.locations?.map((location) => location.name).join(" ") ?? session.locationName;
      const trainersText =
        session.trainers
          ?.map((trainer) => `${trainer.firstName} ${trainer.lastName} ${trainer.speciality}`)
          .join(" ") ?? session.trainerName;
      const haystack = [
        session.trainingTitle,
        session.city,
        session.startDate,
        session.endDate,
        session.mode,
        locationsText,
        trainersText,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("fr");
      const lifecycleStatus = session.lifecycleStatus ?? "SCHEDULED";
      return (
        (!normalizedSearch || haystack.includes(normalizedSearch)) &&
        (statusFilter === "ALL" ||
          session.status === statusFilter ||
          lifecycleStatus === statusFilter)
      );
    })
    .sort((first, second) => {
      if (sortOrder === "FILL_RATE_DESC" || sortOrder === "FILL_RATE_ASC") {
        const firstRate = first.capacity > 0 ? first.seatsTaken / first.capacity : 0;
        const secondRate = second.capacity > 0 ? second.seatsTaken / second.capacity : 0;
        return sortOrder === "FILL_RATE_DESC" ? secondRate - firstRate : firstRate - secondRate;
      }
      const dateOrder = first.startDate.localeCompare(second.startDate);
      return sortOrder === "DATE_ASC" ? dateOrder : -dateOrder;
    });
  const pagination = useClientPagination(
    visibleSessions,
    JSON.stringify([search, statusFilter, sortOrder]),
  );

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["admin-sessions"] });
    void qc.invalidateQueries({ queryKey: ["admin-trainings"] });
    void qc.invalidateQueries({ queryKey: ["sessions"] });
    void qc.invalidateQueries({ queryKey: ["analytics"] });
  };

  const referencesLoading = trainersQuery.isLoading || locationsQuery.isLoading;
  const referencesError = trainersQuery.isError || locationsQuery.isError;

  const save = useMutation({
    mutationFn: async (input: FormState) => {
      const training = trainings.find((t) => t.id === input.trainingId);
      const payload: Partial<TrainingSession> = {
        trainingId: input.trainingId,
        mode: input.mode,
        startDate: input.startDate,
        endDate: input.endDate,
        startTime: input.startTime,
        endTime: input.endTime,
        meetingUrl: input.meetingUrl.trim() || null,
        scheduleDetails: input.scheduleDetails.trim() || null,
        capacity: input.capacity,
        price: input.price,
        status: input.status,
        lifecycleStatus: input.lifecycleStatus,
        ...(!input.preserveLegacyTrainer || input.trainerIds.length
          ? { trainerIds: input.trainerIds }
          : {}),
        ...(!input.preserveLegacyLocation || input.locationIds.length
          ? { locationIds: input.locationIds }
          : {}),
        ...(training
          ? {
              trainingId: training.id,
              trainingSlug: training.slug,
              trainingTitle: training.title,
              axisCode: training.axisCode,
              currency: training.currency,
              certification: training.certification,
            }
          : {}),
      };
      return editing ? sessionService.update(editing.id, payload) : sessionService.create(payload);
    },
    onSuccess: () => {
      toast.success(editing ? "Session mise à jour" : "Session créée");
      setOpen(false);
      setEditing(null);
      invalidate();
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const remove = useMutation({
    mutationFn: (id: string) => sessionService.remove(id),
    onSuccess: () => {
      toast.success("Session supprimée");
      invalidate();
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const openCreate = () => {
    setEditing(null);
    const firstTraining = eligibleTrainings[0];
    setForm({
      ...EMPTY,
      trainingId: firstTraining?.id ?? "",
      price: firstTraining?.price ?? 0,
    });
    setOpen(true);
  };

  const openEdit = (s: TrainingSession) => {
    const linkedTrainerIds = s.trainerIds?.length
      ? s.trainerIds
      : s.trainers?.length
        ? s.trainers.map((trainer) => trainer.id)
        : s.trainerId && trainers.some((trainer) => trainer.id === s.trainerId)
          ? [s.trainerId]
          : [];
    const linkedLocationIds = s.locationIds?.length
      ? s.locationIds
      : s.locations?.length
        ? s.locations.map((location) => location.id)
        : s.locationId && locations.some((location) => location.id === s.locationId)
          ? [s.locationId]
          : [];
    setEditing(s);
    setForm({
      trainingId: s.trainingId,
      trainerIds: linkedTrainerIds,
      locationIds: linkedLocationIds,
      preserveLegacyTrainer: linkedTrainerIds.length === 0 && Boolean(s.trainerName),
      preserveLegacyLocation: linkedLocationIds.length === 0 && Boolean(s.locationName),
      mode: s.mode,
      startDate: s.startDate.slice(0, 10),
      endDate: s.endDate.slice(0, 10),
      startTime: s.startTime?.slice(0, 5) ?? "09:00",
      endTime: s.endTime?.slice(0, 5) ?? "17:00",
      meetingUrl: s.meetingUrl ?? "",
      scheduleDetails: s.scheduleDetails ?? "",
      capacity: s.capacity,
      price: s.price,
      priceCustomized:
        s.price !== trainings.find((training) => training.id === s.trainingId)?.price,
      status: s.status === "CLOSED" ? "CLOSED" : "OPEN",
      lifecycleStatus: s.lifecycleStatus ?? "SCHEDULED",
    });
    setOpen(true);
  };

  return (
    <>
      <DashHeader
        title="Sessions"
        subtitle="Planifiez les dates, les lieux, les formateurs et les inscriptions."
        actions={
          <Button variant="electric" size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" /> Nouvelle session
          </Button>
        }
      />
      <Panel>
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Rechercher par formation, lieu, formateur…"
              aria-label="Rechercher une session"
              className={`${field} pl-9`}
            />
          </div>
          <select
            className={`${field} sm:w-52`}
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as SessionStatus | SessionLifecycleStatus | "ALL")
            }
            aria-label="Filtrer par statut"
          >
            <option value="ALL">Tous les statuts</option>
            <option value="OPEN">Ouvertes</option>
            <option value="CLOSED">Fermées</option>
            <option value="DRAFT">Brouillons</option>
            <option value="SCHEDULED">Planifiées</option>
            <option value="CANCELLED">Annulées</option>
            <option value="COMPLETED">Terminées</option>
          </select>
          <select
            className={`${field} sm:w-56`}
            value={sortOrder}
            onChange={(event) =>
              setSortOrder(
                event.target.value as "DATE_ASC" | "DATE_DESC" | "FILL_RATE_DESC" | "FILL_RATE_ASC",
              )
            }
            aria-label="Trier les sessions"
          >
            <option value="DATE_ASC">Date : plus ancienne d’abord</option>
            <option value="DATE_DESC">Date : plus récente d’abord</option>
            <option value="FILL_RATE_DESC">Remplissage : plus élevé d’abord</option>
            <option value="FILL_RATE_ASC">Remplissage : plus faible d’abord</option>
          </select>
        </div>
        {isLoading ? (
          <LoadingRows />
        ) : sessionsError ? (
          <ErrorState
            message="Les sessions n’ont pas pu être chargées."
            onRetry={() => void refetchSessions()}
          />
        ) : visibleSessions.length === 0 ? (
          <EmptyState
            title={data.length ? "Aucun résultat" : "Aucune session enregistrée"}
            description={data.length ? "Modifiez la recherche ou le filtre." : undefined}
          />
        ) : (
          <Table
            head={["Formation", "Dates", "Lieux", "Formateurs", "Places", "Statut", "Actions"]}
          >
            {pagination.items.map((s) => (
              <Row key={s.id}>
                <Cell>{s.trainingTitle}</Cell>
                <Cell>
                  {formatDate(s.startDate)} → {formatDate(s.endDate)}
                </Cell>
                <Cell>
                  {s.locations?.length
                    ? s.locations.map((location) => location.name).join(", ")
                    : s.locationName || "—"}
                </Cell>
                <Cell>
                  {s.trainers?.length
                    ? s.trainers
                        .map((trainer) => `${trainer.firstName} ${trainer.lastName}`)
                        .join(", ")
                    : s.trainerName || "—"}
                </Cell>
                <Cell>
                  {s.seatsTaken}/{s.capacity}
                </Cell>
                <Cell>
                  <div className="flex flex-wrap gap-1">
                    <StatusBadge tone={statusTone(s.status)}>{statusLabel(s.status)}</StatusBadge>
                    {s.lifecycleStatus && s.lifecycleStatus !== "SCHEDULED" && (
                      <StatusBadge tone={statusTone(s.lifecycleStatus)}>
                        {statusLabel(s.lifecycleStatus)}
                      </StatusBadge>
                    )}
                  </div>
                </Cell>
                <Cell>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Modifier la session ${s.trainingTitle}`}
                      onClick={() => openEdit(s)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Supprimer la session ${s.trainingTitle}`}
                      onClick={() => remove.mutate(s.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </Cell>
              </Row>
            ))}
          </Table>
        )}
        {!isLoading && !sessionsError && visibleSessions.length > 0 && (
          <PaginationControls {...pagination} onPageChange={pagination.setPage} />
        )}
      </Panel>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Modifier la session" : "Créer une session"}</DialogTitle>
            <DialogDescription>
              Choisissez la formation, les dates et les ressources associées à cette session.
            </DialogDescription>
          </DialogHeader>
          <form
            className="grid gap-4 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (form.startDate > form.endDate) {
                toast.error("La date de fin doit être postérieure ou égale à la date de début.");
                return;
              }
              if (form.startDate === form.endDate && form.endTime <= form.startTime) {
                toast.error("L’heure de fin doit être postérieure à l’heure de début.");
                return;
              }
              if (editing && form.capacity < editing.seatsTaken) {
                toast.error(
                  `La capacité ne peut pas être inférieure aux ${editing.seatsTaken} inscriptions déjà enregistrées.`,
                );
                return;
              }
              save.mutate(form);
            }}
          >
            <label className="sm:col-span-2 text-xs text-muted-foreground">
              Formation
              <select
                required
                className={field}
                value={form.trainingId}
                onChange={(e) => {
                  const selectedTraining = eligibleTrainings.find(
                    (training) => training.id === e.target.value,
                  );
                  setForm({
                    ...form,
                    trainingId: e.target.value,
                    ...(!form.priceCustomized && selectedTraining
                      ? { price: selectedTraining.price }
                      : {}),
                  });
                }}
              >
                <option value="">Sélectionner une formation</option>
                {(editing &&
                !eligibleTrainings.some((training) => training.id === editing.trainingId)
                  ? [
                      ...eligibleTrainings,
                      trainings.find((training) => training.id === editing.trainingId),
                    ].filter((training): training is (typeof trainings)[number] =>
                      Boolean(training),
                    )
                  : eligibleTrainings
                ).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                    {isPublishableTraining(t) ? "" : " · non publiable (session existante)"}
                  </option>
                ))}
                {trainingsQuery.isError && (
                  <option value="">Erreur de chargement des formations</option>
                )}
              </select>
            </label>
            {trainingsQuery.isError && (
              <p className="sm:col-span-2 text-xs text-destructive">
                Les formations n’ont pas pu être chargées.{" "}
                <button
                  type="button"
                  className="underline"
                  onClick={() => void trainingsQuery.refetch()}
                >
                  Réessayer
                </button>
              </p>
            )}
            <label className="text-xs text-muted-foreground">
              Date de début
              <input
                type="date"
                required
                className={field}
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              />
            </label>
            <label className="text-xs text-muted-foreground">
              Date de fin
              <input
                type="date"
                required
                className={field}
                min={form.startDate || undefined}
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              />
            </label>
            <label className="text-xs text-muted-foreground">
              Heure de début
              <input
                type="time"
                required
                className={field}
                value={form.startTime}
                onChange={(e) => setForm({ ...form, startTime: e.target.value })}
              />
            </label>
            <label className="text-xs text-muted-foreground">
              Heure de fin
              <input
                type="time"
                required
                className={field}
                value={form.endTime}
                onChange={(e) => setForm({ ...form, endTime: e.target.value })}
              />
            </label>
            {(form.mode === "Hybrid" || form.mode === "Live online") && (
              <label className="sm:col-span-2 text-xs text-muted-foreground">
                Lien de visioconférence
                <input
                  type="url"
                  required
                  maxLength={1000}
                  className={field}
                  placeholder="https://..."
                  value={form.meetingUrl}
                  onChange={(e) => setForm({ ...form, meetingUrl: e.target.value })}
                />
              </label>
            )}
            <label className="sm:col-span-2 text-xs text-muted-foreground">
              Calendrier détaillé (jours, horaires et pauses)
              <textarea
                maxLength={4000}
                className="min-h-24 w-full rounded-xl border border-border/60 bg-secondary/40 px-3 py-2 text-sm outline-none focus:border-electric/50"
                placeholder="Ex. lundi et mercredi, 9 h–12 h puis 13 h–16 h"
                value={form.scheduleDetails}
                onChange={(e) => setForm({ ...form, scheduleDetails: e.target.value })}
              />
            </label>
            <MultiSelect
              title="Formateurs"
              hint="Sélectionnez un ou plusieurs formateurs actifs."
              options={trainers.map((trainer) => ({
                id: trainer.id,
                label: `${trainer.firstName} ${trainer.lastName}${trainer.speciality ? ` · ${trainer.speciality}` : ""}`,
                active: trainer.active ?? true,
              }))}
              values={form.trainerIds}
              onChange={(trainerIds) =>
                setForm({ ...form, trainerIds, preserveLegacyTrainer: false })
              }
              isLoading={trainersQuery.isLoading}
              isError={trainersQuery.isError}
              onRetry={() => void trainersQuery.refetch()}
              {...(form.preserveLegacyTrainer && editing?.trainerName
                ? { legacyValue: editing.trainerName }
                : {})}
              onClearLegacy={() => setForm({ ...form, preserveLegacyTrainer: false })}
            />
            <MultiSelect
              title="Lieux"
              hint="Sélectionnez un ou plusieurs lieux actifs. Les informations pratiques proviennent des fiches Lieux."
              options={locations.map((location) => ({
                id: location.id,
                label: `${location.name} · ${location.city}`,
                active: location.active ?? true,
              }))}
              values={form.locationIds}
              onChange={(locationIds) =>
                setForm({ ...form, locationIds, preserveLegacyLocation: false })
              }
              isLoading={locationsQuery.isLoading}
              isError={locationsQuery.isError}
              onRetry={() => void locationsQuery.refetch()}
              {...(form.preserveLegacyLocation && editing
                ? {
                    legacyValue: [editing.locationName, editing.city].filter(Boolean).join(" · "),
                  }
                : {})}
              onClearLegacy={() => setForm({ ...form, preserveLegacyLocation: false })}
            />
            <label className="text-xs text-muted-foreground">
              Format
              <select
                className={field}
                value={form.mode}
                onChange={(e) =>
                  setForm({ ...form, mode: e.target.value as TrainingSession["mode"] })
                }
              >
                {MODES.map((m) => (
                  <option key={m} value={m}>
                    {m === "On-site" ? "Présentiel" : m === "Hybrid" ? "Hybride" : "À distance"}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-muted-foreground">
              Capacité (places)
              <input
                type="number"
                min={1}
                required
                className={field}
                value={form.capacity}
                onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })}
              />
            </label>
            <div className="flex items-center rounded-xl border border-border/60 bg-secondary/20 px-3 text-xs text-muted-foreground">
              {editing
                ? `${editing.seatsTaken} inscription${editing.seatsTaken > 1 ? "s" : ""} déjà enregistrée${editing.seatsTaken > 1 ? "s" : ""} · compteur géré automatiquement`
                : "Le compteur d’inscriptions est géré automatiquement."}
            </div>
            <label className="text-xs text-muted-foreground">
              Prix appliqué à cette session (TND)
              <input
                type="number"
                min={0}
                step="0.01"
                required
                className={field}
                value={form.price}
                onChange={(e) =>
                  setForm({ ...form, price: Number(e.target.value), priceCustomized: true })
                }
              />
              <span className="mt-1 block text-[0.7rem]">
                Tarif formation :{" "}
                {eligibleTrainings.find((training) => training.id === form.trainingId)?.price ??
                  "—"}{" "}
                TND.
                {form.priceCustomized
                  ? " Le tarif de session est personnalisé."
                  : " Le tarif de la formation est repris par défaut."}
              </span>
            </label>
            <label className="text-xs text-muted-foreground">
              État des inscriptions
              <select
                className={field}
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as SessionStatus })}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s === "OPEN" ? "Automatique selon les places" : "Fermée aux inscriptions"}
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-[0.7rem]">
                Ouverte/Presque complète/Complète est calculé selon les inscriptions.
              </span>
            </label>
            <label className="text-xs text-muted-foreground">
              Cycle de vie
              <select
                className={field}
                value={form.lifecycleStatus}
                onChange={(e) =>
                  setForm({
                    ...form,
                    lifecycleStatus: e.target.value as SessionLifecycleStatus,
                  })
                }
              >
                {LIFECYCLE_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status === "DRAFT"
                      ? "Brouillon (non publiée)"
                      : status === "SCHEDULED"
                        ? "Planifiée et publiée"
                        : status === "CANCELLED"
                          ? "Annulée"
                          : "Terminée"}
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-[0.7rem]">
                Brouillon, annulée et terminée : non visibles au public et sans nouvelles
                inscriptions.
              </span>
            </label>
            <DialogFooter className="sm:col-span-2">
              <Button type="button" variant="glass" onClick={() => setOpen(false)}>
                Annuler
              </Button>
              <Button
                type="submit"
                variant="electric"
                disabled={
                  save.isPending ||
                  referencesLoading ||
                  referencesError ||
                  trainingsQuery.isLoading ||
                  trainingsQuery.isError ||
                  (eligibleTrainings.length === 0 && !editing)
                }
              >
                {save.isPending
                  ? "Enregistrement…"
                  : editing
                    ? "Enregistrer les modifications"
                    : "Créer la session"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
