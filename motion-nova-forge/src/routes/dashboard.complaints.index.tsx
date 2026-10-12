import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useState } from "react";
import { ArrowRight, FileText, Plus, Search } from "lucide-react";
import { api, errorMessage, postForm } from "@/api/client";
import type { Complaint, ComplaintCategory, ComplaintStatus } from "@/types/domain";

const categories: { value: ComplaintCategory; label: string }[] = [
  { value: "REGISTRATION", label: "Inscription" },
  { value: "PAYMENT", label: "Paiement" },
  { value: "SESSION", label: "Session" },
  { value: "TRAINING", label: "Formation" },
  { value: "TRAINER", label: "Formateur" },
  { value: "CERTIFICATE", label: "Certificat" },
  { value: "OTHER", label: "Autre" },
];
const statusLabels: Record<ComplaintStatus, string> = {
  NEW: "Nouvelle",
  IN_PROGRESS: "En cours",
  WAITING_FOR_PARTICIPANT: "Votre réponse attendue",
  RESOLVED: "Résolue",
  CLOSED: "Clôturée",
  REJECTED: "Rejetée",
};

export const Route = createFileRoute("/dashboard/complaints/")({
  component: ComplaintsPage,
});

function ComplaintsPage() {
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const { data, isLoading, isError } = useQuery({
    queryKey: ["complaints", "me"],
    queryFn: () => api.get<{ items: Complaint[] }>("/complaints/me"),
  });
  const create = useMutation({
    mutationFn: async (input: {
      category: ComplaintCategory;
      subject: string;
      description: string;
      concernedName: string;
      files: File[];
    }) => {
      const complaint = await api.post<Complaint>("/complaints", {
        category: input.category,
        subject: input.subject,
        description: input.description,
        concernedName: input.concernedName || undefined,
      });
      if (input.files.length) {
        const form = new FormData();
        input.files.forEach((file) => form.append("files", file));
        await postForm(`/complaints/${complaint.id}/attachments`, form);
      }
      return complaint;
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["complaints", "me"] });
      setOpen(false);
      setError("");
    },
    onError: (reason) => {
      client.invalidateQueries({ queryKey: ["complaints", "me"] });
      setError(errorMessage(reason));
    },
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const files = Array.from(form.getAll("files") as File[]).filter((file) => file.size > 0);
    if (files.length > 3) {
      setError("Vous pouvez joindre au maximum 3 fichiers par envoi.");
      return;
    }
    if (files.some((file) => file.size > 5 * 1024 * 1024)) {
      setError("Chaque fichier doit faire 5 Mo maximum.");
      return;
    }
    create.mutate({
      category: form.get("category") as ComplaintCategory,
      subject: String(form.get("subject") ?? ""),
      description: String(form.get("description") ?? ""),
      concernedName: String(form.get("concernedName") ?? ""),
      files,
    });
  }

  return (
    <div className="container mx-auto max-w-5xl px-4 py-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Mes réclamations</h1>
          <p className="mt-2 text-muted-foreground">
            Retrouvez vos échanges, les réponses de l’équipe et l’avancement de chaque dossier.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg bg-electric px-4 py-2.5 font-medium text-white"
          onClick={() => setOpen((current) => !current)}
        >
          <Plus className="h-4 w-4" />
          Nouvelle réclamation
        </button>
      </header>

      {error && (
        <p
          role="alert"
          className="mb-5 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
        >
          {error}
        </p>
      )}
      {open && (
        <form
          onSubmit={submit}
          className="mb-8 grid gap-4 rounded-2xl border bg-card p-5 shadow-sm"
        >
          <h2 className="text-lg font-semibold">Décrire votre demande</h2>
          <label className="grid gap-1 text-sm font-medium">
            Catégorie
            <select name="category" required className="rounded-lg border bg-background p-2.5">
              {categories.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Formation, session ou formateur concerné
            <input
              name="concernedName"
              maxLength={200}
              className="rounded-lg border bg-background p-2.5"
            />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Objet
            <input
              required
              minLength={10}
              maxLength={150}
              name="subject"
              className="rounded-lg border bg-background p-2.5"
            />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Description
            <textarea
              required
              minLength={30}
              maxLength={3000}
              name="description"
              rows={5}
              className="rounded-lg border bg-background p-2.5"
            />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Pièces jointes
            <span className="font-normal text-muted-foreground">
              PDF, JPEG ou PNG — 5 Mo maximum par fichier, 3 fichiers maximum.
            </span>
            <input
              name="files"
              type="file"
              multiple
              accept="application/pdf,image/jpeg,image/png"
              className="block w-full text-sm"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              disabled={create.isPending}
              className="rounded-lg bg-electric px-4 py-2.5 font-medium text-white disabled:opacity-50"
            >
              {create.isPending ? "Envoi…" : "Envoyer la réclamation"}
            </button>
            <button
              type="button"
              className="rounded-lg border px-4 py-2.5"
              onClick={() => setOpen(false)}
            >
              Annuler
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <p className="rounded-xl border p-8 text-center text-muted-foreground">
          Chargement de vos dossiers…
        </p>
      ) : isError ? (
        <p role="alert" className="rounded-xl border p-8 text-center text-destructive">
          Impossible de charger vos réclamations. Réessayez plus tard.
        </p>
      ) : data?.items.length ? (
        <div className="space-y-3">
          {data.items.map((item) => (
            <Link
              key={item.id}
              to="/dashboard/complaints/$id"
              params={{ id: item.id }}
              className="group block rounded-2xl border bg-card p-5 transition hover:border-electric/50 hover:shadow-md"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-medium tracking-wide text-muted-foreground">
                    {item.reference} ·{" "}
                    {categories.find((category) => category.value === item.category)?.label ??
                      item.category}
                  </p>
                  <h2 className="mt-1 truncate text-lg font-semibold">{item.subject}</h2>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {item.description}
                  </p>
                </div>
                <StatusPill status={item.status} />
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-xs text-muted-foreground">
                <span>Mis à jour le {new Date(item.updatedAt).toLocaleString("fr-FR")}</span>
                <span className="inline-flex items-center gap-1 font-medium text-electric">
                  Ouvrir le dossier{" "}
                  <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed p-10 text-center">
          <Search className="mx-auto h-8 w-8 text-muted-foreground" />
          <h2 className="mt-3 font-semibold">Aucune réclamation pour le moment</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Créez un dossier pour contacter notre équipe de suivi.
          </p>
        </div>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: ComplaintStatus }) {
  const tone =
    status === "RESOLVED" || status === "CLOSED"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
      : status === "REJECTED"
        ? "border-red-500/30 bg-red-500/10 text-red-700"
        : status === "WAITING_FOR_PARTICIPANT"
          ? "border-amber-500/30 bg-amber-500/10 text-amber-800"
          : "border-electric/30 bg-electric/10 text-electric";
  return (
    <span className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${tone}`}>
      {statusLabels[status]}
    </span>
  );
}
