import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Activity, Clock3, Download, ShieldAlert, Users } from "lucide-react";
import { useState, useRef } from "react";
import {
  Cell,
  DashHeader,
  EmptyState,
  LoadingRows,
  PaginationControls,
  Panel,
  Row,
  StatCard,
  StatusBadge,
  Table,
  formatDate,
  statusTone,
} from "@/components/dash/Primitives";
import { useClientPagination } from "@/hooks/useClientPagination";
import { auditService } from "@/services";

export const Route = createFileRoute("/admin/audit")({
  head: () => ({
    meta: [{ title: "Audit logs — i-Motion Academy" }, { name: "robots", content: "noindex" }],
  }),
  component: Page,
});

function Page() {
  const [filters, setFilters] = useState({
    status: "",
    role: "",
    entity: "",
    startDate: "",
    endDate: "",
  });

  const queryString = new URLSearchParams();
  if (filters.status) queryString.append("status", filters.status);
  if (filters.role) queryString.append("actorRole", filters.role);
  if (filters.entity) queryString.append("entity", filters.entity);
  if (filters.startDate) queryString.append("startDate", filters.startDate);
  if (filters.endDate) queryString.append("endDate", filters.endDate);

  const { data, isLoading } = useQuery({
    queryKey: ["audit-logs", filters],
    queryFn: () => auditService.list(queryString.toString()),
  });

  const summary = data?.summary;
  const actionsPagination = useClientPagination(data?.actions ?? [], JSON.stringify(filters));
  const sessionsPagination = useClientPagination(data?.userSessions ?? [], JSON.stringify(filters));

  const handleExportCsv = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append("status", filters.status);
      if (filters.role) params.append("actorRole", filters.role);
      if (filters.entity) params.append("entity", filters.entity);
      if (filters.startDate) params.append("startDate", filters.startDate);
      if (filters.endDate) params.append("endDate", filters.endDate);

      const url = `/admin/audit-logs/export?${params.toString()}`;
      const link = document.createElement("a");
      link.href = url;
      link.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Export failed:", error);
    }
  };

  return (
    <>
      <DashHeader
        title="Audit logs"
        subtitle="Administrative actions and active user sessions across the platform."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Admin actions"
          value={summary?.totalActions ?? 0}
          icon={Activity}
          index={0}
        />
        <StatCard
          label="Active sessions"
          value={summary?.activeSessions ?? 0}
          icon={Users}
          index={1}
        />
        <StatCard
          label="Risky sessions"
          value={summary?.riskySessions ?? 0}
          icon={ShieldAlert}
          index={2}
        />
        <StatCard
          label="Last sync"
          value={summary ? formatDate(summary.lastSyncAt) : "—"}
          icon={Clock3}
          index={3}
        />
      </div>

      {/* Filters */}
      <Panel title="Filters" description="Search and filter admin actions">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="">All statuses</option>
              <option value="SUCCESS">Success</option>
              <option value="WARNING">Warning</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Actor role
            </label>
            <select
              value={filters.role}
              onChange={(e) => setFilters({ ...filters, role: e.target.value })}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="">All roles</option>
              <option value="ADMIN">Admin</option>
              <option value="PARTICIPANT">Participant</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Entity type
            </label>
            <select
              value={filters.entity}
              onChange={(e) => setFilters({ ...filters, entity: e.target.value })}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="">All entities</option>
              <option value="REGISTRATION">Registration</option>
              <option value="PAYMENT">Payment</option>
              <option value="CERTIFICATE">Certificate</option>
              <option value="SESSION">Session</option>
              <option value="TRAINING">Training</option>
              <option value="USER">User</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              From date
            </label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">To date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
        </div>

        <button
          onClick={handleExportCsv}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition"
        >
          <Download className="h-4 w-4" />
          Export to CSV
        </button>
      </Panel>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Admin actions" description="Recent privileged actions across the academy">
          {isLoading ? (
            <LoadingRows rows={5} />
          ) : !data?.actions?.length ? (
            <EmptyState
              title="No actions logged"
              description="There are no admin actions recorded yet."
            />
          ) : (
            <div className="space-y-3">
              {actionsPagination.items.map((action) => (
                <div
                  key={action.id}
                  className="rounded-2xl border border-border/60 bg-secondary/20 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-display text-sm font-semibold">{action.actorName}</p>
                      <p className="text-xs text-muted-foreground">
                        {action.actorRole} · {action.entity}
                      </p>
                    </div>
                    <StatusBadge tone={statusTone(action.status)}>{action.status}</StatusBadge>
                  </div>
                  <p className="mt-3 text-sm">{action.action}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{action.details}</p>
                  <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground/80">
                    <span>{action.entityId}</span>
                    <span>{formatDate(action.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {!isLoading && Boolean(data?.actions?.length) && (
            <PaginationControls {...actionsPagination} onPageChange={actionsPagination.setPage} />
          )}
        </Panel>

        <Panel title="User sessions" description="Connected users and their device context">
          {isLoading ? (
            <LoadingRows rows={5} />
          ) : !data?.userSessions?.length ? (
            <EmptyState
              title="No active sessions"
              description="There are no user sessions to display."
            />
          ) : (
            <Table head={["User", "Device", "Location", "Last seen", "Status"]}>
              {sessionsPagination.items.map((session) => (
                <Row key={session.id}>
                  <Cell>
                    <div>
                      <div className="font-medium">{session.userName}</div>
                      <div className="text-xs text-muted-foreground">{session.userEmail}</div>
                    </div>
                  </Cell>
                  <Cell>
                    <div>
                      <div>{session.device}</div>
                      <div className="text-xs text-muted-foreground">{session.browser}</div>
                    </div>
                  </Cell>
                  <Cell>{session.location}</Cell>
                  <Cell>{formatDate(session.lastSeenAt)}</Cell>
                  <Cell>
                    <StatusBadge tone={statusTone(session.status)}>{session.status}</StatusBadge>
                  </Cell>
                </Row>
              ))}
            </Table>
          )}
          {!isLoading && Boolean(data?.userSessions?.length) && (
            <PaginationControls {...sessionsPagination} onPageChange={sessionsPagination.setPage} />
          )}
        </Panel>
      </div>
    </>
  );
}
