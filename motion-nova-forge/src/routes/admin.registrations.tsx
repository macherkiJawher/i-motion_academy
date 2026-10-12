import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { downloadFile } from "@/api/client";
import {
  DashHeader,
  EmptyState,
  Panel,
  Table,
  Row,
  Cell,
  StatusBadge,
  LoadingRows,
  PaginationControls,
  formatDate,
  statusLabel,
  statusTone,
} from "@/components/dash/Primitives";
import { useClientPagination } from "@/hooks/useClientPagination";
import { isIncompleteRegistration } from "@/lib/admin-dashboard.js";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { registrationService } from "@/services";
import type { PaymentStatus, Registration, RegistrationStatus } from "@/types/domain";
import { z } from "zod";

export const Route = createFileRoute("/admin/registrations")({
  validateSearch: z.object({
    status: z.enum(["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED"]).optional(),
    incomplete: z.enum(["true", "false"]).optional(),
  }),
  head: () => ({
    meta: [{ title: "Inscriptions — i-Motion Academy" }, { name: "robots", content: "noindex" }],
  }),
  component: Page,
});

function Page() {
  const searchParams = Route.useSearch();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Registration | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<RegistrationStatus | "ALL">(
    searchParams.status ?? "ALL",
  );
  const [incompleteOnly, setIncompleteOnly] = useState(searchParams.incomplete === "true");
  const [paymentFilter, setPaymentFilter] = useState<PaymentStatus | "ALL">("ALL");
  useEffect(() => {
    setStatusFilter(searchParams.status ?? "ALL");
    setIncompleteOnly(searchParams.incomplete === "true");
  }, [searchParams.status, searchParams.incomplete]);
  const { data = [], isLoading } = useQuery({
    queryKey: ["registrations"],
    queryFn: () => registrationService.list(),
  });
  const normalizedSearch = search.trim().toLocaleLowerCase("fr");
  const visibleRegistrations = data.filter((registration) => {
    const haystack = [
      registration.reference,
      registration.participantName,
      registration.participantEmail,
      registration.phone,
      registration.trainingTitle,
      registration.sessionCity,
      registration.sessionStartDate,
    ]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase("fr");
    return (
      (!normalizedSearch || haystack.includes(normalizedSearch)) &&
      (statusFilter === "ALL" || registration.status === statusFilter) &&
      (paymentFilter === "ALL" || registration.paymentStatus === paymentFilter) &&
      (!incompleteOnly || isIncompleteRegistration(registration))
    );
  });
  const pagination = useClientPagination(
    visibleRegistrations,
    JSON.stringify([search, statusFilter, paymentFilter, incompleteOnly]),
  );
  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "CONFIRMED" | "CANCELLED" | "COMPLETED" }) =>
      registrationService.updateStatus(id, status),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["registrations"] }),
  });
  return (
    <>
      <DashHeader
        title="Inscriptions"
        subtitle="Validez les dossiers et suivez les paiements et la progression des participants."
      />
      <Panel>
        <div className="mb-5 flex flex-col gap-3 sm:flex-row">
          {incompleteOnly && (
            <button
              type="button"
              onClick={() => setIncompleteOnly(false)}
              className="rounded-xl border border-electric/40 bg-electric/10 px-3 py-2 text-sm text-electric"
            >
              Dossiers incomplets uniquement · Effacer
            </button>
          )}
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Rechercher par référence, participant, formation…"
              aria-label="Rechercher une inscription"
              className="h-10 w-full rounded-xl border border-border/60 bg-secondary/40 pl-9 pr-3 text-sm outline-none focus:border-electric/50"
            />
          </div>
          <select
            className="h-10 rounded-xl border border-border/60 bg-secondary/40 px-3 text-sm outline-none focus:border-electric/50 sm:w-48"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as RegistrationStatus | "ALL")}
            aria-label="Filtrer par statut d'inscription"
          >
            <option value="ALL">Tous les statuts</option>
            {(["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED"] as const).map((status) => (
              <option key={status} value={status}>
                {statusLabel(status)}
              </option>
            ))}
          </select>
          <select
            className="h-10 rounded-xl border border-border/60 bg-secondary/40 px-3 text-sm outline-none focus:border-electric/50 sm:w-48"
            value={paymentFilter}
            onChange={(event) => setPaymentFilter(event.target.value as PaymentStatus | "ALL")}
            aria-label="Filtrer par statut de paiement"
          >
            <option value="ALL">Tous les paiements</option>
            {(["PENDING", "PARTIAL", "PAID", "FAILED"] as const).map((status) => (
              <option key={status} value={status}>
                {statusLabel(status)}
              </option>
            ))}
          </select>
        </div>
        {isLoading ? (
          <LoadingRows />
        ) : visibleRegistrations.length === 0 ? (
          <EmptyState
            title={data.length ? "Aucun résultat" : "Aucune inscription enregistrée"}
            {...(data.length ? { description: "Modifiez la recherche ou les filtres." } : {})}
          />
        ) : (
          <Table
            head={[
              "Référence",
              "Participant",
              "Formation",
              "Session",
              "Statut",
              "Paiement",
              "Actions",
            ]}
          >
            {pagination.items.map((r) => (
              <Row key={r.id}>
                <Cell className="text-muted-foreground">{r.reference}</Cell>
                <Cell>{r.participantName}</Cell>
                <Cell>{r.trainingTitle}</Cell>
                <Cell>{formatDate(r.sessionStartDate)}</Cell>
                <Cell>
                  <StatusBadge tone={statusTone(r.status)}>{statusLabel(r.status)}</StatusBadge>
                </Cell>
                <Cell>
                  <StatusBadge tone={statusTone(r.paymentStatus)}>
                    {statusLabel(r.paymentStatus)}
                  </StatusBadge>
                </Cell>
                <Cell>
                  {r.status === "CONFIRMED" && (
                    <Button
                      size="sm"
                      variant="electric"
                      disabled={updateStatus.isPending}
                      onClick={() => updateStatus.mutate({ id: r.id, status: "COMPLETED" })}
                    >
                      Terminer
                    </Button>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`Voir l'inscription ${r.reference}`}
                    onClick={() => setSelected(r)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </Cell>
              </Row>
            ))}
          </Table>
        )}
        {!isLoading && visibleRegistrations.length > 0 && (
          <PaginationControls {...pagination} onPageChange={pagination.setPage} />
        )}
      </Panel>
      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Dossier {selected?.reference}</DialogTitle>
            <DialogDescription>
              Informations fournies dans le formulaire d'inscription.
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="grid gap-5 text-sm sm:grid-cols-2">
              <Detail label="Participant" value={selected.participantName} />
              <Detail label="E-mail" value={selected.participantEmail} />
              <Detail label="Téléphone" value={selected.phone} />
              <Detail
                label="Date de naissance"
                value={selected.birthDate ? formatDate(selected.birthDate) : null}
              />
              <Detail label="Adresse" value={selected.address} />
              <Detail
                label="Ville / pays du candidat"
                value={[selected.city, selected.country].filter(Boolean).join(", ")}
              />
              <Detail label="Ville de la session" value={selected.sessionCity} />
              <Detail label="Niveau d'études" value={selected.educationLevel} />
              <Detail label="Situation professionnelle" value={selected.employmentStatus} />
              <Detail label="Expérience professionnelle" value={selected.workExperience} wide />
              <DocumentDetail
                label="Pièce d'identité"
                registrationId={selected.id}
                kind="identity"
                available={selected.identityDocumentAvailable === true}
              />
              <DocumentDetail
                label="CV / justificatif de diplôme"
                registrationId={selected.id}
                kind="qualification"
                available={selected.qualificationDocumentAvailable === true}
              />
              <Detail label="Source de découverte" value={selected.referralSource} />
              <Detail label="Message de motivation" value={selected.motivation} wide />
              <Detail label="Formation" value={selected.trainingTitle} />
              <Detail label="Session" value={formatDate(selected.sessionStartDate)} />
              <Detail label="Statut" value={statusLabel(selected.status)} />
              <Detail label="Paiement" value={statusLabel(selected.paymentStatus)} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function Detail({
  label,
  value,
  wide = false,
}: {
  label: string;
  value?: string | null;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="mt-1 whitespace-pre-wrap rounded-xl border border-border/60 bg-secondary/30 px-3 py-2">
        {value || "Non renseigné"}
      </p>
    </div>
  );
}

function DocumentDetail({
  label,
  registrationId,
  kind,
  available,
}: {
  label: string;
  registrationId: string;
  kind: "identity" | "qualification";
  available: boolean;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      {available ? (
        <button
          type="button"
          onClick={async () => {
            const blob = await downloadFile(`/registrations/${registrationId}/documents/${kind}`);
            const objectUrl = URL.createObjectURL(blob);
            window.open(objectUrl, "_blank", "noopener,noreferrer");
            window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
          }}
          className="mt-1 block w-full rounded-xl border border-electric/40 bg-electric/10 px-3 py-2 text-left text-electric hover:bg-electric/20"
        >
          Ouvrir le document
        </button>
      ) : (
        <p className="mt-1 rounded-xl border border-border/60 bg-secondary/30 px-3 py-2">
          Non fourni
        </p>
      )}
    </div>
  );
}
