import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DashHeader,
  Panel,
  Table,
  Row,
  Cell,
  StatCard,
  StatusBadge,
  EmptyState,
  LoadingRows,
  PaginationControls,
  formatDate,
  formatMoney,
  statusLabel,
  statusTone,
} from "@/components/dash/Primitives";
import { useClientPagination } from "@/hooks/useClientPagination";
import { useAuth } from "@/hooks/useAuth";
import {
  registrationService,
  paymentService,
  certificateService,
  notificationService,
  sessionService,
  catalogService,
  userService,
  contactService,
  analyticsService,
  trainerService,
} from "@/services";

export const Route = createFileRoute("/admin/certificates")({
  head: () => ({
    meta: [{ title: "Certificates — i-Motion Academy" }, { name: "robots", content: "noindex" }],
  }),
  component: Page,
});

function Page() {
  const queryClient = useQueryClient();
  const [registrationId, setRegistrationId] = useState("");
  const { data = [], isLoading } = useQuery({
    queryKey: ["certificates"],
    queryFn: () => certificateService.list(),
  });
  const pagination = useClientPagination(data);
  const { data: registrations = [] } = useQuery({
    queryKey: ["registrations"],
    queryFn: () => registrationService.list(),
  });
  const issueCertificate = useMutation({
    mutationFn: () => certificateService.create({ registrationId, type: "CERTIFICATE" }),
    onSuccess: () => {
      setRegistrationId("");
      void queryClient.invalidateQueries({ queryKey: ["certificates"] });
      void queryClient.invalidateQueries({ queryKey: ["registrations"] });
    },
  });
  return (
    <>
      <DashHeader title="Certificates" subtitle="Issued certificates and diplomas." />
      <Panel title="Issue a certificate" className="mb-6">
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            issueCertificate.mutate();
          }}
        >
          <label className="min-w-64 flex-1 text-xs text-muted-foreground">
            Completed registration
            <select
              required
              value={registrationId}
              onChange={(event) => setRegistrationId(event.target.value)}
              className="mt-1 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
            >
              <option value="">Select a registration</option>
              {registrations
                .filter((r) => r.status === "COMPLETED" && !r.certificateId)
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.reference} · {r.participantName}
                  </option>
                ))}
            </select>
          </label>
          <Button
            type="submit"
            variant="electric"
            disabled={issueCertificate.isPending || !registrationId}
          >
            {issueCertificate.isPending ? "Issuing..." : "Issue certificate"}
          </Button>
        </form>
        {issueCertificate.isError && (
          <p className="mt-3 text-sm text-destructive">
            {issueCertificate.error instanceof Error
              ? issueCertificate.error.message
              : "Unable to issue certificate."}
          </p>
        )}
      </Panel>
      <Panel>
        {isLoading ? (
          <LoadingRows />
        ) : (
          <Table head={["Number", "Participant", "Training", "Type", "Issued", "Status"]}>
            {pagination.items.map((c) => (
              <Row key={c.id}>
                <Cell className="text-muted-foreground">{c.number}</Cell>
                <Cell>{c.participantName}</Cell>
                <Cell>{c.trainingTitle}</Cell>
                <Cell>{statusLabel(c.type)}</Cell>
                <Cell>{formatDate(c.issuedAt)}</Cell>
                <Cell>
                  <StatusBadge tone={statusTone(c.status)}>{statusLabel(c.status)}</StatusBadge>
                </Cell>
              </Row>
            ))}
          </Table>
        )}
        {!isLoading && data.length > 0 && (
          <PaginationControls {...pagination} onPageChange={pagination.setPage} />
        )}
      </Panel>
    </>
  );
}
