import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { DashHeader, Panel, Table, Row, Cell, StatCard, StatusBadge, EmptyState, LoadingRows, formatDate, formatMoney, statusLabel, statusTone } from "@/components/dash/Primitives";
import { useAuth } from "@/hooks/useAuth";
import { registrationService, paymentService, certificateService, notificationService, sessionService, catalogService, userService, contactService, analyticsService, trainerService } from "@/services";

export const Route = createFileRoute("/dashboard/registrations")({
  head: () => ({ meta: [{ title: "My registrations — i-Motion Academy" }, { name: "robots", content: "noindex" }] }),
  component: Page,
});

function Page() {
  const { user } = useAuth();
  const uid = user?.id ?? "u-1";
  const { data = [], isLoading } = useQuery({ queryKey: ["regs", uid], queryFn: () => registrationService.mine(uid) });
  return (
    <>
      <DashHeader title="My registrations" subtitle="Follow each file from submission to certificate." />
      <Panel>
        {isLoading ? <LoadingRows /> : data.length === 0 ? <EmptyState title="No registration yet" /> : (
          <Table head={["Reference", "Training", "Session", "Status", "Payment", "Amount"]}>
            {data.map((r) => (
              <Row key={r.id}>
                <Cell className="text-muted-foreground">{r.reference}</Cell>
                <Cell>{r.trainingTitle}</Cell>
                <Cell>{formatDate(r.sessionStartDate)} · {r.sessionCity ?? "Lieu à confirmer"}</Cell>
                <Cell><StatusBadge tone={statusTone(r.status)}>{statusLabel(r.status)}</StatusBadge></Cell>
                <Cell><StatusBadge tone={statusTone(r.paymentStatus)}>{statusLabel(r.paymentStatus)}</StatusBadge></Cell>
                <Cell>{formatMoney(r.amountPaid, r.currency)} / {formatMoney(r.amountDue, r.currency)}</Cell>
              </Row>
            ))}
          </Table>
        )}
      </Panel>
    </>
  );
}
