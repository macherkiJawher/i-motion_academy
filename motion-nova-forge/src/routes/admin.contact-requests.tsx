import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DashHeader,
  Panel,
  StatusBadge,
  EmptyState,
  ErrorState,
  LoadingRows,
  PaginationControls,
  formatDate,
  statusLabel,
  statusTone,
} from "@/components/dash/Primitives";
import { Button } from "@/components/ui/button";
import { useClientPagination } from "@/hooks/useClientPagination";
import { errorMessage } from "@/api/client";
import { z } from "zod";
import { contactService } from "@/services";
import type { ContactRequest } from "@/types/domain";

export const Route = createFileRoute("/admin/contact-requests")({
  validateSearch: z.object({
    status: z.enum(["NEW", "IN_PROGRESS", "RESOLVED", "TO_PROCESS"]).optional(),
  }),
  head: () => ({
    meta: [
      { title: "Demandes de contact — i-Motion Academy" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Page,
});

function Page() {
  const { status } = Route.useSearch();
  const queryClient = useQueryClient();
  const {
    data = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["contact"],
    queryFn: () => contactService.list(),
  });
  const statusMutation = useMutation({
    mutationFn: ({ id, nextStatus }: { id: string; nextStatus: ContactRequest["status"] }) =>
      contactService.updateStatus(id, nextStatus),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["contact"] }),
        queryClient.invalidateQueries({ queryKey: ["contacts"] }),
      ]);
    },
  });
  const visibleRequests = data.filter((request) =>
    status === "TO_PROCESS" ? request.status !== "RESOLVED" : !status || request.status === status,
  );
  const pagination = useClientPagination(visibleRequests, status);
  return (
    <>
      <DashHeader
        title="Demandes de contact"
        subtitle={
          status === "TO_PROCESS"
            ? "Demandes nouvelles ou en cours de traitement."
            : "Messages reçus depuis le formulaire de contact."
        }
      />
      <Panel>
        {statusMutation.isError && (
          <p className="mb-4 text-sm text-destructive" role="alert">
            Impossible de mettre à jour le statut. {errorMessage(statusMutation.error)}
          </p>
        )}
        {isError ? (
          <ErrorState
            message={`Impossible de charger les demandes de contact. ${errorMessage(error)}`}
            onRetry={() => void refetch()}
          />
        ) : isLoading ? (
          <LoadingRows />
        ) : visibleRequests.length === 0 ? (
          <EmptyState
            title={data.length ? "Aucun résultat" : "Aucune demande de contact"}
            {...(data.length ? { description: "Aucune demande ne correspond à ce filtre." } : {})}
          />
        ) : (
          <ul className="space-y-3">
            {pagination.items.map((c) => (
              <li key={c.id} className="rounded-2xl border border-border/50 bg-secondary/30 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-display text-sm font-semibold">{c.subject}</p>
                  <StatusBadge tone={statusTone(c.status)}>{statusLabel(c.status)}</StatusBadge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{c.message}</p>
                <p className="mt-2 text-xs text-muted-foreground/70">
                  {c.firstName} {c.lastName} ·{" "}
                  <a className="text-electric hover:underline" href={`mailto:${c.email}`}>
                    {c.email}
                  </a>
                  {c.phone && <> · {c.phone}</>} · {formatDate(c.createdAt)}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {c.status === "NEW" && (
                    <Button
                      type="button"
                      size="sm"
                      variant="glass"
                      disabled={statusMutation.isPending}
                      onClick={() => statusMutation.mutate({ id: c.id, nextStatus: "IN_PROGRESS" })}
                    >
                      Prendre en charge
                    </Button>
                  )}
                  {c.status !== "RESOLVED" && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={statusMutation.isPending}
                      onClick={() => statusMutation.mutate({ id: c.id, nextStatus: "RESOLVED" })}
                    >
                      Marquer comme traitée
                    </Button>
                  )}
                  {c.status === "RESOLVED" && (
                    <Button
                      type="button"
                      size="sm"
                      variant="glass"
                      disabled={statusMutation.isPending}
                      onClick={() => statusMutation.mutate({ id: c.id, nextStatus: "IN_PROGRESS" })}
                    >
                      Rouvrir
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        {!isLoading && visibleRequests.length > 0 && (
          <PaginationControls {...pagination} onPageChange={pagination.setPage} />
        )}
      </Panel>
    </>
  );
}
