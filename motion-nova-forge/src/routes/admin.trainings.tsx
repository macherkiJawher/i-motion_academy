import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  Cell,
  DashHeader,
  EmptyState,
  LoadingRows,
  PaginationControls,
  Panel,
  Row,
  StatusBadge,
  Table,
  formatMoney,
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
import { catalogService } from "@/services";
import { ApiError, errorMessage } from "@/api/client";
import type {
  ApprovalStatus,
  AxisCode,
  RecognitionType,
  Training,
  TrainingDurationUnit,
  TrainingLifecycleStatus,
  TrainingLevel,
} from "@/types/domain";

export const Route = createFileRoute("/admin/trainings")({
  head: () => ({
    meta: [{ title: "Trainings — i-Motion Academy" }, { name: "robots", content: "noindex" }],
  }),
  component: Page,
});

const field =
  "h-10 w-full rounded-xl border border-border/60 bg-secondary/40 px-3 text-sm outline-none focus:border-electric/50";
const fieldArea =
  "min-h-24 w-full rounded-xl border border-border/60 bg-secondary/40 px-3 py-2 text-sm outline-none focus:border-electric/50";

const AXES: { value: AxisCode; label: string }[] = [
  { value: "SPORT_COACHING", label: "Sport & coaching" },
  { value: "WELLNESS", label: "Bien-être & nutrition" },
  { value: "LANGUAGES", label: "Langues" },
  { value: "BTP", label: "Diplôme BTP" },
  { value: "BTS", label: "Diplôme BTS" },
  { value: "EMS", label: "Électrostimulation (EMS)" },
  { value: "MANAGEMENT", label: "Commerce & Management" },
  { value: "AI", label: "Informatique & intelligence artificielle" },
];

const RECOGNITION_TYPES: { value: RecognitionType; label: string }[] = [
  { value: "NONE", label: "Sans certification" },
  { value: "I_MOTION_CERTIFICATE", label: "Certification i-Motion" },
  { value: "BTP_DIPLOMA", label: "Diplôme BTP" },
  { value: "BTS_DIPLOMA", label: "Diplôme BTS" },
];

const LIFECYCLE_STATUSES: { value: TrainingLifecycleStatus; label: string }[] = [
  { value: "DRAFT", label: "Brouillon" },
  { value: "IN_REVIEW", label: "À valider" },
  { value: "PUBLISHED", label: "Publiée" },
  { value: "ARCHIVED", label: "Archivée" },
];

const DURATION_UNITS: { value: TrainingDurationUnit; label: string }[] = [
  { value: "HOURS", label: "Heures" },
  { value: "DAYS", label: "Jours" },
  { value: "WEEKS", label: "Semaines" },
  { value: "MONTHS", label: "Mois" },
  { value: "YEARS", label: "Années" },
];

const LEVELS: TrainingLevel[] = ["Foundation", "Advanced", "Master"];
const splitLines = (value: string) =>
  value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
const isDiploma = (type: RecognitionType) => type === "BTP_DIPLOMA" || type === "BTS_DIPLOMA";
const recognitionForAxis = (axisCode: AxisCode, current: RecognitionType): RecognitionType => {
  if (axisCode === "BTP") return "BTP_DIPLOMA";
  if (axisCode === "BTS") return "BTS_DIPLOMA";
  return isDiploma(current) ? "NONE" : current;
};
const lifecycleLabel = (status: TrainingLifecycleStatus) =>
  LIFECYCLE_STATUSES.find((item) => item.value === status)?.label ?? status;
const durationUnitLabel = (unit: TrainingDurationUnit) =>
  DURATION_UNITS.find((item) => item.value === unit)?.label.toLowerCase() ?? unit.toLowerCase();

interface TrainingModule {
  title: string;
  detail: string;
  hours?: number | null | undefined;
}

interface FormState {
  title: string;
  description: string;
  targetAudience: string;
  prerequisites: string;
  skills: string;
  objectives: string;
  program: TrainingModule[];
  coverUrl: string;
  axisCode: AxisCode;
  subcategory: string;
  recognitionType: RecognitionType;
  credentialTitle: string;
  credentialIssuer: string;
  approvalStatus: ApprovalStatus;
  approvalReference: string;
  approvalAuthority: string;
  approvalValidUntil: string;
  level: TrainingLevel;
  durationHours: number | null;
  durationValue: number | undefined;
  durationUnit: TrainingDurationUnit;
  price: number;
  tagline: string;
  lifecycleStatus: TrainingLifecycleStatus;
}

