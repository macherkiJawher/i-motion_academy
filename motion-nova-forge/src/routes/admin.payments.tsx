import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
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
import { Button } from "@/components/ui/button";
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

export const Route = createFileRoute("/admin/payments")({
  head: () => ({
    meta: [{ title: "Payments — i-Motion Academy" }, { name: "robots", content: "noindex" }],
  }),
  component: Page,
});

function Page() {
  const queryClient = useQueryClient();
  const [registrationId, setRegistrationId] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"CARD" | "TRANSFER" | "CASH" | "CHEQUE">("TRANSFER");
  const { data = [], isLoading } = useQuery({
    queryKey: ["payments"],
    queryFn: () => paymentService.list(),
  });
  const pagination = useClientPagination(data);
  const { data: registrations = [] } = useQuery({
    queryKey: ["registrations"],
    queryFn: () => registrationService.list(),
  });
  const createPayment = useMutation({
    mutationFn: () => paymentService.create({ registrationId, amount: Number(amount), method }),
    onSuccess: () => {
      setRegistrationId("");
      setAmount("");
      void queryClient.invalidateQueries({ queryKey: ["payments"] });
      void queryClient.invalidateQueries({ queryKey: ["registrations"] });
    },
  });
  return (
    <>
      <DashHeader title="Payments" subtitle="All recorded transactions." />
      <Panel title="Record a payment" className="mb-6">
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            createPayment.mutate();
          }}
        >
          <label className="min-w-64 flex-1 text-xs text-muted-foreground">
            Registration
            <select
              required
              value={registrationId}
              onChange={(event) => setRegistrationId(event.target.value)}
              className="mt-1 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
            >
              <option value="">Select a registration</option>
              {registrations
                .filter((r) => r.status !== "CANCELLED" && r.amountPaid < r.amountDue)
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.reference} · {r.participantName}
                  </option>
                ))}
            </select>
          </label>
          <label className="w-32 text-xs text-muted-foreground">
            Amount
            <input
              required
              min="0.01"
              step="0.01"
              type="number"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="mt-1 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
            />
          </label>
          <label className="w-36 text-xs text-muted-foreground">
            Method
            <select
              value={method}
              onChange={(event) => setMethod(event.target.value as typeof method)}
              className="mt-1 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
            >
              <option value="TRANSFER">Transfer</option>
              <option value="CARD">Card</option>
              <option value="CASH">Cash</option>
              <option value="CHEQUE">Cheque</option>
            </select>
          </label>
          <Button
            type="submit"
            variant="electric"
            disabled={createPayment.isPending || !registrationId || !amount}
          >
            {createPayment.isPending ? "Saving..." : "Record payment"}
          </Button>
        </form>
        {createPayment.isError && (
          <p className="mt-3 text-sm text-destructive">
            {createPayment.error instanceof Error
              ? createPayment.error.message
              : "Unable to record payment."}
          </p>
        )}
      </Panel>
      <Panel>
        {isLoading ? (
          <LoadingRows />
        ) : (
          <Table head={["Reference", "Participant", "Training", "Method", "Status", "Amount"]}>
            {pagination.items.map((p) => (
              <Row key={p.id}>
                <Cell className="text-muted-foreground">{p.reference}</Cell>
                <Cell>{p.participantName}</Cell>
                <Cell>{p.trainingTitle}</Cell>
                <Cell>{statusLabel(p.method)}</Cell>
                <Cell>
                  <StatusBadge tone={statusTone(p.status)}>{statusLabel(p.status)}</StatusBadge>
                </Cell>
                <Cell>{formatMoney(p.amount, p.currency)}</Cell>
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
