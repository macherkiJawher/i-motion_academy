import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, RotateCcw, Search, Send } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { api, downloadFile, errorMessage } from "@/api/client";
import { PaginationControls } from "@/components/dash/Primitives";
import type {
  Complaint,
  ComplaintCategory,
  ComplaintPriority,
  ComplaintStatus,
} from "@/types/domain";
import { z } from "zod";

const statuses: ComplaintStatus[] = [
  "NEW",
  "IN_PROGRESS",
  "WAITING_FOR_PARTICIPANT",
  "RESOLVED",
  "CLOSED",
  "REJECTED",
];
const categories: ComplaintCategory[] = [
  "REGISTRATION",
  "PAYMENT",
  "SESSION",
  "TRAINING",
  "TRAINER",
  "CERTIFICATE",
  "OTHER",
];
const priorities: ComplaintPriority[] = ["LOW", "NORMAL", "HIGH", "CRITICAL"];
const statusLabels: Record<ComplaintStatus, string> = {
  NEW: "Nouvelle",
  IN_PROGRESS: "En cours",
  WAITING_FOR_PARTICIPANT: "Attente participant",
  RESOLVED: "Résolue",
  CLOSED: "Clôturée",
  REJECTED: "Rejetée",
};
const allowedNext: Record<ComplaintStatus, ComplaintStatus[]> = {
  NEW: ["IN_PROGRESS", "REJECTED"],
  IN_PROGRESS: ["WAITING_FOR_PARTICIPANT", "RESOLVED", "REJECTED"],
  WAITING_FOR_PARTICIPANT: ["IN_PROGRESS", "RESOLVED", "REJECTED"],
  RESOLVED: ["CLOSED"],
  CLOSED: [],
  REJECTED: [],
};

export const Route = createFileRoute("/admin/complaints")({
  validateSearch: z.object({
    complaintId: z.string().optional(),
    priority: z.enum(["LOW", "NORMAL", "HIGH", "CRITICAL"]).optional(),
  }),
  component: AdminComplaints,
});

