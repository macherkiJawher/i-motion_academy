import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Download, FileText, RotateCcw, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { api, downloadFile, errorMessage, postForm } from "@/api/client";
import { useAuth } from "@/hooks/useAuth";
import type { Complaint, ComplaintStatus } from "@/types/domain";

const statusLabels: Record<ComplaintStatus, string> = {
  NEW: "Nouvelle",
  IN_PROGRESS: "En cours",
  WAITING_FOR_PARTICIPANT: "En attente de votre réponse",
  RESOLVED: "Résolue",
  CLOSED: "Clôturée",
  REJECTED: "Rejetée",
};
const eventLabels: Record<string, string> = {
  CREATED: "Réclamation créée",
  STATUS_CHANGED: "Statut modifié",
  MESSAGE_ADDED: "Message envoyé",
  ATTACHMENTS_ADDED: "Pièce(s) jointe(s) ajoutée(s)",
  REOPENED_BY_PARTICIPANT: "Réclamation réouverte par vous",
  REOPENED_BY_ADMIN: "Réclamation réouverte par l’équipe",
};

export const Route = createFileRoute("/dashboard/complaints/$id")({
  component: ParticipantComplaintDetail,
});

function ParticipantComplaintDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { role, ready } = useAuth();
  const client = useQueryClient();
  const [content, setContent] = useState("");
  const [justification, setJustification] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const query = useQuery({
    queryKey: ["complaint", id],
    queryFn: () => api.get<Complaint>(`/complaints/${id}`),
    enabled: ready && role !== "ADMIN",
  });
  useEffect(() => {
    if (ready && role === "ADMIN") {
      void navigate({
        to: "/admin/complaints",
        search: { complaintId: id },
        replace: true,
      });
    }
  }, [id, navigate, ready, role]);
  const refresh = async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: ["complaint", id] }),
      client.invalidateQueries({ queryKey: ["complaints", "me"] }),
    ]);
  };
  const sendMessage = useMutation({
    mutationFn: () => api.post(`/complaints/${id}/messages`, { content: content.trim() }),
    onSuccess: async () => {
      setContent("");
      setError("");
      setNotice("Votre message a été envoyé.");
      await refresh();
    },
    onError: (reason) => setError(errorMessage(reason)),
  });
  const reopen = useMutation({
    mutationFn: () =>
      api.post(`/complaints/${id}/reopen`, {
        justification: justification.trim(),
      }),
    onSuccess: async () => {
      setJustification("");
      setError("");
      setNotice("Votre réclamation a été réouverte et l’équipe en a été informée.");
      await refresh();
    },
    onError: (reason) => setError(errorMessage(reason)),
  });
  const upload = useMutation({
    mutationFn: (files: File[]) => {
      const form = new FormData();
      files.forEach((file) => form.append("files", file));
      return postForm(`/complaints/${id}/attachments`, form);
    },
    onSuccess: async () => {
      setError("");
      setNotice("Vos pièces jointes ont été ajoutées.");
      await refresh();
    },
    onError: (reason) => setError(errorMessage(reason)),
  });

  async function downloadAttachment(attachmentId: string, filename: string) {
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

  function onUpload(files: FileList | null) {
    if (!files?.length) return;
    const selected = Array.from(files);
    if (selected.length > 3 || selected.some((file) => file.size > 5 * 1024 * 1024)) {
      setError("Ajoutez au maximum 3 fichiers, de 5 Mo maximum chacun.");
      return;
    }
    upload.mutate(selected);
  }

  if (!ready || role === "ADMIN" || query.isLoading) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-10 text-muted-foreground">
        Chargement du dossier…
      </div>
    );
  }
  if (query.isError || !query.data) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-10">
        <p role="alert" className="rounded-xl border p-6 text-destructive">
          Impossible de consulter ce dossier.
        </p>
        <Link
          to="/dashboard/complaints"
          className="mt-4 inline-flex items-center gap-2 text-sm text-electric"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux réclamations
        </Link>
      </div>
    );
  }

  const complaint = query.data;
  const isTerminal = complaint.status === "CLOSED" || complaint.status === "REJECTED";
  const isWaiting = complaint.status === "WAITING_FOR_PARTICIPANT";

  return (
    <main className="container mx-auto max-w-4xl px-4 py-8 sm:py-10">
      <Link
        to="/dashboard/complaints"
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Mes réclamations
      </Link>
      <header className="mt-5 rounded-2xl border bg-card p-5 shadow-sm sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              {complaint.reference} · {complaint.category}
            </p>
            <h1 className="mt-2 text-2xl font-bold">{complaint.subject}</h1>
            {complaint.concernedName && (
              <p className="mt-1 text-sm text-muted-foreground">
                Élément concerné : {complaint.concernedName}
              </p>
            )}
          </div>
          <span className="rounded-full border border-electric/30 bg-electric/10 px-3 py-1.5 text-sm font-semibold text-electric">
            {statusLabels[complaint.status]}
          </span>
        </div>
        <div className="mt-5 grid gap-3 border-t pt-4 text-sm sm:grid-cols-2">
          <p>
            <span className="text-muted-foreground">Créée le </span>
            {new Date(complaint.createdAt).toLocaleString("fr-FR")}
          </p>
          <p>
            <span className="text-muted-foreground">Dernière mise à jour </span>
            {new Date(complaint.updatedAt).toLocaleString("fr-FR")}
          </p>
        </div>
      </header>

      {error && (
        <p
          role="alert"
          className="mt-5 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
        >
          {error}
        </p>
      )}
      {notice && (
        <p
          role="status"
          className="mt-5 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm text-emerald-700"
        >
          {notice}
        </p>
      )}

      <section className="mt-5 rounded-2xl border bg-card p-5 sm:p-7">
        <h2 className="text-lg font-semibold">Votre demande</h2>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
          {complaint.description}
        </p>
        {complaint.resolution && (
          <div className="mt-5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
            <h3 className="font-semibold">Réponse de l’équipe</h3>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{complaint.resolution}</p>
          </div>
        )}
      </section>

      <section className="mt-5 rounded-2xl border bg-card p-5 sm:p-7">
        <h2 className="text-lg font-semibold">Échanges</h2>
        <div className="mt-4 space-y-3">
          {complaint.messages?.length ? (
            complaint.messages.map((message) => (
              <article
                key={message.id}
                className={`max-w-[95%] rounded-xl p-4 sm:max-w-[85%] ${message.author?.role === "ADMIN" ? "border bg-background" : "ml-auto bg-electric/10"}`}
              >
                <div className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
                  <strong className="text-foreground">
                    {message.author?.role === "ADMIN" ? "Équipe i-Motion" : "Vous"}
                  </strong>
                  <time dateTime={message.createdAt}>
                    {new Date(message.createdAt).toLocaleString("fr-FR")}
                  </time>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{message.content}</p>
              </article>
            ))
          ) : (
            <p className="rounded-lg bg-secondary/40 p-4 text-sm text-muted-foreground">
              Aucun message échangé pour le moment.
            </p>
          )}
        </div>
        {!isTerminal && (
          <form
            className="mt-5 border-t pt-4"
            onSubmit={(event) => {
              event.preventDefault();
              sendMessage.mutate();
            }}
          >
            <label htmlFor="complaint-message" className="text-sm font-medium">
              Écrire à l’équipe
            </label>
            <textarea
              id="complaint-message"
              required
              minLength={1}
              maxLength={5000}
              rows={4}
              value={content}
              onChange={(event) => setContent(event.target.value)}
              className="mt-2 w-full rounded-lg border bg-background p-3 text-sm"
              placeholder={isWaiting ? "Ajoutez les précisions demandées…" : "Votre message…"}
            />
            <button
              disabled={!content.trim() || sendMessage.isPending}
              className="mt-3 inline-flex items-center gap-2 rounded-lg bg-electric px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              {sendMessage.isPending ? "Envoi…" : "Envoyer le message"}
            </button>
          </form>
        )}
      </section>

      {isTerminal && (
        <section className="mt-5 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 sm:p-7">
          <h2 className="text-lg font-semibold">Besoin de poursuivre le traitement ?</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Vous pouvez demander la réouverture de ce dossier en expliquant pourquoi la réponse ou
            la clôture doit être réexaminée.
          </p>
          <form
            className="mt-4"
            onSubmit={(event) => {
              event.preventDefault();
              reopen.mutate();
            }}
          >
            <label htmlFor="reopen-reason" className="text-sm font-medium">
              Motif de réouverture (10 à 500 caractères)
            </label>
            <textarea
              id="reopen-reason"
              required
              minLength={10}
              maxLength={500}
              rows={3}
              value={justification}
              onChange={(event) => setJustification(event.target.value)}
              className="mt-2 w-full rounded-lg border bg-background p-3 text-sm"
              placeholder="Précisez les éléments nouveaux ou le point qui reste à résoudre…"
            />
            <button
              disabled={justification.trim().length < 10 || reopen.isPending}
              className="mt-3 inline-flex items-center gap-2 rounded-lg border border-amber-600/40 px-4 py-2.5 text-sm font-medium text-amber-800 disabled:opacity-50"
            >
              <RotateCcw className="h-4 w-4" />
              {reopen.isPending ? "Réouverture…" : "Demander la réouverture"}
            </button>
          </form>
        </section>
      )}

      <section className="mt-5 rounded-2xl border bg-card p-5 sm:p-7">
        <h2 className="text-lg font-semibold">Pièces jointes</h2>
        <div className="mt-3 space-y-2">
          {complaint.attachments?.length ? (
            complaint.attachments.map((file) => (
              <div
                key={file.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
              >
                <span className="inline-flex min-w-0 items-center gap-2 truncate text-sm">
                  <FileText className="h-4 w-4 shrink-0 text-electric" />
                  {file.originalName}
                </span>
                <button
                  type="button"
                  onClick={() => downloadAttachment(file.id, file.originalName)}
                  className="inline-flex items-center gap-1 text-sm font-medium text-electric"
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
        {!isTerminal && (
          <label className="mt-4 block border-t pt-4 text-sm">
            Ajouter des pièces (PDF, JPEG ou PNG ; 5 Mo chacun, 3 maximum)
            <input
              type="file"
              multiple
              accept="application/pdf,image/jpeg,image/png"
              disabled={upload.isPending}
              onChange={(event) => {
                onUpload(event.currentTarget.files);
                event.currentTarget.value = "";
              }}
              className="mt-2 block w-full text-sm"
            />
          </label>
        )}
      </section>

      <section className="mt-5 rounded-2xl border bg-card p-5 sm:p-7">
        <h2 className="text-lg font-semibold">Historique du dossier</h2>
        <ol className="mt-4 space-y-4 border-l pl-5">
          {complaint.events?.map((event) => (
            <li key={event.id} className="relative">
              <span className="absolute left-[-1.43rem] top-1.5 h-2.5 w-2.5 rounded-full bg-electric" />
              <p className="text-sm font-medium">
                {eventLabels[event.type] ?? event.type.replaceAll("_", " ").toLowerCase()}
              </p>
              {event.details && (
                <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                  {event.details}
                </p>
              )}
              <time className="mt-1 block text-xs text-muted-foreground" dateTime={event.createdAt}>
                {new Date(event.createdAt).toLocaleString("fr-FR")}
              </time>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
