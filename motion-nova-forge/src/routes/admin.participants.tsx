import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useState } from "react";
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
} from "@/components/dash/Primitives";
import { useClientPagination } from "@/hooks/useClientPagination";
import { userService } from "@/services";
import type { Role } from "@/types/domain";

export const Route = createFileRoute("/admin/participants")({
  head: () => ({
    meta: [{ title: "Participants — i-Motion Academy" }, { name: "robots", content: "noindex" }],
  }),
  component: Page,
});

function Page() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "ALL">("ALL");
  const { data = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => userService.list(),
  });
  const normalizedSearch = search.trim().toLocaleLowerCase("fr");
  const visibleUsers = data.filter((user) => {
    const haystack =
      `${user.firstName} ${user.lastName} ${user.email} ${user.phone ?? ""}`.toLocaleLowerCase(
        "fr",
      );
    return (
      (!normalizedSearch || haystack.includes(normalizedSearch)) &&
      (roleFilter === "ALL" || user.role === roleFilter)
    );
  });
  const pagination = useClientPagination(visibleUsers, JSON.stringify([search, roleFilter]));

  return (
    <>
      <DashHeader title="Participants & users" subtitle="Accounts across every role." />
      <Panel>
        <div className="mb-5 flex flex-col gap-3 sm:flex-row">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Rechercher par nom, courriel, téléphone…"
              aria-label="Rechercher un participant"
              className="h-10 w-full rounded-xl border border-border/60 bg-secondary/40 pl-9 pr-3 text-sm outline-none focus:border-electric/50"
            />
          </div>
          <select
            className="h-10 rounded-xl border border-border/60 bg-secondary/40 px-3 text-sm outline-none focus:border-electric/50 sm:w-48"
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value as Role | "ALL")}
            aria-label="Filtrer par rôle"
          >
            <option value="ALL">Tous les rôles</option>
            <option value="PARTICIPANT">{statusLabel("PARTICIPANT")}</option>
            <option value="ADMIN">{statusLabel("ADMIN")}</option>
            <option value="VISITOR">{statusLabel("VISITOR")}</option>
          </select>
        </div>
        {isLoading ? (
          <LoadingRows />
        ) : visibleUsers.length === 0 ? (
          <EmptyState
            title={data.length ? "Aucun résultat" : "Aucun participant enregistré"}
            description={data.length ? "Modifiez la recherche ou le filtre." : undefined}
          />
        ) : (
          <Table head={["Name", "Email", "Phone", "Role", "Joined"]}>
            {pagination.items.map((u) => (
              <Row key={u.id}>
                <Cell>
                  {u.firstName} {u.lastName}
                </Cell>
                <Cell className="text-muted-foreground">{u.email}</Cell>
                <Cell>{u.phone ?? "—"}</Cell>
                <Cell>
                  <StatusBadge tone={u.role === "ADMIN" ? "electric" : "neutral"}>
                    {statusLabel(u.role)}
                  </StatusBadge>
                </Cell>
                <Cell>{formatDate(u.createdAt)}</Cell>
              </Row>
            ))}
          </Table>
        )}
        {!isLoading && visibleUsers.length > 0 && (
          <PaginationControls {...pagination} onPageChange={pagination.setPage} />
        )}
      </Panel>
    </>
  );
}