type FormField = keyof FormState;
type FormErrors = Partial<Record<FormField, string[]>>;

const API_FIELD_MAP: Record<string, FormField> = {
  title: "title",
  slug: "title",
  axisCode: "axisCode",
  subcategory: "subcategory",
  recognitionType: "recognitionType",
  approvalStatus: "approvalStatus",
  approvalReference: "approvalReference",
  approvalAuthority: "approvalAuthority",
  approvalValidUntil: "approvalValidUntil",
  lifecycleStatus: "lifecycleStatus",
  tagline: "tagline",
  description: "description",
  level: "level",
  durationHours: "durationHours",
  durationValue: "durationValue",
  durationUnit: "durationUnit",
  price: "price",
  currency: "price",
  certification: "credentialTitle",
  credentialTitle: "credentialTitle",
  credentialIssuer: "credentialIssuer",
  targetAudience: "targetAudience",
  prerequisites: "prerequisites",
  skills: "skills",
  objectives: "objectives",
  program: "program",
  coverUrl: "coverUrl",
  active: "lifecycleStatus",
};

function parseServerErrors(error: unknown): { fields: FormErrors; general: string | null } {
  const details = error instanceof ApiError ? error.details : undefined;
  const responseMessage =
    details && typeof details === "object" && "message" in details
      ? (details as { message?: unknown }).message
      : undefined;
  const messages = Array.isArray(responseMessage)
    ? responseMessage.filter((message): message is string => typeof message === "string")
    : typeof responseMessage === "string"
      ? [responseMessage]
      : [errorMessage(error)];
  const fields: FormErrors = {};
  const generalMessages: string[] = [];

  for (const message of messages) {
    const text = message.toLowerCase();
    if (
      text.includes("requires an approval reference, authority and validity date") ||
      text.includes("requires a valid reference, authority and validity date")
    ) {
      for (const field of [
        "approvalReference",
        "approvalAuthority",
        "approvalValidUntil",
      ] as const) {
        fields[field] = [...(fields[field] ?? []), message];
      }
      continue;
    }

    const property = message.match(/^([a-z][a-zA-Z0-9_.]*)\s/i)?.[1]?.split(".")[0];
    const normalizedProperty = property
      ? `${property[0]?.toLowerCase()}${property.slice(1)}`
      : undefined;
    const field = normalizedProperty ? API_FIELD_MAP[normalizedProperty] : undefined;
    if (field) {
      fields[field] = [...(fields[field] ?? []), message];
      continue;
    }

    const inferredField = text.includes("description")
      ? "description"
      : text.includes("credential") || text.includes("certificate")
        ? "credentialTitle"
        : text.includes("duration") || text.includes("teaching hours")
          ? "durationHours"
          : text.includes("price") || text.includes("currency")
            ? "price"
            : text.includes("program module") || text.includes("program")
              ? "program"
              : text.includes("approval") || text.includes("homologation")
                ? "approvalStatus"
                : text.includes("domain") || text.includes("category")
                  ? "axisCode"
                  : null;

    if (inferredField) fields[inferredField] = [...(fields[inferredField] ?? []), message];
    else generalMessages.push(message);
  }

  return { fields, general: generalMessages.length ? generalMessages.join(" ") : null };
}

function FieldErrors({ messages }: { messages?: string[] | undefined }) {
  if (!messages?.length) return null;
  return (
    <span role="alert" className="mt-1 block text-xs leading-relaxed text-destructive">
      {messages.join(" ")}
    </span>
  );
}

