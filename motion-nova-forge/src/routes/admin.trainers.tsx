import { createFileRoute } from "@tanstack/react-router";
import { Pencil, Plus, RotateCcw, Search, Trash2, UserRound } from "lucide-react";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
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
} from "@/components/dash/Primitives";
import { useClientPagination } from "@/hooks/useClientPagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { errorMessage } from "@/api/client";
import { catalogService, trainerService } from "@/services";
import type { Trainer } from "@/types/domain";

export const Route = createFileRoute("/admin/trainers")({
  head: () => ({
    meta: [
      { title: "Gestion des formateurs — i-Motion Academy" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TrainersPage,
});

const field =
  "h-10 w-full rounded-xl border border-border/60 bg-secondary/40 px-3 text-sm outline-none focus:border-electric/50";
const area =
  "min-h-24 w-full rounded-xl border border-border/60 bg-secondary/40 px-3 py-2 text-sm outline-none focus:border-electric/50";

interface TrainerForm {
  userId: string;
  slug: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  speciality: string;
  expertise: string;
  biography: string;
  photoUrl: string;
  yearsExperience: number;
  trainingIds: string[];
}

const EMPTY: TrainerForm = {
  userId: "",
  slug: "",
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  speciality: "",
  expertise: "",
  biography: "",
  photoUrl: "",
  yearsExperience: 0,
  trainingIds: [],
};

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function TrainersPage() {
  const queryClient = useQueryClient();
  const {
    data = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["admin-trainers"],
    queryFn: () => trainerService.adminList(),
  });
  const {
    data: trainings = [],
    isLoading: trainingsLoading,
    isError: trainingsError,
  } = useQuery({
    queryKey: ["admin-trainings"],
    queryFn: () => catalogService.adminTrainings(),
  });
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"ALL" | "ACTIVE" | "ARCHIVED">("ALL");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Trainer | null>(null);
  const [form, setForm] = useState<TrainerForm>(EMPTY);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [formError, setFormError] = useState("");

  const visible = useMemo(
    () =>
      data.filter((trainer) => {
        const matchesStatus =
          filter === "ALL" ||
          (filter === "ACTIVE" ? trainer.active !== false : trainer.active === false);
        const haystack =
          `${trainer.firstName} ${trainer.lastName} ${trainer.email} ${trainer.speciality} ${trainer.expertise.join(" ")}`.toLocaleLowerCase(
            "fr",
          );
        return matchesStatus && haystack.includes(search.trim().toLocaleLowerCase("fr"));
      }),
    [data, filter, search],
  );
  const pagination = useClientPagination(visible, JSON.stringify([search, filter]));

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin-trainers"] });
    void queryClient.invalidateQueries({ queryKey: ["trainers"] });
    void queryClient.invalidateQueries({ queryKey: ["sessions"] });
    void queryClient.invalidateQueries({ queryKey: ["admin-sessions"] });
  };

  const save = useMutation({
    mutationFn: async () => {
      const slug = form.slug.trim() || slugify(`${form.firstName} ${form.lastName}`);
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
        throw new Error(
          "L’identifiant public doit contenir uniquement des lettres minuscules, chiffres et tirets.",
        );
      }
      const payload = {
        userId: form.userId.trim() || null,
        slug,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim() || null,
        speciality: form.speciality.trim(),
        expertise: form.expertise
          .split("\n")
          .map((item) => item.trim())
          .filter(Boolean),
        biography: form.biography.trim(),
        photoUrl: form.photoUrl.trim(),
        yearsExperience: form.yearsExperience,
        trainingIds: form.trainingIds,
        active: editing?.active ?? true,
      };
      return editing ? trainerService.update(editing.id, payload) : trainerService.create(payload);
    },
    onSuccess: () => {
      toast.success(editing ? "Formateur modifié." : "Formateur créé.");
      setOpen(false);
      setFormError("");
      refresh();
    },
    onError: (error) => setFormError(errorMessage(error)),
  });

  const archive = useMutation({
    mutationFn: (id: string) => trainerService.archive(id),
    onSuccess: () => {
      toast.success("Formateur archivé. Son historique est conservé.");
      refresh();
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
  const restore = useMutation({
    mutationFn: (id: string) => trainerService.restore(id),
    onSuccess: () => {
      toast.success("Formateur réactivé.");
      refresh();
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setSlugManuallyEdited(false);
    setFormError("");
    setOpen(true);
  };

  const openEdit = (trainer: Trainer) => {
    setEditing(trainer);
    setForm({
      userId: trainer.userId ?? "",
      slug: trainer.slug,
      firstName: trainer.firstName,
      lastName: trainer.lastName,
      email: trainer.email,
      phone: trainer.phone ?? "",
      speciality: trainer.speciality,
      expertise: trainer.expertise.join("\n"),
      biography: trainer.biography,
      photoUrl: trainer.photoUrl,
      yearsExperience: trainer.yearsExperience,
      trainingIds: trainer.trainingIds ?? trainer.trainings?.map((training) => training.id) ?? [],
    });
    setSlugManuallyEdited(true);
    setFormError("");
    setOpen(true);
  };

  const setName = (firstName: string, lastName: string) => {
    setForm({
      ...form,
      firstName,
      lastName,
      ...(!slugManuallyEdited && !editing ? { slug: slugify(`${firstName} ${lastName}`) } : {}),
    });
  };

  const labelClass = "text-xs text-muted-foreground";
  const activeCount = data.filter((trainer) => trainer.active !== false).length;

  return (
    <>
      <DashHeader
        title="Formateurs"
        subtitle="Gérez les profils pédagogiques et leurs domaines d’intervention."
        actions={
          <Button variant="electric" size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" /> Ajouter un formateur
          </Button>
        }
      />
      <Panel
        title="Référentiel des formateurs"
        description={`${activeCount} actif(s) · ${data.length - activeCount} archivé(s)`}
      >
        <div className="mb-5 flex flex-col gap-3 sm:flex-row">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Rechercher par nom, spécialité, courriel…"
              aria-label="Rechercher un formateur"
              className="h-10 rounded-xl border-border/60 bg-secondary/40 pl-9"
            />
          </div>
          <select
            className={`${field} sm:w-52`}
            value={filter}
            onChange={(event) => setFilter(event.target.value as typeof filter)}
            aria-label="Filtrer les formateurs"
          >
            <option value="ALL">Tous les formateurs</option>
            <option value="ACTIVE">Formateurs actifs</option>
            <option value="ARCHIVED">Formateurs archivés</option>
          </select>
        </div>
        {isLoading && <LoadingRows />}
        {isError && (
          <ErrorState
            message="Impossible de charger les formateurs."
            onRetry={() => void refetch()}
          />
        )}
        {!isLoading && !isError && visible.length === 0 && (
          <EmptyState
            title={search ? "Aucun résultat" : "Aucun formateur enregistré"}
            description={
              search
                ? "Essayez une autre recherche."
                : "Créez un profil pour le rendre disponible aux prochaines sessions."
            }
          />
        )}
        {!isLoading && !isError && visible.length > 0 && (
          <Table head={["Formateur", "Spécialité", "Expertise", "Formations", "Statut", "Actions"]}>
            {pagination.items.map((trainer) => {
              const selectedTrainings =
                trainer.trainings?.map((training) => training.title) ??
                (trainer.trainingIds ?? []).map(
                  (id) => trainings.find((training) => training.id === id)?.title ?? "Formation",
                );
              return (
                <Row key={trainer.id}>
                  <Cell>
                    <div className="flex items-center gap-3">
                      {trainer.photoUrl ? (
                        <img
                          src={trainer.photoUrl}
                          alt=""
                          className="h-10 w-10 rounded-xl object-cover"
                        />
                      ) : (
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-electric/10 text-electric">
                          <UserRound className="h-5 w-5" />
                        </span>
                      )}
                      <div className="min-w-0">
                        <p className="font-medium">
                          {trainer.firstName} {trainer.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">{trainer.email}</p>
                      </div>
                    </div>
                  </Cell>
                  <Cell>{trainer.speciality}</Cell>
                  <Cell className="max-w-56 whitespace-normal text-muted-foreground">
                    {trainer.expertise.slice(0, 3).join(" · ") || "—"}
                  </Cell>
                  <Cell className="max-w-56 whitespace-normal text-muted-foreground">
                    {selectedTrainings.join(", ") || "—"}
                  </Cell>
                  <Cell>
                    <StatusBadge tone={trainer.active === false ? "neutral" : "success"}>
                      {trainer.active === false ? "Archivé" : "Actif"}
                    </StatusBadge>
                  </Cell>
                  <Cell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Modifier ${trainer.firstName} ${trainer.lastName}`}
                        onClick={() => openEdit(trainer)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {trainer.active === false ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Réactiver ${trainer.firstName} ${trainer.lastName}`}
                          disabled={restore.isPending}
                          onClick={() => restore.mutate(trainer.id)}
                        >
                          <RotateCcw className="h-4 w-4 text-electric" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Archiver ${trainer.firstName} ${trainer.lastName}`}
                          disabled={archive.isPending}
                          onClick={() => archive.mutate(trainer.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </Cell>
                </Row>
              );
            })}
          </Table>
        )}
        {!isLoading && !isError && visible.length > 0 && (
          <PaginationControls {...pagination} onPageChange={pagination.setPage} />
        )}
      </Panel>

      <Dialog
        open={open}
        onOpenChange={(value) => {
          setOpen(value);
          if (!value) setFormError("");
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Modifier un formateur" : "Créer un profil formateur"}
            </DialogTitle>
            <DialogDescription>
              Le profil reste distinct d’un compte de connexion. L’archivage préserve les
              associations historiques.
            </DialogDescription>
          </DialogHeader>
          <form
            className="grid gap-4 sm:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              setFormError("");
              save.mutate();
            }}
          >
            <label className={labelClass}>
              Prénom
              <input
                className={field}
                required
                maxLength={100}
                value={form.firstName}
                onChange={(event) => setName(event.target.value, form.lastName)}
              />
            </label>
            <label className={labelClass}>
              Nom
              <input
                className={field}
                required
                maxLength={100}
                value={form.lastName}
                onChange={(event) => setName(form.firstName, event.target.value)}
              />
            </label>
            <label className="sm:col-span-2 text-xs text-muted-foreground">
              Courriel professionnel
              <input
                className={field}
                type="email"
                required
                maxLength={200}
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
              />
            </label>
            <label className={labelClass}>
              Téléphone
              <input
                className={field}
                maxLength={40}
                value={form.phone}
                onChange={(event) => setForm({ ...form, phone: event.target.value })}
              />
            </label>
            <label className={labelClass}>
              Spécialité
              <input
                className={field}
                required
                maxLength={160}
                value={form.speciality}
                onChange={(event) => setForm({ ...form, speciality: event.target.value })}
              />
            </label>
            <label className="sm:col-span-2 text-xs text-muted-foreground">
              Identifiant public (slug)
              <input
                className={field}
                required
                maxLength={180}
                pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                value={form.slug}
                onChange={(event) => {
                  setSlugManuallyEdited(true);
                  setForm({ ...form, slug: event.target.value });
                }}
              />
              <span className="mt-1 block text-[0.7rem]">
                Lettres minuscules sans accents, chiffres et tirets. Généré à partir du nom ;
                modifiable.
              </span>
            </label>
            <label className={labelClass}>
              Années d’expérience
              <input
                className={field}
                type="number"
                min={0}
                step={1}
                value={form.yearsExperience}
                onChange={(event) =>
                  setForm({ ...form, yearsExperience: Number(event.target.value) })
                }
              />
            </label>
            <label className={labelClass}>
              URL de la photo
              <input
                className={field}
                type="url"
                maxLength={1024}
                value={form.photoUrl}
                onChange={(event) => setForm({ ...form, photoUrl: event.target.value })}
              />
            </label>
            <label className="sm:col-span-2 text-xs text-muted-foreground">
              Domaines d’expertise (un par ligne)
              <textarea
                className={area}
                maxLength={5000}
                value={form.expertise}
                onChange={(event) => setForm({ ...form, expertise: event.target.value })}
              />
            </label>
            <label className="sm:col-span-2 text-xs text-muted-foreground">
              Biographie
              <textarea
                className={area}
                maxLength={5000}
                value={form.biography}
                onChange={(event) => setForm({ ...form, biography: event.target.value })}
              />
            </label>
            <div className="sm:col-span-2">
              <p className={labelClass}>Formations associées</p>
              <p className="mt-1 text-[0.7rem] text-muted-foreground">
                Sélectionnez les formations pour lesquelles ce profil peut intervenir.
              </p>
              {trainingsLoading ? (
                <div className="mt-3">
                  <LoadingRows rows={2} />
                </div>
              ) : trainingsError ? (
                <p role="alert" className="mt-2 text-sm text-destructive">
                  Impossible de charger les formations ; réessayez avant d’enregistrer les
                  associations.
                </p>
              ) : (
                <div className="mt-2 grid max-h-40 gap-2 overflow-y-auto rounded-xl border border-border/60 p-3 sm:grid-cols-2">
                  {trainings.map((training) => (
                    <label
                      key={training.id}
                      className="flex items-start gap-2 text-xs text-muted-foreground"
                    >
                      <input
                        type="checkbox"
                        checked={form.trainingIds.includes(training.id)}
                        onChange={(event) =>
                          setForm({
                            ...form,
                            trainingIds: event.target.checked
                              ? [...form.trainingIds, training.id]
                              : form.trainingIds.filter((id) => id !== training.id),
                          })
                        }
                      />
                      <span>{training.title}</span>
                    </label>
                  ))}
                  {trainings.length === 0 && (
                    <p className="text-xs text-muted-foreground">Aucune formation disponible.</p>
                  )}
                </div>
              )}
            </div>
            <label className="sm:col-span-2 text-xs text-muted-foreground">
              Compte utilisateur associé (facultatif)
              <input
                className={field}
                value={form.userId}
                onChange={(event) => setForm({ ...form, userId: event.target.value })}
                placeholder="UUID du compte"
              />
              <span className="mt-1 block text-[0.7rem]">
                Laissez vide si le formateur n’a pas besoin d’un compte de connexion.
              </span>
            </label>
            {formError && (
              <p
                role="alert"
                className="sm:col-span-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
              >
                {formError}
              </p>
            )}
            <DialogFooter className="sm:col-span-2">
              <Button type="button" variant="glass" onClick={() => setOpen(false)}>
                Annuler
              </Button>
              <Button
                type="submit"
                variant="electric"
                disabled={save.isPending || trainingsLoading || trainingsError}
              >
                {save.isPending ? "Enregistrement…" : editing ? "Enregistrer" : "Créer le profil"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
