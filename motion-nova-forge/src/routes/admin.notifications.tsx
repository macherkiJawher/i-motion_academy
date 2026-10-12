import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
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

export const Route = createFileRoute("/admin/notifications")({
  head: () => ({
    meta: [{ title: "Notifications — i-Motion Academy" }, { name: "robots", content: "noindex" }],
  }),
  component: Page,
});

function Page() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => notificationService.list(),
  });
  const pagination = useClientPagination(data);
  return (
    <>
      <DashHeader title="Notifications" subtitle="Reminders, payments and status changes." />
      <Panel>
        {isLoading ? (
          <LoadingRows />
        ) : data.length === 0 ? (
          <EmptyState title="Nothing new" />
        ) : (
          <ul className="space-y-3">
            {pagination.items.map((n) => (
              <li key={n.id} className="rounded-2xl border border-border/50 bg-secondary/30 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-display text-sm font-semibold">{n.title}</p>
                  {!n.read && <StatusBadge tone="electric">New</StatusBadge>}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{n.message}</p>
                <p className="mt-2 text-xs text-muted-foreground/70">{formatDate(n.createdAt)}</p>
              </li>
            ))}
          </ul>
        )}
        {!isLoading && data.length > 0 && (
          <PaginationControls {...pagination} onPageChange={pagination.setPage} />
        )}
      </Panel>
    </>
  );
}
