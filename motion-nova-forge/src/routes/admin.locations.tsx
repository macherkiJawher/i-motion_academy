import { createFileRoute } from "@tanstack/react-router";
import { MapPin, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { errorMessage } from "@/api/client";
import { catalogService } from "@/services";
import type { Location, LocationType } from "@/types/domain";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/admin/locations")({
  head: () => ({
    meta: [
      { title: "Gestion des lieux — i-Motion Academy" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LocationsPage,
});

const field =
  "h-10 w-full rounded-xl border border-border/60 bg-secondary/40 px-3 text-sm outline-none focus:border-electric/50";
const area =
  "min-h-24 w-full rounded-xl border border-border/60 bg-secondary/40 px-3 py-2 text-sm outline-none focus:border-electric/50";
type LocationForm = {
  name: string;
  type: LocationType;
  city: string;
  country: string;
  address: string;
  latitude: string;
  longitude: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  instructions: string;
};

const EMPTY: LocationForm = {
  name: "",
  type: "PHYSICAL",
  city: "",
  country: "Tunisie",
  address: "",
  latitude: "",
  longitude: "",
  contactName: "",
  contactPhone: "",
  contactEmail: "",
  instructions: "",
};

function LocationsPage() {
  const queryClient = useQueryClient();
  const {
    data = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["admin-locations"],
    queryFn: () => catalogService.adminLocations(),
  });
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"ALL" | "ACTIVE" | "ARCHIVED">("ALL");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Location | null>(null);
  const [form, setForm] = useState<LocationForm>(EMPTY);
  const [formError, setFormError] = useState("");

  const visible = useMemo(
    () =>
      data.filter((location) => {
        const matchesStatus =
          filter === "ALL" ||
          (filter === "ACTIVE" ? location.active !== false : location.active === false);
        const haystack =
          `${location.name} ${location.city} ${location.country} ${location.address}`.toLocaleLowerCase(
            "fr",
          );
        return matchesStatus && haystack.includes(search.trim().toLocaleLowerCase("fr"));
      }),
    [data, filter, search],
  );
  const pagination = useClientPagination(visible, JSON.stringify([search, filter]));

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin-locations"] });
    void queryClient.invalidateQueries({ queryKey: ["locations"] });
    void queryClient.invalidateQueries({ queryKey: ["sessions"] });
    void queryClient.invalidateQueries({ queryKey: ["admin-sessions"] });
  };

  const save = useMutation({
    mutationFn: async () => {
      if (Boolean(form.latitude) !== Boolean(form.longitude)) {
        throw new Error("La latitude et la longitude doivent être renseignées ensemble.");
      }
      if (
        form.type === "PHYSICAL" &&
        (!form.city.trim() || !form.country.trim() || !form.address.trim())
      ) {
        throw new Error("Un lieu physique doit avoir une ville, un pays et une adresse.");
      }
      const payload = {
        name: form.name.trim(),
        type: form.type,
        city: form.city.trim(),
        country: form.country.trim(),
        address: form.address.trim(),
        latitude: form.latitude.trim() ? Number(form.latitude) : null,
        longitude: form.longitude.trim() ? Number(form.longitude) : null,
        contactName: form.contactName.trim() || null,
        contactPhone: form.contactPhone.trim() || null,
        contactEmail: form.contactEmail.trim() || null,
        instructions: form.instructions.trim(),
        active: editing?.active ?? true,
      };
      return editing
        ? catalogService.updateLocation(editing.id, payload)
        : catalogService.createLocation(payload);
    },
    onSuccess: () => {
      toast.success(editing ? "Lieu modifié." : "Lieu créé.");
      setOpen(false);
      setFormError("");
      refresh();
    },
    onError: (error) => setFormError(errorMessage(error)),
  });

  const archive = useMutation({
    mutationFn: (id: string) => catalogService.archiveLocation(id),
    onSuccess: () => {
      toast.success("Lieu archivé. Il reste associé à son historique.");
      refresh();
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
  const restore = useMutation({
    mutationFn: (id: string) => catalogService.restoreLocation(id),
    onSuccess: () => {
      toast.success("Lieu réactivé.");
      refresh();
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setFormError("");
    setOpen(true);
  };

  const openEdit = (location: Location) => {
    setEditing(location);
    setForm({
      name: location.name,
      type: location.type ?? "PHYSICAL",
      city: location.city,
      country: location.country,
      address: location.address,
      latitude: location.latitude == null ? "" : String(location.latitude),
      longitude: location.longitude == null ? "" : String(location.longitude),
      contactName: location.contactName ?? "",
      contactPhone: location.contactPhone ?? "",
      contactEmail: location.contactEmail ?? "",
      instructions: location.instructions ?? "",
    });
    setFormError("");
    setOpen(true);
  };

  const labelClass = "text-xs text-muted-foreground";

  return (
    <>
      <DashHeader
        title="Lieux"
        subtitle="Gérez les lieux physiques et les espaces de formation en ligne."
        actions={
          <Button variant="electric" size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" /> Ajouter un lieu
          </Button>
        }
      />
      <Panel
        title="Référentiel des lieux"
        description={`${data.filter((item) => item.active !== false).length} actif(s) · ${data.filter((item) => item.active === false).length} archivé(s)`}
      >
        <div className="mb-5 flex flex-col gap-3 sm:flex-row">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Rechercher un lieu, une ville…"
            aria-label="Rechercher un lieu"
            className="h-10 rounded-xl border-border/60 bg-secondary/40"
          />
          <select
            className={`${field} sm:w-48`}
            value={filter}
            onChange={(event) => setFilter(event.target.value as typeof filter)}
            aria-label="Filtrer les lieux"
          >
            <option value="ALL">Tous les lieux</option>
            <option value="ACTIVE">Lieux actifs</option>
            <option value="ARCHIVED">Lieux archivés</option>
          </select>
        </div>
        {isLoading && <LoadingRows />}
        {isError && (
          <ErrorState message="Impossible de charger les lieux." onRetry={() => void refetch()} />
        )}
        {!isLoading && !isError && visible.length === 0 && (
          <EmptyState
            title={search ? "Aucun résultat" : "Aucun lieu enregistré"}
            description={
              search
                ? "Essayez une autre recherche."
                : "Créez le premier lieu pour le rendre disponible dans le référentiel."
            }
          />
        )}
        {!isLoading && !isError && visible.length > 0 && (
          <Table head={["Lieu", "Type", "Adresse", "Contact", "Statut", "Actions"]}>
            {pagination.items.map((location) => (
              <Row key={location.id}>
                <Cell>
                  <div className="flex items-center gap-2 font-medium">
                    <MapPin className="h-4 w-4 text-electric" />
                    {location.name}
                  </div>
                </Cell>
                <Cell>{location.type === "ONLINE" ? "En ligne" : "Présentiel"}</Cell>
                <Cell className="max-w-xs whitespace-normal text-muted-foreground">
                  {location.type === "ONLINE"
                    ? "Espace virtuel"
                    : [location.address, location.city, location.country]
                        .filter(Boolean)
                        .join(", ")}
                </Cell>
                <Cell className="text-muted-foreground">
                  {location.contactName || location.contactEmail || location.contactPhone || "—"}
                </Cell>
                <Cell>
                  <StatusBadge tone={location.active === false ? "neutral" : "success"}>
                    {location.active === false ? "Archivé" : "Actif"}
                  </StatusBadge>
                </Cell>
                <Cell>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Modifier ${location.name}`}
                      onClick={() => openEdit(location)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {location.active === false ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Réactiver ${location.name}`}
                        disabled={restore.isPending}
                        onClick={() => restore.mutate(location.id)}
                      >
                        <RotateCcw className="h-4 w-4 text-electric" />
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Archiver ${location.name}`}
                        disabled={archive.isPending}
                        onClick={() => archive.mutate(location.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </Cell>
              </Row>
            ))}
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
            <DialogTitle>{editing ? "Modifier un lieu" : "Créer un lieu"}</DialogTitle>
            <DialogDescription>
              Les lieux archivés ne pourront plus être associés aux nouvelles sessions ; leur
              historique est conservé.
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
            <label className={`${labelClass} sm:col-span-2`}>
              Nom du lieu
              <input
                className={field}
                required
                maxLength={180}
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
              />
            </label>
            <label className={labelClass}>
              Type
              <select
                className={field}
                value={form.type}
                onChange={(event) => setForm({ ...form, type: event.target.value as LocationType })}
              >
                <option value="PHYSICAL">Lieu physique</option>
                <option value="ONLINE">Espace en ligne</option>
              </select>
            </label>
            {form.type === "PHYSICAL" ? (
              <>
                <label className={labelClass}>
                  Ville
                  <input
                    className={field}
                    required
                    maxLength={120}
                    value={form.city}
                    onChange={(event) => setForm({ ...form, city: event.target.value })}
                  />
                </label>
                <label className={labelClass}>
                  Pays
                  <input
                    className={field}
                    required
                    maxLength={120}
                    value={form.country}
                    onChange={(event) => setForm({ ...form, country: event.target.value })}
                  />
                </label>
                <label className="sm:col-span-2 text-xs text-muted-foreground">
                  Adresse
                  <input
                    className={field}
                    required
                    maxLength={300}
                    value={form.address}
                    onChange={(event) => setForm({ ...form, address: event.target.value })}
                  />
                </label>
                <label className={labelClass}>
                  Latitude
                  <input
                    className={field}
                    type="number"
                    min={-90}
                    max={90}
                    step="any"
                    value={form.latitude}
                    onChange={(event) => setForm({ ...form, latitude: event.target.value })}
                  />
                </label>
                <label className={labelClass}>
                  Longitude
                  <input
                    className={field}
                    type="number"
                    min={-180}
                    max={180}
                    step="any"
                    value={form.longitude}
                    onChange={(event) => setForm({ ...form, longitude: event.target.value })}
                  />
                </label>
              </>
            ) : (
              <p className="sm:col-span-2 rounded-xl border border-electric/20 bg-electric/5 p-3 text-xs text-muted-foreground">
                Les espaces en ligne n’ont pas d’adresse physique. Ajoutez les informations de
                connexion dans les instructions.
              </p>
            )}
            <div className="sm:col-span-2 mt-2 border-b border-border/60 pb-2">
              <h3 className="text-sm font-semibold">Contact et accès</h3>
            </div>
            <label className={labelClass}>
              Personne à contacter
              <input
                className={field}
                maxLength={160}
                value={form.contactName}
                onChange={(event) => setForm({ ...form, contactName: event.target.value })}
              />
            </label>
            <label className={labelClass}>
              Téléphone
              <input
                className={field}
                maxLength={40}
                value={form.contactPhone}
                onChange={(event) => setForm({ ...form, contactPhone: event.target.value })}
              />
            </label>
            <label className="sm:col-span-2 text-xs text-muted-foreground">
              Courriel de contact
              <input
                className={field}
                type="email"
                maxLength={200}
                value={form.contactEmail}
                onChange={(event) => setForm({ ...form, contactEmail: event.target.value })}
              />
            </label>
            <label className="sm:col-span-2 text-xs text-muted-foreground">
              Consignes d’accès ou de connexion
              <textarea
                className={area}
                maxLength={5000}
                value={form.instructions}
                onChange={(event) => setForm({ ...form, instructions: event.target.value })}
              />
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
              <Button type="submit" variant="electric" disabled={save.isPending}>
                {save.isPending ? "Enregistrement…" : editing ? "Enregistrer" : "Créer le lieu"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