const EMPTY: FormState = {
  title: "",
  description: "",
  targetAudience: "",
  prerequisites: "",
  skills: "",
  objectives: "",
  program: [],
  coverUrl: "",
  axisCode: "SPORT_COACHING",
  subcategory: "",
  recognitionType: "NONE",
  credentialTitle: "",
  credentialIssuer: "",
  approvalStatus: "NOT_APPLICABLE",
  approvalReference: "",
  approvalAuthority: "",
  approvalValidUntil: "",
  level: "Foundation",
  durationHours: null,
  durationValue: 16,
  durationUnit: "HOURS",
  price: 900,
  tagline: "",
  lifecycleStatus: "DRAFT",
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

function Page() {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-trainings"],
    queryFn: () => catalogService.adminTrainings(),
  });
  const [search, setSearch] = useState("");
  const [axisFilter, setAxisFilter] = useState<AxisCode | "ALL">("ALL");
  const [statusFilter, setStatusFilter] = useState<TrainingLifecycleStatus | "ALL">("ALL");
  const [editing, setEditing] = useState<Training | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const normalizedSearch = search.trim().toLocaleLowerCase("fr");
  const visibleTrainings = data.filter((training) => {
    const status = training.lifecycleStatus ?? (training.active ? "PUBLISHED" : "ARCHIVED");
    const axisLabel =
      AXES.find((axis) => axis.value === training.axisCode)?.label ?? training.axisCode;
    const haystack = [
      training.title,
      training.slug,
      training.subcategory,
      axisLabel,
      training.tagline,
      training.description,
      training.credentialTitle,
      training.certification,
    ]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase("fr");
    return (
      (!normalizedSearch || haystack.includes(normalizedSearch)) &&
      (axisFilter === "ALL" || training.axisCode === axisFilter) &&
      (statusFilter === "ALL" || status === statusFilter)
    );
  });
  const pagination = useClientPagination(
    visibleTrainings,
    JSON.stringify([search, axisFilter, statusFilter]),
  );
  const inputClass = (name: FormField, base = field) =>
    `${base}${fieldErrors[name]?.length ? " border-destructive focus:border-destructive" : ""}`;

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["admin-trainings"] });
    void qc.invalidateQueries({ queryKey: ["trainings"] });
    void qc.invalidateQueries({ queryKey: ["analytics"] });
  };

  const save = useMutation({
    mutationFn: async (input: FormState) => {
      const {
        skills,
        objectives,
        program,
        credentialTitle,
        credentialIssuer,
        description,
        durationValue,
        ...trainingInput
      } = input;
      const payload: Partial<Training> = {
        ...trainingInput,
        ...(durationValue !== undefined ? { durationValue } : {}),
        ...(description.trim() ? { description: description.trim() } : {}),
        skills: splitLines(skills),
        objectives: splitLines(objectives),
        program,
        credentialTitle: credentialTitle.trim() || null,
        credentialIssuer: credentialIssuer.trim() || null,
        certification: credentialTitle.trim() || null,
        slug: slugify(trainingInput.title),
        approvalReference: trainingInput.approvalReference || null,
        approvalAuthority: trainingInput.approvalAuthority || null,
        approvalValidUntil: trainingInput.approvalValidUntil || null,
        active: trainingInput.lifecycleStatus === "PUBLISHED",
      };
      return editing
        ? catalogService.updateTraining(editing.id, payload)
        : catalogService.createTraining(payload);
    },
    onSuccess: () => {
      toast.success(editing ? "Training updated" : "Training created");
      setOpen(false);
      setEditing(null);
      setFieldErrors({});
      setServerError(null);
      invalidate();
    },
    onError: (error) => {
      const parsed = parseServerErrors(error);
      setFieldErrors(parsed.fields);
      setServerError(parsed.general);
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => catalogService.deleteTraining(id),
    onSuccess: () => {
      toast.success("Training deleted");
      invalidate();
    },
    onError: () => toast.error("Could not delete the training"),
  });

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setFieldErrors({});
    setServerError(null);
    setOpen(true);
  };

  const openEdit = (t: Training) => {
    setEditing(t);
    setFieldErrors({});
    setServerError(null);
    setForm({
      title: t.title,
      description: t.description,
      targetAudience: t.targetAudience,
      prerequisites: t.prerequisites,
      skills: t.skills.join("\n"),
      objectives: t.objectives?.join("\n") ?? "",
      program: t.program ?? [],
      coverUrl: t.coverUrl,
      axisCode: t.axisCode,
      subcategory: t.subcategory,
      recognitionType: t.recognitionType,
      credentialTitle: t.credentialTitle ?? t.certification ?? "",
      credentialIssuer: t.credentialIssuer ?? "",
      approvalStatus: t.approvalStatus,
      approvalReference: t.approvalReference ?? "",
      approvalAuthority: t.approvalAuthority ?? "",
      approvalValidUntil: t.approvalValidUntil?.slice(0, 10) ?? "",
      level: t.level,
      durationHours: t.durationHours,
      durationValue: t.durationValue ?? t.durationHours ?? undefined,
      durationUnit: t.durationUnit ?? "HOURS",
      price: t.price,
      tagline: t.tagline,
      lifecycleStatus: t.lifecycleStatus ?? (t.active ? "PUBLISHED" : "ARCHIVED"),
    });
    setOpen(true);
  };

  return (
    <>
      <DashHeader
        title="Trainings"
        subtitle="You have full control over the catalog: create, edit and delete programs."
        actions={
          <Button variant="electric" size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" /> New training
          </Button>
        }
      />
      <Panel>
        <div className="mb-5 flex flex-col gap-3 sm:flex-row">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Rechercher par nom, domaine, certification…"
              aria-label="Rechercher une formation"
              className={`${field} pl-9`}
            />
          </div>
          <select
            className={`${field} sm:w-56`}
            value={axisFilter}
            onChange={(event) => setAxisFilter(event.target.value as AxisCode | "ALL")}
            aria-label="Filtrer par domaine"
          >
            <option value="ALL">Tous les domaines</option>
            {AXES.map((axis) => (
              <option key={axis.value} value={axis.value}>
                {axis.label}
              </option>
            ))}
          </select>
          <select
            className={`${field} sm:w-48`}
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as TrainingLifecycleStatus | "ALL")
            }
            aria-label="Filtrer par statut"
          >
            <option value="ALL">Tous les statuts</option>
            {LIFECYCLE_STATUSES.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </div>
        {isLoading ? (
          <LoadingRows />
        ) : visibleTrainings.length === 0 ? (
          <EmptyState
            title={data.length ? "Aucun résultat" : "Aucune formation enregistrée"}
            description={data.length ? "Modifiez la recherche ou les filtres." : undefined}
          />
        ) : (
          <Table
            head={[
              "Title",
              "Category",
              "Recognition",
              "Level",
              "Duration",
              "Price",
              "Status",
              "Actions",
            ]}
          >
            {pagination.items.map((t) => (
              <Row key={t.id}>
                <Cell>{t.title}</Cell>
                <Cell>
                  {AXES.find((axis) => axis.value === t.axisCode)?.label ?? t.axisCode}
                  {t.subcategory ? ` · ${t.subcategory}` : ""}
                </Cell>
                <Cell>
                  <StatusBadge
                    tone={
                      t.approvalStatus === "APPROVED"
                        ? "success"
                        : t.approvalStatus === "PENDING"
                          ? "warning"
                          : "neutral"
                    }
                  >
                    {RECOGNITION_TYPES.find((type) => type.value === t.recognitionType)?.label ??
                      t.certification ??
                      t.recognitionType}
                    {t.approvalStatus === "APPROVED"
                      ? " · Homologué"
                      : t.approvalStatus === "PENDING"
                        ? " · En cours"
                        : ""}
                  </StatusBadge>
                </Cell>
                <Cell>{t.level}</Cell>
                <Cell>
                  {t.durationValue ?? t.durationHours ?? "Non renseigné"}{" "}
                  {t.durationValue !== undefined || t.durationHours !== null
                    ? durationUnitLabel(t.durationUnit ?? "HOURS")
                    : ""}
                  {t.durationUnit && t.durationUnit !== "HOURS" && t.durationHours !== null
                    ? ` · ${t.durationHours}h pédagogiques`
                    : ""}
                </Cell>
                <Cell>{formatMoney(t.price, t.currency)}</Cell>
                <Cell>
                  <StatusBadge
                    tone={
                      (t.lifecycleStatus ?? (t.active ? "PUBLISHED" : "ARCHIVED")) === "PUBLISHED"
                        ? "success"
                        : (t.lifecycleStatus ?? "DRAFT") === "IN_REVIEW"
                          ? "warning"
                          : "neutral"
                    }
                  >
                    {lifecycleLabel(t.lifecycleStatus ?? (t.active ? "PUBLISHED" : "ARCHIVED"))}
                  </StatusBadge>
                </Cell>
                <Cell>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Edit ${t.title}`}
                      onClick={() => openEdit(t)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Delete ${t.title}`}
                      onClick={() => remove.mutate(t.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </Cell>
              </Row>
            ))}
          </Table>
        )}
        {!isLoading && visibleTrainings.length > 0 && (
          <PaginationControls {...pagination} onPageChange={pagination.setPage} />
        )}
      </Panel>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit training" : "New training"}</DialogTitle>
            <DialogDescription>
              Catalog entries are managed by the administration team only.
            </DialogDescription>
          </DialogHeader>
          <form
            noValidate
            className="grid gap-4 sm:grid-cols-2"
            onChangeCapture={() => {
              setFieldErrors({});
              setServerError(null);
            }}
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate(form);
            }}
          >
            <div className="sm:col-span-2 border-b border-border/60 pb-2">
              <h3 className="text-sm font-semibold text-foreground">Identity</h3>
            </div>
            <label className="sm:col-span-2 text-xs text-muted-foreground">
              Title
              <input
                className={inputClass("title")}
                aria-invalid={Boolean(fieldErrors.title?.length)}
                required
                maxLength={200}
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
              <FieldErrors messages={fieldErrors.title} />
            </label>
            <label className="sm:col-span-2 text-xs text-muted-foreground">
              Tagline
              <input
                className={inputClass("tagline")}
                aria-invalid={Boolean(fieldErrors.tagline?.length)}
                value={form.tagline}
                onChange={(e) => setForm({ ...form, tagline: e.target.value })}
              />
              <FieldErrors messages={fieldErrors.tagline} />
            </label>
            <label className="sm:col-span-2 text-xs text-muted-foreground">
              Description
              <textarea
                className={inputClass("description", fieldArea)}
                aria-invalid={Boolean(fieldErrors.description?.length)}
                required={form.lifecycleStatus === "PUBLISHED"}
                minLength={100}
                maxLength={10000}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
              <span className="mt-1 block text-xs text-muted-foreground">
                {form.description.trim().length}/10000 caractères · minimum 100 pour toute
                description; obligatoire pour publier.
              </span>
              <FieldErrors messages={fieldErrors.description} />
            </label>
            <label className="text-xs text-muted-foreground">
              Catégorie
              <select
                className={inputClass("axisCode")}
                aria-invalid={Boolean(fieldErrors.axisCode?.length)}
                value={form.axisCode}
                onChange={(e) => {
                  const axisCode = e.target.value as AxisCode;
                  const recognitionType = recognitionForAxis(axisCode, form.recognitionType);
                  const diploma = isDiploma(recognitionType);
                  setForm({
                    ...form,
                    axisCode,
                    recognitionType,
                    approvalStatus: diploma
                      ? form.approvalStatus === "NOT_APPLICABLE"
                        ? "PENDING"
                        : form.approvalStatus
                      : "NOT_APPLICABLE",
                    lifecycleStatus:
                      diploma && form.lifecycleStatus !== "ARCHIVED"
                        ? "IN_REVIEW"
                        : form.lifecycleStatus,
                  });
                }}
              >
                {AXES.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </select>
              <FieldErrors messages={fieldErrors.axisCode} />
            </label>
            <label className="text-xs text-muted-foreground">
              Sous-catégorie
              <input
                className={inputClass("subcategory")}
                aria-invalid={Boolean(fieldErrors.subcategory?.length)}
                maxLength={120}
                value={form.subcategory}
                onChange={(e) => setForm({ ...form, subcategory: e.target.value })}
              />
              <FieldErrors messages={fieldErrors.subcategory} />
            </label>
            <label className="text-xs text-muted-foreground">
              Niveau
              <select
                className={inputClass("level")}
                aria-invalid={Boolean(fieldErrors.level?.length)}
                value={form.level}
                onChange={(e) => setForm({ ...form, level: e.target.value as TrainingLevel })}
              >
                {LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
              <FieldErrors messages={fieldErrors.level} />
            </label>

            <div className="sm:col-span-2 mt-2 border-b border-border/60 pb-2">
              <h3 className="text-sm font-semibold text-foreground">Teaching design</h3>
            </div>
            <label className="text-xs text-muted-foreground">
              Durée affichée
              <input
                type="number"
                min={0.01}
                step={0.01}
                required
                className={inputClass("durationValue")}
                aria-invalid={Boolean(fieldErrors.durationValue?.length)}
                value={form.durationValue ?? ""}
                onChange={(e) => {
                  const durationValue = e.target.value === "" ? undefined : Number(e.target.value);
                  setForm({
                    ...form,
                    durationValue,
                    ...(form.durationUnit === "HOURS" && durationValue !== undefined
                      ? { durationHours: durationValue }
                      : {}),
                  });
                }}
              />
              <FieldErrors messages={fieldErrors.durationValue} />
            </label>
            <label className="text-xs text-muted-foreground">
              Unité de durée
              <select
                className={inputClass("durationUnit")}
                aria-invalid={Boolean(fieldErrors.durationUnit?.length)}
                value={form.durationUnit}
                onChange={(e) => {
                  const durationUnit = e.target.value as TrainingDurationUnit;
                  setForm({
                    ...form,
                    durationUnit,
                    ...(durationUnit === "HOURS" && form.durationHours !== null
                      ? { durationValue: form.durationHours }
                      : {}),
                  });
                }}
              >
                {DURATION_UNITS.map((unit) => (
                  <option key={unit.value} value={unit.value}>
                    {unit.label}
                  </option>
                ))}
              </select>
              <FieldErrors messages={fieldErrors.durationUnit} />
            </label>
            <label className="text-xs text-muted-foreground">
              Heures pédagogiques totales
              <input
                type="number"
                min={1}
                step={1}
                placeholder="À définir"
                className={inputClass("durationHours")}
                aria-invalid={Boolean(fieldErrors.durationHours?.length)}
                value={form.durationHours ?? ""}
                onChange={(e) => {
                  const durationHours = e.target.value === "" ? null : Number(e.target.value);
                  setForm({
                    ...form,
                    durationHours,
                    ...(form.durationUnit === "HOURS" && durationHours !== null
                      ? { durationValue: durationHours }
                      : {}),
                  });
                }}
              />
              <span className="mt-1 block text-xs text-muted-foreground">
                Facultatif, y compris après publication.
              </span>
              <FieldErrors messages={fieldErrors.durationHours} />
            </label>
            <label className="text-xs text-muted-foreground">
              Prix indicatif (TND)
              <input
                type="number"
                min={0}
                step={0.01}
                required
                className={inputClass("price")}
                aria-invalid={Boolean(fieldErrors.price?.length)}
                value={form.price}
                onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
              />
              <FieldErrors messages={fieldErrors.price} />
            </label>
            <label className="sm:col-span-2 text-xs text-muted-foreground">
              Objectifs pédagogiques (un par ligne)
              <textarea
                className={inputClass("objectives", fieldArea)}
                aria-invalid={Boolean(fieldErrors.objectives?.length)}
                value={form.objectives}
                onChange={(e) => setForm({ ...form, objectives: e.target.value })}
              />
              <FieldErrors messages={fieldErrors.objectives} />
            </label>
            <label className="sm:col-span-2 text-xs text-muted-foreground">
              Compétences acquises (une par ligne)
              <textarea
                className={inputClass("skills", fieldArea)}
                aria-invalid={Boolean(fieldErrors.skills?.length)}
                value={form.skills}
                onChange={(e) => setForm({ ...form, skills: e.target.value })}
              />
              <FieldErrors messages={fieldErrors.skills} />
            </label>
            <div className="sm:col-span-2 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground">Programme / modules</h4>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Les heures par module sont facultatives. Si elles sont toutes renseignées, leur
                    somme doit correspondre aux heures pédagogiques totales.
                  </p>
                  <FieldErrors messages={fieldErrors.program} />
                </div>
                <Button
                  type="button"
                  variant="glass"
                  size="sm"
                  onClick={() =>
                    setForm({
                      ...form,
                      program: [...form.program, { title: "", detail: "", hours: undefined }],
                    })
                  }
                >
                  <Plus className="h-4 w-4" /> Ajouter un module
                </Button>
              </div>
              {form.program.map((module, index) => (
                <div
                  key={`module-${index}`}
                  className="grid gap-3 rounded-lg border border-border/60 p-3 sm:grid-cols-[1fr_120px_auto]"
                >
                  <div className="grid gap-3 sm:col-span-2 sm:grid-cols-2">
                    <input
                      className={field}
                      placeholder="Titre du module"
                      maxLength={160}
                      value={module.title}
                      required
                      onChange={(e) =>
                        setForm({
                          ...form,
                          program: form.program.map((item, i) =>
                            i === index ? { ...item, title: e.target.value } : item,
                          ),
                        })
                      }
                    />
                    <input
                      className={field}
                      placeholder="Heures (facultatif)"
                      type="number"
                      min={1}
                      step={1}
                      value={module.hours ?? ""}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          program: form.program.map((item, i) =>
                            i === index
                              ? {
                                  ...item,
                                  hours: e.target.value === "" ? undefined : Number(e.target.value),
                                }
                              : item,
                          ),
                        })
                      }
                    />
                    <textarea
                      className={`${fieldArea} sm:col-span-2`}
                      placeholder="Contenu du module"
                      maxLength={2000}
                      required
                      value={module.detail}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          program: form.program.map((item, i) =>
                            i === index ? { ...item, detail: e.target.value } : item,
                          ),
                        })
                      }
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Supprimer le module ${index + 1}`}
                    onClick={() =>
                      setForm({ ...form, program: form.program.filter((_, i) => i !== index) })
                    }
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="sm:col-span-2 mt-2 border-b border-border/60 pb-2">
              <h3 className="text-sm font-semibold text-foreground">Recognition & approval</h3>
            </div>
            <label className="text-xs text-muted-foreground">
              Reconnaissance
              <select
                className={inputClass("recognitionType")}
                aria-invalid={Boolean(fieldErrors.recognitionType?.length)}
                value={form.recognitionType}
                onChange={(e) => {
                  const recognitionType = e.target.value as RecognitionType;
                  const diploma = isDiploma(recognitionType);
                  setForm({
                    ...form,
                    recognitionType,
                    approvalStatus: diploma
                      ? form.approvalStatus === "NOT_APPLICABLE"
                        ? "PENDING"
                        : form.approvalStatus
                      : "NOT_APPLICABLE",
                    lifecycleStatus:
                      diploma && form.lifecycleStatus !== "ARCHIVED"
                        ? "IN_REVIEW"
                        : form.lifecycleStatus,
                  });
                }}
              >
                {RECOGNITION_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              <FieldErrors messages={fieldErrors.recognitionType} />
            </label>
            <label className="text-xs text-muted-foreground">
              Titre délivré
              <input
                maxLength={200}
                required={form.recognitionType !== "NONE" && form.lifecycleStatus === "PUBLISHED"}
                className={inputClass("credentialTitle")}
                aria-invalid={Boolean(fieldErrors.credentialTitle?.length)}
                value={form.credentialTitle}
                onChange={(e) => setForm({ ...form, credentialTitle: e.target.value })}
              />
              <FieldErrors messages={fieldErrors.credentialTitle} />
            </label>
            <label className="text-xs text-muted-foreground">
              Organisme émetteur
              <input
                maxLength={200}
                className={inputClass("credentialIssuer")}
                aria-invalid={Boolean(fieldErrors.credentialIssuer?.length)}
                value={form.credentialIssuer}
                onChange={(e) => setForm({ ...form, credentialIssuer: e.target.value })}
              />
              <FieldErrors messages={fieldErrors.credentialIssuer} />
            </label>
            {isDiploma(form.recognitionType) && (
              <>
                <label className="text-xs text-muted-foreground">
                  Statut d’homologation
                  <select
                    className={inputClass("approvalStatus")}
                    aria-invalid={Boolean(fieldErrors.approvalStatus?.length)}
                    value={form.approvalStatus}
                    onChange={(e) => {
                      const approvalStatus = e.target.value as ApprovalStatus;
                      setForm({
                        ...form,
                        approvalStatus,
                        lifecycleStatus:
                          approvalStatus !== "APPROVED" && form.lifecycleStatus === "PUBLISHED"
                            ? "IN_REVIEW"
                            : form.lifecycleStatus,
                      });
                    }}
                  >
                    <option value="PENDING">En cours</option>
                    <option value="APPROVED">Approuvée</option>
                  </select>
                  <FieldErrors messages={fieldErrors.approvalStatus} />
                </label>
                <label className="text-xs text-muted-foreground">
                  Référence d’homologation
                  <input
                    className={inputClass("approvalReference")}
                    aria-invalid={Boolean(fieldErrors.approvalReference?.length)}
                    maxLength={200}
                    required={form.approvalStatus === "APPROVED"}
                    value={form.approvalReference}
                    onChange={(e) => setForm({ ...form, approvalReference: e.target.value })}
                  />
                  <FieldErrors messages={fieldErrors.approvalReference} />
                </label>
                <label className="text-xs text-muted-foreground">
                  Autorité d’homologation
                  <input
                    className={inputClass("approvalAuthority")}
                    aria-invalid={Boolean(fieldErrors.approvalAuthority?.length)}
                    maxLength={200}
                    required={form.approvalStatus === "APPROVED"}
                    value={form.approvalAuthority}
                    onChange={(e) => setForm({ ...form, approvalAuthority: e.target.value })}
                  />
                  <FieldErrors messages={fieldErrors.approvalAuthority} />
                </label>
                <label className="text-xs text-muted-foreground">
                  Homologation valable jusqu’au
                  <input
                    type="date"
                    required={form.approvalStatus === "APPROVED"}
                    min={new Date().toISOString().slice(0, 10)}
                    className={inputClass("approvalValidUntil")}
                    aria-invalid={Boolean(fieldErrors.approvalValidUntil?.length)}
                    value={form.approvalValidUntil}
                    onChange={(e) => setForm({ ...form, approvalValidUntil: e.target.value })}
                  />
                  <FieldErrors messages={fieldErrors.approvalValidUntil} />
                </label>
              </>
            )}

            <div className="sm:col-span-2 mt-2 border-b border-border/60 pb-2">
              <h3 className="text-sm font-semibold text-foreground">Public information</h3>
            </div>
            <label className="sm:col-span-2 text-xs text-muted-foreground">
              Image de couverture (URL)
              <input
                type="url"
                className={inputClass("coverUrl")}
                aria-invalid={Boolean(fieldErrors.coverUrl?.length)}
                placeholder="https://..."
                value={form.coverUrl}
                onChange={(e) => setForm({ ...form, coverUrl: e.target.value })}
              />
              <FieldErrors messages={fieldErrors.coverUrl} />
            </label>
            <label className="sm:col-span-2 text-xs text-muted-foreground">
              Public cible
              <textarea
                className={inputClass("targetAudience", fieldArea)}
                aria-invalid={Boolean(fieldErrors.targetAudience?.length)}
                value={form.targetAudience}
                onChange={(e) => setForm({ ...form, targetAudience: e.target.value })}
              />
              <FieldErrors messages={fieldErrors.targetAudience} />
            </label>
            <label className="sm:col-span-2 text-xs text-muted-foreground">
              Prérequis
              <textarea
                className={inputClass("prerequisites", fieldArea)}
                aria-invalid={Boolean(fieldErrors.prerequisites?.length)}
                value={form.prerequisites}
                onChange={(e) => setForm({ ...form, prerequisites: e.target.value })}
              />
              <FieldErrors messages={fieldErrors.prerequisites} />
            </label>
            <div className="sm:col-span-2 mt-2 border-b border-border/60 pb-2">
              <h3 className="text-sm font-semibold text-foreground">Publication</h3>
            </div>
            <label className="sm:col-span-2 text-xs text-muted-foreground">
              Statut éditorial
              <select
                className={inputClass("lifecycleStatus")}
                aria-invalid={Boolean(fieldErrors.lifecycleStatus?.length)}
                value={form.lifecycleStatus}
                onChange={(e) =>
                  setForm({ ...form, lifecycleStatus: e.target.value as TrainingLifecycleStatus })
                }
              >
                {LIFECYCLE_STATUSES.map((status) => (
                  <option
                    key={status.value}
                    value={status.value}
                    disabled={
                      status.value === "PUBLISHED" &&
                      isDiploma(form.recognitionType) &&
                      form.approvalStatus !== "APPROVED"
                    }
                  >
                    {status.label}
                  </option>
                ))}
              </select>
              <FieldErrors messages={fieldErrors.lifecycleStatus} />
              {isDiploma(form.recognitionType) && form.approvalStatus !== "APPROVED" && (
                <span className="mt-1 block text-amber-500">
                  Un diplôme non homologué ne peut pas être publié.
                </span>
              )}
            </label>
            {serverError && (
              <div
                role="alert"
                className="sm:col-span-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
              >
                {serverError}
              </div>
            )}
            <DialogFooter className="sm:col-span-2">
              <Button type="button" variant="glass" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="electric" disabled={save.isPending}>
                {save.isPending ? "Saving…" : editing ? "Save changes" : "Create training"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
