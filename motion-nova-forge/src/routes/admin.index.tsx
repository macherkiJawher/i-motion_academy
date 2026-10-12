import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowUpRight,
  Award,
  CalendarDays,
  ClipboardList,
  CreditCard,
  FileWarning,
  Gauge,
  Mail,
  MessageSquareWarning,
  TrendingUp,
  Users,
} from "lucide-react";
import type { ReactElement } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell as ReCell,
  Legend,
  Pie,
  PieChart,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Cell,
  DashHeader,
  EmptyState,
  ErrorState,
  LoadingRows,
  Panel,
  Row,
  StatCard,
  StatusBadge,
  Table,
  formatDate,
  formatMoney,
  statusLabel,
  statusTone,
} from "@/components/dash/Primitives";
import { ClientOnly } from "@/components/fx/ClientOnly";
import { errorMessage } from "@/api/client";
import {
  calculateDashboardMetrics,
  resolveDashboardState,
  sortRecentRegistrations,
} from "@/lib/admin-dashboard.js";
import {
  analyticsService,
  catalogService,
  certificateService,
  contactService,
  paymentService,
  registrationService,
  sessionService,
  userService,
} from "@/services";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Vue d'ensemble — Administration i-Motion Academy" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Page,
});

const PALETTE = [
  "var(--electric)",
  "var(--violet)",
  "var(--mint)",
  "var(--cyan)",
  "var(--chart-5)",
];

const axis = { stroke: "var(--muted-foreground)", fontSize: 11 };

function ChartFrame({ children }: { children: ReactElement }) {
  return (
    <ClientOnly fallback={<div className="h-64 animate-pulse rounded-2xl bg-secondary/40" />}>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </ClientOnly>
  );
}

function ChartEmpty() {
  return (
    <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
      Aucune donnée à afficher.
    </div>
  );
}

function formatCurrencyTotals(totals: Record<string, number>, fallbackCurrency: string) {
  const currencies = Object.entries(totals);
  return currencies.length
    ? currencies.map(([currency, amount]) => formatMoney(amount, currency)).join(" · ")
    : formatMoney(0, fallbackCurrency);
}

function axisLabel(axisCode: string) {
  const labels: Record<string, string> = {
    EMS: "EMS",
    LANGUAGES: "Langues",
    MANAGEMENT: "Management",
    AI: "Intelligence artificielle",
    SPORT_COACHING: "Coaching sportif",
    WELLNESS: "Bien-être",
    BTP: "BTP",
    BTS: "BTS",
  };
  return labels[axisCode] ?? axisCode;
}

const tooltipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  fontSize: 12,
  color: "var(--popover-foreground)",
};