function AdminComplaints() {
  const { complaintId, priority } = Route.useSearch();
  const client = useQueryClient();
  const [id, setId] = useState<string | null>(null);
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<ComplaintPriority | "">(priority ?? "");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState("");
  const [internal, setInternal] = useState(false);
  const [resolution, setResolution] = useState("");
  const [reopenReason, setReopenReason] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<ComplaintStatus | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (complaintId) setId(complaintId);
  }, [complaintId]);
  useEffect(() => {
    setPriorityFilter(priority ?? "");
    setPage(1);
  }, [priority]);
  const params = new URLSearchParams({ page: String(page), pageSize: "20" });
  if (search) params.set("search", search);
  if (statusFilter) params.set("status", statusFilter);
  if (priorityFilter) params.set("priority", priorityFilter);
  if (categoryFilter) params.set("category", categoryFilter);

  const { data: list, isLoading } = useQuery({
    queryKey: ["admin", "complaints", page, search, statusFilter, priorityFilter, categoryFilter],
    queryFn: () =>
      api.get<{ items: Complaint[]; total: number; page: number; pageSize: number }>(
        `/admin/complaints?${params.toString()}`,
      ),
  });
  const { data: metrics } = useQuery({
    queryKey: ["admin", "complaint-metrics"],
    queryFn: () =>
      api.get<{
        total: number;
        open: number;
        unassigned: number;
        overdue: number;
        waitingForParticipant: number;
        averageResolutionHours: number;
      }>("/admin/complaints/metrics"),
  });
  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ["complaint", id],
    queryFn: () => api.get<Complaint>(`/complaints/${id}`),
    enabled: Boolean(id),
  });
  const refresh = () => {
    client.invalidateQueries({ queryKey: ["admin", "complaints"] });
    client.invalidateQueries({ queryKey: ["admin", "complaint-metrics"] });
    client.invalidateQueries({ queryKey: ["complaint", id] });
  };
  const update = useMutation({
    mutationFn: (body: object) => api.patch(`/admin/complaints/${id}`, body),
    onSuccess: () => {
      setError("");
      setSelectedStatus(null);
      setResolution("");
      refresh();
    },
    onError: (reason) => setError(errorMessage(reason)),
  });
  const take = useMutation({
    mutationFn: () => api.patch(`/admin/complaints/${id}/take`),
    onSuccess: refresh,
    onError: (reason) => setError(errorMessage(reason)),
  });
  const send = useMutation({
    mutationFn: () => api.post(`/complaints/${id}/messages`, { content: message, internal }),
    onSuccess: () => {
      setMessage("");
      setError("");
      refresh();
    },
    onError: (reason) => setError(errorMessage(reason)),
  });
  const reopen = useMutation({
    mutationFn: () =>
      api.post(`/admin/complaints/${id}/reopen`, { justification: reopenReason.trim() }),
    onSuccess: () => {
      setReopenReason("");
      setError("");
      refresh();
    },
    onError: (reason) => setError(errorMessage(reason)),
  });

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearch(searchDraft.trim());
    setPage(1);
  }

  async function downloadAttachment(attachmentId: string, filename: string) {
    if (!id) return;
    try {
      const blob = await downloadFile(`/complaints/${id}/attachments/${attachmentId}`);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (reason) {
      setError(errorMessage(reason));
    }
  }

  const total = list?.total ?? 0;
  const pageSize = list?.pageSize ?? 20;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const terminal = detail?.status === "CLOSED" || detail?.status === "REJECTED";
  const statusToApply = selectedStatus ?? detail?.status;
  const needsResolution = statusToApply === "RESOLVED" || statusToApply === "REJECTED";

  return (
    <div className="container mx-auto max-w-7xl px-4 py-10">
      <header className="mb-7">
        <h1 className="text-3xl font-bold">Réclamations</h1>
        <p className="mt-2 text-muted-foreground">
          Une file de traitement centralisée, filtrable et traçable.
        </p>
      </header>
      <div className="mb-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Metric label="Ouvertes" value={metrics?.open} />
        <Metric label="Sans responsable" value={metrics?.unassigned} />
        <Metric label="En attente participant" value={metrics?.waitingForParticipant} />
        <Metric label="Sans activité +48 h" value={metrics?.overdue} />
        <Metric
          label="Résolution moyenne"
          value={metrics ? `${metrics.averageResolutionHours} h` : undefined}
        />
      </div>

      <form
        onSubmit={applyFilters}
        className="mb-5 grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-[minmax(220px,1fr)_repeat(3,minmax(150px,190px))_auto]"
      >
        <label className="sr-only" htmlFor="complaint-search">
          Rechercher une réclamation
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            id="complaint-search"
            value={searchDraft}
            onChange={(event) => setSearchDraft(event.target.value)}
            placeholder="Référence, objet, participant…"
            className="w-full rounded-lg border bg-background py-2 pl-9 pr-3 text-sm"
          />
        </div>
        <label className="sr-only" htmlFor="complaint-status">
          Filtrer par statut
        </label>
        <select
          id="complaint-status"
          value={statusFilter}
          onChange={(event) => {
            setStatusFilter(event.target.value);
            setPage(1);
          }}
          className="rounded-lg border bg-background px-3 py-2 text-sm"
        >
          <option value="">Tous les statuts</option>
          {statuses.map((value) => (
            <option key={value} value={value}>
              {statusLabels[value]}
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor="complaint-priority">
          Filtrer par priorité
        </label>
        <select
          id="complaint-priority"
          value={priorityFilter}
          onChange={(event) => {
            setPriorityFilter(event.target.value as ComplaintPriority | "");
            setPage(1);
          }}
          className="rounded-lg border bg-background px-3 py-2 text-sm"
        >
          <option value="">Toutes les priorités</option>
          {priorities.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor="complaint-category">
          Filtrer par catégorie
        </label>
        <select
          id="complaint-category"
          value={categoryFilter}
          onChange={(event) => {
            setCategoryFilter(event.target.value);
            setPage(1);
          }}
          className="rounded-lg border bg-background px-3 py-2 text-sm"
        >
          <option value="">Toutes les catégories</option>
          {categories.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        <button className="rounded-lg bg-electric px-4 py-2 text-sm font-medium text-white">
          Rechercher
        </button>
      </form>

      {error && (
        <p
          role="alert"
          className="mb-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
        >
          {error}
        </p>
      )}
      {isLoading ? (
        <p>Chargement…</p>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
          <div>
            <div className="space-y-3">
              {list?.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setId(item.id);
                    setSelectedStatus(null);
                    setError("");
                  }}
                  className={`w-full rounded-xl border p-4 text-left transition ${id === item.id ? "border-electric bg-electric/5 shadow-sm" : "bg-card hover:border-electric/40"}`}
                >
                  <div className="flex justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">
                        {item.reference} · {item.category}
                      </p>
                      <p className="mt-1 truncate font-semibold">{item.subject}</p>
                      <p className="mt-1 truncate text-sm text-muted-foreground">
                        {item.user?.firstName} {item.user?.lastName}
                      </p>
                    </div>
                    <Priority value={item.priority} />
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">
                    {statusLabels[item.status]} ·{" "}
                    {item.assignedTo
                      ? `${item.assignedTo.firstName} ${item.assignedTo.lastName}`
                      : "Non affectée"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Activité : {new Date(item.updatedAt).toLocaleString("fr-FR")}
                  </p>
                </button>
              ))}
              {!list?.items.length && (
                <p className="rounded-xl border p-6 text-center text-sm text-muted-foreground">
                  Aucun dossier pour ces critères.
                </p>
              )}
            </div>
            {total > pageSize && (
              <PaginationControls
                page={page}
                pageCount={pageCount}
                pageSize={pageSize}
                totalItems={total}
                onPageChange={setPage}
              />
            )}
          </div>

          {detailLoading ? (
            <div className="rounded-xl border p-8 text-center text-muted-foreground">
              Chargement du dossier…
            </div>
          ) : detail ? (
            <section className="min-w-0 rounded-xl border bg-card p-5">
              <div className="flex flex-wrap justify-between gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {detail.reference} ·{" "}
                    {detail.user
                      ? `${detail.user.firstName} ${detail.user.lastName}`
                      : "Participant"}
                    {detail.user?.email ? ` · ${detail.user.email}` : ""}
                  </p>
                  <h2 className="mt-1 text-xl font-semibold">{detail.subject}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {detail.category}
                    {detail.concernedName ? ` · ${detail.concernedName}` : ""}
                  </p>
                </div>
                {!terminal && detail.status !== "IN_PROGRESS" && (
                  <button
                    type="button"
                    disabled={take.isPending}
                    onClick={() => take.mutate()}
                    className="h-fit rounded-lg border px-3 py-2 text-sm disabled:opacity-50"
                  >
                    {take.isPending ? "Prise en charge…" : "Prendre en charge"}
                  </button>
                )}
              </div>
              <p className="mt-4 whitespace-pre-wrap rounded-lg bg-secondary/50 p-4 text-sm leading-6">
                {detail.description}
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <label className="text-sm font-medium">
                  Statut
                  <select
                    value={statusToApply}
                    onChange={(event) => setSelectedStatus(event.target.value as ComplaintStatus)}
                    className="mt-1 w-full rounded-lg border bg-background p-2"
                  >
                    {[detail.status, ...allowedNext[detail.status]].map((status, index) => (
                      <option key={`${status}-${index}`} value={status}>
                        {statusLabels[status]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm font-medium">
                  Priorité
                  <select
                    value={detail.priority}
                    onChange={(event) => update.mutate({ priority: event.target.value })}
                    className="mt-1 w-full rounded-lg border bg-background p-2"
                  >
                    {priorities.map((priority) => (
                      <option key={priority} value={priority}>
                        {priority}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              {selectedStatus && selectedStatus !== detail.status && (
                <div className="mt-3 rounded-lg border p-3">
                  {needsResolution && (
                    <label className="block text-sm font-medium">
                      Réponse finale obligatoire
                      <textarea
                        value={resolution}
                        onChange={(event) => setResolution(event.target.value)}
                        maxLength={5000}
                        rows={3}
                        className="mt-1 w-full rounded-lg border bg-background p-2"
                        placeholder="Expliquez la décision au participant…"
                      />
                    </label>
                  )}
                  <button
                    type="button"
                    disabled={update.isPending || (needsResolution && resolution.trim().length < 3)}
                    onClick={() =>
                      update.mutate({
                        status: selectedStatus,
                        ...(needsResolution ? { resolution: resolution.trim() } : {}),
                      })
                    }
                    className="mt-2 rounded-lg bg-electric px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                  >
                    {update.isPending ? "Enregistrement…" : "Appliquer le statut"}
                  </button>
                </div>
              )}
              {detail.resolution && (
                <div className="mt-4 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-sm">
                  <strong>Réponse finale :</strong>
                  <p className="mt-1 whitespace-pre-wrap">{detail.resolution}</p>
                </div>
              )}

              {terminal && (
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    reopen.mutate();
                  }}
                  className="mt-5 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4"
                >
                  <h3 className="font-semibold">Réouvrir le dossier</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    La réouverture le remettra en cours et sera ajoutée à l’historique.
                  </p>
                  <textarea
                    required
                    minLength={10}
                    maxLength={500}
                    value={reopenReason}
                    onChange={(event) => setReopenReason(event.target.value)}
                    rows={2}
                    className="mt-3 w-full rounded-lg border bg-background p-2 text-sm"
                    placeholder="Motif de réouverture (10 à 500 caractères)"
                  />
                  <button
                    disabled={reopen.isPending || reopenReason.trim().length < 10}
                    className="mt-2 inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium disabled:opacity-50"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Réouvrir
                  </button>
                </form>
              )}

              <section className="mt-6 border-t pt-4">
                <h3 className="font-semibold">Conversation</h3>
                <div className="mt-3 space-y-2">
                  {detail.messages?.map((item) => (
                    <div
                      key={item.id}
                      className={`rounded-lg p-3 text-sm ${item.visibility === "INTERNAL" ? "border border-amber-400/50 bg-amber-100/30" : "bg-secondary/50"}`}
                    >
                      <div className="flex flex-wrap justify-between gap-2">
                        <strong>
                          {item.visibility === "INTERNAL"
                            ? "Note interne"
                            : `${item.author?.firstName ?? ""} ${item.author?.lastName ?? ""}`}
                        </strong>
                        <time className="text-xs text-muted-foreground">
                          {new Date(item.createdAt).toLocaleString("fr-FR")}
                        </time>
                      </div>
                      <p className="mt-2 whitespace-pre-wrap">{item.content}</p>
                    </div>
                  ))}
                  {!detail.messages?.length && (
                    <p className="text-sm text-muted-foreground">Aucun message.</p>
                  )}
                </div>
                {!terminal && (
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      send.mutate();
                    }}
                    className="mt-4"
                  >
                    <textarea
                      required
                      minLength={1}
                      maxLength={5000}
                      value={message}
                      onChange={(event) => setMessage(event.target.value)}
                      rows={3}
                      className="w-full rounded-lg border bg-background p-2 text-sm"
                      placeholder={
                        internal
                          ? "Ajouter une note visible uniquement par l’administration…"
                          : "Répondre au participant…"
                      }
                    />
                    <label className="mt-2 flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={internal}
                        onChange={(event) => setInternal(event.target.checked)}
                      />
                      Note interne (non visible par le participant)
                    </label>
                    <button
                      disabled={!message.trim() || send.isPending}
                      className="mt-3 inline-flex items-center gap-2 rounded-lg bg-electric px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                    >
                      <Send className="h-4 w-4" />
                      {send.isPending
                        ? "Envoi…"
                        : internal
                          ? "Ajouter la note"
                          : "Envoyer la réponse"}
                    </button>
                  </form>
                )}
              </section>

              <section className="mt-6 border-t pt-4">
                <h3 className="font-semibold">Pièces jointes</h3>
                <div className="mt-2 space-y-2">
                  {detail.attachments?.length ? (
                    detail.attachments.map((file) => (
                      <div
                        key={file.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm"
                      >
                        <span className="truncate">
                          {file.originalName}{" "}
                          <span className="text-xs text-muted-foreground">
                            ({Math.ceil(file.sizeBytes / 1024)} Ko)
                          </span>
                        </span>
                        <button
                          type="button"
                          onClick={() => downloadAttachment(file.id, file.originalName)}
                          className="inline-flex items-center gap-1 text-electric"
                        >
                          <Download className="h-4 w-4" />
                          Télécharger
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">Aucune pièce jointe.</p>
                  )}
                </div>
              </section>

              <section className="mt-6 border-t pt-4">
                <h3 className="font-semibold">Historique</h3>
                <ol className="mt-3 space-y-3 text-sm">
                  {detail.events?.map((event) => (
                    <li key={event.id} className="border-l-2 border-electric/40 pl-3">
                      <span className="font-medium">{event.type.replaceAll("_", " ")}</span>
                      {event.details ? ` — ${event.details}` : ""}
                      <time className="mt-1 block text-xs text-muted-foreground">
                        {new Date(event.createdAt).toLocaleString("fr-FR")}
                      </time>
                    </li>
                  ))}
                </ol>
              </section>
            </section>
          ) : (
            <div className="rounded-xl border p-8 text-center text-muted-foreground">
              {id
                ? "Dossier introuvable."
                : "Sélectionnez une réclamation pour consulter son dossier."}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number | undefined }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value ?? "—"}</p>
    </div>
  );
}

function Priority({ value }: { value: ComplaintPriority }) {
  return (
    <span
      className={`h-fit shrink-0 rounded-full px-2 py-1 text-xs font-medium ${value === "CRITICAL" ? "bg-red-500/15 text-red-700" : value === "HIGH" ? "bg-orange-500/15 text-orange-700" : "bg-secondary"}`}
    >
      {value}
    </span>
  );
}
