import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { DashHeader, Panel, Table, Row, Cell, StatCard, StatusBadge, EmptyState, LoadingRows, formatDate, formatMoney, statusLabel, statusTone } from "@/components/dash/Primitives";
import { useAuth } from "@/hooks/useAuth";
import { registrationService, paymentService, certificateService, notificationService, sessionService, catalogService, userService, contactService, analyticsService, trainerService } from "@/services";

export const Route = createFileRoute("/dashboard/")({
  head: () => ({ meta: [{ title: "My academy — i-Motion Academy" }, { name: "robots", content: "noindex" }] }),
  component: Page,
});

function Page() {
  const { user } = useAuth();
  const uid = user?.id ?? "u-1";
  const regs = useQuery({ queryKey: ["regs", uid], queryFn: () => registrationService.mine(uid) });
  const certs = useQuery({ queryKey: ["certs", uid], queryFn: () => certificateService.mine(uid) });
  const list = regs.data ?? [];
  const next = list.filter((r) => r.status !== "CANCELLED").sort((a, b) => a.sessionStartDate.localeCompare(b.sessionStartDate))[0];

  return (
    <>
      <DashHeader title={`Welcome back, ${user?.firstName ?? "athlete"}`} subtitle="Your registrations, payments and certificates in one place." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Registrations" value={list.length} index={0} />
        <StatCard label="Confirmed" value={list.filter((r) => r.status === "CONFIRMED").length} index={1} />
        <StatCard label="Completed" value={list.filter((r) => r.status === "COMPLETED").length} index={2} />
        <StatCard label="Certificates" value={(certs.data ?? []).length} index={3} />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title="Next session">
          {next ? (
            <div className="space-y-1 text-sm text-muted-foreground">
              <p className="font-display text-base font-semibold text-foreground">{next.trainingTitle}</p>
              <p>{formatDate(next.sessionStartDate)} · {next.city}</p>
              <p>Reference {next.reference}</p>
            </div>
          ) : (
            <EmptyState title="No upcoming session" description="Browse the calendar to book your next certification." />
          )}
        </Panel>
        <Panel title="Recent registrations">
          {regs.isLoading ? <LoadingRows rows={3} /> : (
            <Table head={["Training", "Date", "Status", "Payment"]}>
              {list.slice(0, 4).map((r) => (
                <Row key={r.id}>
                  <Cell>{r.trainingTitle}</Cell>
                  <Cell>{formatDate(r.sessionStartDate)}</Cell>
                  <Cell><StatusBadge tone={statusTone(r.status)}>{statusLabel(r.status)}</StatusBadge></Cell>
                  <Cell><StatusBadge tone={statusTone(r.paymentStatus)}>{statusLabel(r.paymentStatus)}</StatusBadge></Cell>
                </Row>
              ))}
            </Table>
          )}
        </Panel>
      </div>
    </>
  );
}