function Page() {
  const analyticsQuery = useQuery({
    queryKey: ["analytics"],
    queryFn: () => analyticsService.admin(),
  });
  const registrationsQuery = useQuery({
    queryKey: ["registrations"],
    queryFn: () => registrationService.list(),
  });
  const paymentsQuery = useQuery({ queryKey: ["payments"], queryFn: () => paymentService.list() });
  const sessionsQuery = useQuery({ queryKey: ["sessions"], queryFn: () => sessionService.list() });
  const usersQuery = useQuery({ queryKey: ["users"], queryFn: () => userService.list() });
  const certificatesQuery = useQuery({
    queryKey: ["certificates"],
    queryFn: () => certificateService.list(),
  });
  const contactsQuery = useQuery({ queryKey: ["contacts"], queryFn: () => contactService.list() });
  const trainingsQuery = useQuery({
    queryKey: ["trainings"],
    queryFn: () => catalogService.trainings(),
  });
  const queries = [
    analyticsQuery,
    registrationsQuery,
    paymentsQuery,
    sessionsQuery,
    usersQuery,
    certificatesQuery,
    contactsQuery,
    trainingsQuery,
  ];
  const data = analyticsQuery.data;
  const registrations = registrationsQuery.data ?? [];
  const payments = paymentsQuery.data ?? [];
  const sessions = sessionsQuery.data ?? [];
  const users = usersQuery.data ?? [];
  const certificates = certificatesQuery.data ?? [];
  const contacts = contactsQuery.data ?? [];
  const trainings = trainingsQuery.data ?? [];
  const hasData = Boolean(
    registrations.length ||
    payments.length ||
    sessions.length ||
    users.length ||
    certificates.length ||
    contacts.length ||
    data?.registrationTrend.some((point) => point.registrations > 0) ||
    data?.revenueByAxis.length ||
    data?.trainingPopularity.length,
  );
  const dashboardState = resolveDashboardState(queries, hasData);

  if (dashboardState === "loading") {
    return (
      <>
        <DashHeader title="Vue d'ensemble" subtitle="Chargement des indicateurs de l'académie…" />
        <LoadingRows rows={5} />
      </>
    );
  }

  if (dashboardState === "error") {
    const failedQuery = queries.find((query) => query.isError);
    return (
      <>
        <DashHeader
          title="Vue d'ensemble"
          subtitle="Suivi de l'activité et des opérations de l'académie."
        />
        <ErrorState
          message={`Impossible de charger les données du tableau de bord. ${errorMessage(failedQuery?.error)}`}
          onRetry={() => void Promise.all(queries.map((query) => query.refetch()))}
        />
      </>
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const metrics = calculateDashboardMetrics(registrations, payments, sessions, contacts, today);
  const btpBtsApplications = registrations.filter((registration) =>
    ["BTP", "BTS"].includes(
      trainings.find((training) => training.slug === registration.trainingSlug)?.axisCode ?? "",
    ),
  ).length;
  const statusMix = (["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"] as const).map((status) => ({
    name: statusLabel(status),
    value: registrations.filter((registration) => registration.status === status).length,
  }));
  const occupancy = metrics.upcomingSessions
    .slice()
    .sort((first, second) => first.startDate.localeCompare(second.startDate))
    .slice(0, 8)
    .map((session) => ({
      name: `${session.trainingTitle} · ${formatDate(session.startDate)}`,
      occupancy: session.capacity
        ? Math.round(
            (Math.min(Math.max(0, session.seatsTaken), session.capacity) / session.capacity) * 100,
          )
        : 0,
    }));
  const latestRegistrations = sortRecentRegistrations(registrations).slice(0, 6);
  const fallbackCurrency = registrations[0]?.currency ?? payments[0]?.currency ?? "TND";
  const lastUpdatedAt = Math.max(...queries.map((query) => query.dataUpdatedAt));

  return (
    <>
      <DashHeader
        title="Vue d'ensemble"
        subtitle="Suivez les inscriptions, les sessions et les finances de l'académie."
        actions={
          <p className="text-xs text-muted-foreground">
            Actualisé le{" "}
            {new Date(lastUpdatedAt).toLocaleString("fr-TN", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </p>
        }
      />

      {dashboardState === "empty" && (
        <div className="mb-6">
          <EmptyState
            title="Aucune donnée d'activité"
            description="Les indicateurs s'afficheront dès que l'académie aura des inscriptions, des paiements ou des sessions."
          />
        </div>
      )}

      <Panel
        title="Indicateurs clés"
        description="Les inscriptions terminées et annulées sont exclues des inscriptions actives."
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard
            label="Inscriptions à traiter"
            value={metrics.registrationsToReview}
            icon={ClipboardList}
            index={0}
          />
          <StatCard
            label="Sessions à venir"
            value={metrics.upcomingSessions.length}
            icon={CalendarDays}
            index={1}
          />
          <StatCard
            label="Remplissage des sessions à venir"
            value={`${metrics.occupancyRate}%`}
            icon={Gauge}
            index={2}
          />
          <StatCard
            label="Montant encaissé"
            value={formatCurrencyTotals(metrics.revenueCollectedByCurrency, fallbackCurrency)}
            icon={CreditCard}
            index={3}
          />
          <StatCard
            label="Montant restant dû"
            value={formatCurrencyTotals(metrics.outstandingBalanceByCurrency, fallbackCurrency)}
            icon={TrendingUp}
            index={4}
          />
        </div>
      </Panel>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Participants"
          value={users.filter((user) => user.role === "PARTICIPANT").length}
          icon={Users}
          index={0}
        />
        <StatCard
          label="Inscriptions actives"
          value={metrics.activeRegistrations}
          icon={ClipboardList}
          index={1}
        />
        <StatCard
          label="Certificats délivrés"
          value={certificates.filter((certificate) => certificate.status === "ISSUED").length}
          icon={Award}
          index={2}
        />
        <StatCard
          label="Demandes de contact à traiter"
          value={metrics.contactsToProcess}
          icon={Mail}
          index={3}
        />
        <StatCard
          label="Candidatures BTP/BTS"
          value={btpBtsApplications}
          icon={ClipboardList}
          index={4}
        />
        <StatCard
          label="Dossiers incomplets"
          value={metrics.incompleteApplications}
          icon={FileWarning}
          hint="Inscriptions en cours uniquement"
          index={5}
        />
      </div>

      <Panel
        className="mt-6"
        title="Raccourcis opérationnels"
        description="Accédez directement aux éléments qui nécessitent une action."
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Link
            to="/admin/registrations"
            search={{ status: "PENDING" }}
            className="group flex items-center justify-between rounded-2xl border border-border/60 bg-secondary/25 p-4 transition-colors hover:border-electric/50 hover:bg-secondary/50"
          >
            <span className="flex items-center gap-3">
              <ClipboardList className="h-4 w-4 text-electric" />
              <span className="text-sm">
                À valider <strong className="ml-1">{metrics.registrationsToReview}</strong>
              </span>
            </span>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Link>
          <Link
            to="/admin/registrations"
            search={{ incomplete: "true" }}
            className="group flex items-center justify-between rounded-2xl border border-border/60 bg-secondary/25 p-4 transition-colors hover:border-electric/50 hover:bg-secondary/50"
          >
            <span className="flex items-center gap-3">
              <FileWarning className="h-4 w-4 text-electric" />
              <span className="text-sm">
                Dossiers incomplets{" "}
                <strong className="ml-1">{metrics.incompleteApplications}</strong>
              </span>
            </span>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Link>
          <Link
            to="/admin/contact-requests"
            search={{ status: "TO_PROCESS" }}
            className="group flex items-center justify-between rounded-2xl border border-border/60 bg-secondary/25 p-4 transition-colors hover:border-electric/50 hover:bg-secondary/50"
          >
            <span className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-electric" />
              <span className="text-sm">
                Contacts à traiter <strong className="ml-1">{metrics.contactsToProcess}</strong>
              </span>
            </span>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Link>
          <Link
            to="/admin/complaints"
            search={{ priority: "CRITICAL" }}
            className="group flex items-center justify-between rounded-2xl border border-destructive/30 bg-destructive/5 p-4 transition-colors hover:bg-destructive/10"
          >
            <span className="flex items-center gap-3">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <span className="text-sm">Réclamations critiques</span>
            </span>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
          </Link>
          <Link
            to="/admin/complaints"
            search={{ priority: "HIGH" }}
            className="group flex items-center justify-between rounded-2xl border border-amber-400/30 bg-amber-400/5 p-4 transition-colors hover:bg-amber-400/10"
          >
            <span className="flex items-center gap-3">
              <MessageSquareWarning className="h-4 w-4 text-amber-300" />
              <span className="text-sm">Priorité élevée</span>
            </span>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        </div>
      </Panel>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Panel
          className="xl:col-span-2"
          title="Évolution des inscriptions"
          description="Nombre d'inscriptions par mois sur les six derniers mois"
        >
          {data?.registrationTrend.some((point) => point.registrations > 0) ? (
            <ChartFrame>
              <AreaChart data={data.registrationTrend} margin={{ left: -18, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="regGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--electric)" stopOpacity={0.55} />
                    <stop offset="100%" stopColor="var(--electric)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="month" tick={axis} tickLine={false} axisLine={false} />
                <YAxis tick={axis} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  cursor={{ stroke: "var(--electric)", strokeOpacity: 0.3 }}
                />
                <Area
                  type="monotone"
                  dataKey="registrations"
                  name="Inscriptions"
                  stroke="var(--electric)"
                  strokeWidth={2}
                  fill="url(#regGrad)"
                />
              </AreaChart>
            </ChartFrame>
          ) : (
            <ChartEmpty />
          )}
        </Panel>

        <Panel title="Statut des inscriptions">
          {registrations.length ? (
            <ChartFrame>
              <PieChart>
                <Pie
                  data={statusMix}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={52}
                  outerRadius={82}
                  paddingAngle={3}
                >
                  {statusMix.map((entry, i) => (
                    <ReCell
                      key={entry.name}
                      fill={PALETTE[i % PALETTE.length]}
                      stroke="transparent"
                    />
                  ))}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ChartFrame>
          ) : (
            <ChartEmpty />
          )}
        </Panel>

        <Panel title="Chiffre d'affaires par filière">
          {data?.revenueByAxis.length ? (
            <ChartFrame>
              <BarChart
                data={data.revenueByAxis.map((entry) => ({
                  ...entry,
                  axis: axisLabel(entry.axis),
                }))}
                margin={{ left: -18, right: 8, top: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="axis"
                  tick={axis}
                  tickLine={false}
                  axisLine={false}
                  interval={0}
                  height={48}
                  angle={-18}
                  textAnchor="end"
                />
                <YAxis tick={axis} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  cursor={{ fill: "var(--secondary)", fillOpacity: 0.3 }}
                />
                <Bar dataKey="revenue" name="Chiffre d'affaires" radius={[8, 8, 0, 0]}>
                  {data.revenueByAxis.map((entry, i) => (
                    <ReCell key={entry.axis} fill={PALETTE[i % PALETTE.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ChartFrame>
          ) : (
            <ChartEmpty />
          )}
        </Panel>

        <Panel title="Formations les plus demandées">
          {data?.trainingPopularity.length ? (
            <ChartFrame>
              <BarChart
                layout="vertical"
                data={data.trainingPopularity}
                margin={{ left: 24, right: 12 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" tick={axis} tickLine={false} axisLine={false} />
                <YAxis
                  type="category"
                  dataKey="training"
                  tick={axis}
                  width={92}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  cursor={{ fill: "var(--secondary)", fillOpacity: 0.3 }}
                />
                <Bar
                  dataKey="registrations"
                  name="Inscriptions"
                  fill="var(--electric)"
                  radius={[0, 8, 8, 0]}
                />
              </BarChart>
            </ChartFrame>
          ) : (
            <ChartEmpty />
          )}
        </Panel>

        <Panel title="Remplissage des sessions à venir">
          {occupancy.length ? (
            <ChartFrame>
              <RadialBarChart
                data={occupancy}
                innerRadius="25%"
                outerRadius="100%"
                startAngle={90}
                endAngle={-270}
              >
                <RadialBar
                  dataKey="occupancy"
                  name="Taux de remplissage"
                  background={{ fill: "var(--secondary)" }}
                  cornerRadius={8}
                >
                  {occupancy.map((entry, i) => (
                    <ReCell key={entry.name} fill={PALETTE[i % PALETTE.length]} />
                  ))}
                </RadialBar>
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value) => [`${value}%`, "Remplissage"]}
                />
              </RadialBarChart>
            </ChartFrame>
          ) : (
            <ChartEmpty />
          )}
        </Panel>
      </div>

      <Panel
        className="mt-6"
        title="Inscriptions récentes"
        description="Les six dernières inscriptions reçues, toutes sessions confondues"
      >
        {latestRegistrations.length ? (
          <Table head={["Référence", "Participant", "Formation", "Date", "Statut", "Paiement"]}>
            {latestRegistrations.map((r) => (
              <Row key={r.id}>
                <Cell>{r.reference}</Cell>
                <Cell>{r.participantName}</Cell>
                <Cell>{r.trainingTitle}</Cell>
                <Cell>{formatDate(r.createdAt)}</Cell>
                <Cell>
                  <StatusBadge tone={statusTone(r.status)}>{statusLabel(r.status)}</StatusBadge>
                </Cell>
                <Cell>
                  <StatusBadge tone={statusTone(r.paymentStatus)}>
                    {statusLabel(r.paymentStatus)}
                  </StatusBadge>
                </Cell>
              </Row>
            ))}
          </Table>
        ) : (
          <ChartEmpty />
        )}
      </Panel>
    </>
  );
}
