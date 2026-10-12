import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import type { ReactElement } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell as ReCell,
  Legend,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  DashHeader,
  EmptyState,
  ErrorState,
  LoadingRows,
  Panel,
  StatCard,
  formatDate,
  formatMoney,
} from "@/components/dash/Primitives";
import { ClientOnly } from "@/components/fx/ClientOnly";
import { AdminAssistantWidget } from "@/components/assistant/AdminAssistantWidget";
import { errorMessage } from "@/api/client";
import { resolveAnalyticsState } from "@/lib/analytics-dashboard.js";
import type { AdminAnalytics, AnalyticsFilters } from "@/types/domain";
import { analyticsService } from "@/services";

export const Route = createFileRoute("/admin/analytics")({
  head: () => ({
    meta: [
      { title: "Analyses — Administration i-Motion Academy" },
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
const tooltipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  fontSize: 12,
  color: "var(--popover-foreground)",
};
const axisNames: Record<string, string> = {
  EMS: "EMS",
  LANGUAGES: "Langues",
  MANAGEMENT: "Management",
  AI: "Intelligence artificielle",
  SPORT_COACHING: "Coaching sportif",
  WELLNESS: "Bien-être",
  BTP: "BTP",
  BTS: "BTS",
  UNKNOWN: "Axe non renseigné",
};
const paymentMethodNames: Record<string, string> = {
  CARD: "Carte bancaire",
  TRANSFER: "Virement",
  CASH: "Espèces",
  CHEQUE: "Chèque",
};

function ChartFrame({ children, height = 288 }: { children: ReactElement; height?: number }) {
  return (
    <ClientOnly
      fallback={<div className="animate-pulse rounded-2xl bg-secondary/40" style={{ height }} />}
    >
      <div style={{ height }} className="w-full">
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </ClientOnly>
  );
}

function currencyTotals(values: { currency: string; amount: number }[]) {
  return values.length
    ? values.map(({ currency, amount }) => formatMoney(amount, currency)).join(" · ")
    : "Aucune donnée";
}

function rateChange(value: number | null) {
  if (value === null) return "Base précédente nulle : variation non calculable.";
  return `${value > 0 ? "+" : ""}${new Intl.NumberFormat("fr-TN", {
    maximumFractionDigits: 2,
  }).format(value)} %`;
}

function groupByCurrency<T extends { currency: string }>(values: T[]) {
  const groups = new Map<string, T[]>();
  for (const value of values) {
    const group = groups.get(value.currency) ?? [];
    group.push(value);
    groups.set(value.currency, group);
  }
  return Array.from(groups, ([currency, items]) => ({ currency, items }));
}

function hasCharts(data: AdminAnalytics) {
  return (
    data.registrationTrend.some((point) => point.registrations > 0) ||
    data.revenueByAxis.length > 0 ||
    data.paymentMethods.length > 0 ||
    data.trainingPopularity.length > 0 ||
    data.referralSources.length > 0 ||
    data.coachAnalytics.coaches.length > 0 ||
    data.locationAnalytics.locations.length > 0 ||
    data.trainingRatings.length > 0 ||
    data.sessionOccupancy.length > 0
  );
}

function Page() {
  const [filters, setFilters] = useState<AnalyticsFilters>({});
  const updateFilter = (key: keyof AnalyticsFilters, value: string) => {
    setFilters((current) => {
      const next = { ...current };
      if (value) next[key] = value;
      else delete next[key];
      return next;
    });
  };
  const analyticsQuery = useQuery({
    queryKey: ["analytics", filters],
    queryFn: () => analyticsService.admin(filters),
  });
  const data = analyticsQuery.data;
  const state = resolveAnalyticsState(analyticsQuery, data);

  if (state === "loading") {
    return (
      <>
        <DashHeader title="Analyses" subtitle="Chargement des indicateurs de l’académie…" />
        <AdminAssistantWidget />
        <LoadingRows rows={6} />
      </>
    );
  }

  if (state === "error") {
    return (
      <>
        <DashHeader
          title="Analyses"
          subtitle="Indicateurs d’activité, d’inscriptions et de paiements."
        />
        <AdminAssistantWidget />
        <ErrorState
          message={`Impossible de charger les analyses. ${errorMessage(analyticsQuery.error)}`}
          onRetry={() => void analyticsQuery.refetch()}
        />
      </>
    );
  }

  if (state === "empty" || !data) {
    return (
      <>
        <DashHeader
          title="Analyses"
          subtitle="Indicateurs d’activité, d’inscriptions et de paiements."
        />
        <AdminAssistantWidget />
        <EmptyState
          title="Aucune donnée analytique"
          description="Les analyses apparaîtront dès que l’académie aura enregistré des inscriptions, des paiements ou des sessions."
        />
      </>
    );
  }

  const { kpis } = data;
  const paymentGroups = groupByCurrency(data.paymentMethods);
  const revenueAxisGroups = groupByCurrency(data.revenueByAxis);
  const upcomingSessions = data.sessionOccupancy.slice(0, 12);
  const hasChartData = hasCharts(data);
  const hasFinancialData =
    kpis.revenueByCurrency.length > 0 ||
    kpis.outstandingBalanceByCurrency.length > 0 ||
    kpis.averageDueByCurrency.length > 0;

  return (
    <>
      <DashHeader
        title="Analyses"
        subtitle="Activité, inscriptions, équipes, lieux et retours des participants d’i-Motion Academy."
      />
      <AdminAssistantWidget />

      <Panel
        className="mb-6"
        title="Filtres des analyses détaillées"
        description="La période est calculée selon la date de début de session. Les indicateurs financiers et les KPI généraux restent historiques."
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <label className="grid gap-1.5 text-xs text-muted-foreground">
            Du
            <input
              type="date"
              value={filters.startDate ?? ""}
              onChange={(event) => updateFilter("startDate", event.target.value)}
              className="rounded-xl border border-border/60 bg-background px-3 py-2 text-sm text-foreground"
            />
          </label>
          <label className="grid gap-1.5 text-xs text-muted-foreground">
            Au
            <input
              type="date"
              value={filters.endDate ?? ""}
              onChange={(event) => updateFilter("endDate", event.target.value)}
              className="rounded-xl border border-border/60 bg-background px-3 py-2 text-sm text-foreground"
            />
          </label>
          <label className="grid gap-1.5 text-xs text-muted-foreground">
            Formation
            <select
              value={filters.trainingId ?? ""}
              onChange={(event) => updateFilter("trainingId", event.target.value)}
              className="rounded-xl border border-border/60 bg-background px-3 py-2 text-sm text-foreground"
            >
              <option value="">Toutes les formations</option>
              {data.filterOptions.trainings.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-xs text-muted-foreground">
            Coach
            <select
              value={filters.trainerId ?? ""}
              onChange={(event) => updateFilter("trainerId", event.target.value)}
              className="rounded-xl border border-border/60 bg-background px-3 py-2 text-sm text-foreground"
            >
              <option value="">Tous les coachs</option>
              {data.filterOptions.coaches.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-xs text-muted-foreground">
            Lieu
            <select
              value={filters.locationId ?? ""}
              onChange={(event) => updateFilter("locationId", event.target.value)}
              className="rounded-xl border border-border/60 bg-background px-3 py-2 text-sm text-foreground"
            >
              <option value="">Tous les lieux</option>
              {data.filterOptions.locations.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        {Object.values(filters).some(Boolean) && (
          <button
            type="button"
            onClick={() => setFilters({})}
            className="mt-4 text-xs font-medium text-electric transition hover:opacity-80"
          >
            Effacer les filtres
          </button>
        )}
      </Panel>

      {!hasChartData && !hasFinancialData && (
        <div className="mb-6">
          <EmptyState
            title="Aucune donnée analytique"
            description="Aucune inscription, aucun paiement ni aucune session ne correspond aux analyses disponibles."
          />
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label="Montant encaissé"
          value={currencyTotals(kpis.revenueByCurrency)}
          hint="Paiements partiels et complets reçus"
          index={0}
        />
        <StatCard
          label="Montant restant dû"
          value={currencyTotals(kpis.outstandingBalanceByCurrency)}
          hint="Inscriptions non annulées"
          index={1}
        />
        <StatCard
          label="Montant moyen dû"
          value={currencyTotals(kpis.averageDueByCurrency)}
          hint="Par inscription confirmée ou terminée"
          index={2}
        />
        <StatCard
          label="Taux de conversion"
          value={`${kpis.conversionRate} %`}
          hint={`${kpis.convertedRegistrations} confirmées ou terminées / ${kpis.eligibleForConversion} inscriptions non annulées`}
          index={3}
        />
        <StatCard
          label="Taux d’annulation"
          value={`${kpis.cancellationRate} %`}
          hint={`${kpis.cancelledRegistrations} annulées / ${kpis.totalRegistrations} inscriptions`}
          index={4}
        />
        <StatCard
          label="Remplissage des sessions à venir"
          value={`${kpis.occupancyRate} %`}
          hint={`${kpis.upcomingSessions} sessions planifiées et disponibles`}
          index={5}
        />
      </div>

      <Panel
        className="mt-6"
        title="Comparaison mensuelle"
        description={`Deux mois calendaires complets · inscriptions selon leur date de création, encaissements selon leur date de paiement · période courante : ${data.comparison.currentPeriod}`}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-border/50 bg-secondary/25 p-4">
            <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">
              Inscriptions créées
            </p>
            <p className="mt-2 font-display text-xl font-semibold">
              {data.comparison.registrations.current} contre{" "}
              {data.comparison.registrations.previous}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {data.comparison.currentPeriod} vs {data.comparison.previousPeriod} ·{" "}
              {rateChange(data.comparison.registrations.changePercent)}
            </p>
          </div>
          {data.comparison.revenueByCurrency.map((comparison) => (
            <div
              key={comparison.currency}
              className="rounded-2xl border border-border/50 bg-secondary/25 p-4"
            >
              <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">
                Encaissements · {comparison.currency}
              </p>
              <p className="mt-2 font-display text-xl font-semibold">
                {formatMoney(comparison.current, comparison.currency)} contre{" "}
                {formatMoney(comparison.previous, comparison.currency)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {data.comparison.currentPeriod} vs {data.comparison.previousPeriod} ·{" "}
                {rateChange(comparison.changePercent)}
              </p>
            </div>
          ))}
          {data.comparison.revenueByCurrency.length === 0 && (
            <p className="self-center text-sm text-muted-foreground">
              Aucun paiement reçu pendant ces deux mois complets.
            </p>
          )}
        </div>
      </Panel>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Panel
          className="xl:col-span-2"
          title="Évolution des inscriptions"
          description="Nombre de dossiers créés par mois sur les six derniers mois, quel que soit leur statut actuel."
        >
          {data.registrationTrend.some((point) => point.registrations > 0) ? (
            <ChartFrame>
              <BarChart data={data.registrationTrend} margin={{ left: -12, right: 8, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="month" tick={axis} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tick={axis} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  cursor={{ fill: "var(--secondary)", fillOpacity: 0.25 }}
                />
                <Bar
                  dataKey="registrations"
                  name="Inscriptions créées"
                  fill="var(--electric)"
                  radius={[8, 8, 0, 0]}
                  barSize={22}
                />
              </BarChart>
            </ChartFrame>
          ) : (
            <EmptyState title="Aucune inscription sur les six derniers mois" />
          )}
        </Panel>

        <Panel
          title="Encaissements par axe de formation"
          description="Montants des paiements partiels et complets reçus, tous historiques, séparés par devise."
        >
          {revenueAxisGroups.length ? (
            <div className="grid gap-5">
              {revenueAxisGroups.map(({ currency, items }) => (
                <div key={currency}>
                  <p className="mb-2 text-sm font-medium">{currency}</p>
                  <ChartFrame height={Math.max(210, items.length * 46)}>
                    <RadarChart
                      data={items.map(({ axis: code, amount }) => ({
                        axis: axisNames[code] ?? code,
                        amount,
                      }))}
                      outerRadius="75%"
                    >
                      <PolarGrid stroke="var(--border)" />
                      <PolarAngleAxis dataKey="axis" tick={axis} />
                      <Radar
                        dataKey="amount"
                        name="Montant encaissé"
                        stroke="var(--electric)"
                        fill="var(--electric)"
                        fillOpacity={0.35}
                      />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        formatter={(value) => formatMoney(Number(value), currency)}
                      />
                    </RadarChart>
                  </ChartFrame>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="Aucun encaissement par axe disponible" />
          )}
        </Panel>

        <Panel
          title="Moyens de paiement"
          description="Montants encaissés par moyen · paiements partiels et complets uniquement · devises séparées."
        >
          {paymentGroups.length ? (
            <div className="grid gap-5">
              {paymentGroups.map(({ currency, items }, groupIndex) => (
                <div key={currency}>
                  <p className="mb-2 text-sm font-medium">{currency}</p>
                  <ChartFrame>
                    <PieChart>
                      <Pie
                        data={items.map((item) => ({
                          name: paymentMethodNames[item.method] ?? item.method,
                          amount: item.amount,
                          transactions: item.transactions,
                        }))}
                        dataKey="amount"
                        nameKey="name"
                        innerRadius={56}
                        outerRadius={92}
                        paddingAngle={3}
                      >
                        {items.map((item, index) => (
                          <ReCell
                            key={`${item.currency}-${item.method}`}
                            fill={PALETTE[(groupIndex + index) % PALETTE.length]}
                            stroke="transparent"
                          />
                        ))}
                      </Pie>
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        formatter={(value) => formatMoney(Number(value), currency)}
                      />
                    </PieChart>
                  </ChartFrame>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {items.reduce((total, item) => total + item.transactions, 0)} transactions
                    encaissées
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="Aucun paiement encaissé" />
          )}
        </Panel>

        <Panel
          title="Formations les plus suivies"
          description="Top 5 historique des inscriptions confirmées ou terminées ; les dossiers en attente et annulés sont exclus."
        >
          {data.trainingPopularity.length ? (
            <ChartFrame height={Math.max(220, data.trainingPopularity.length * 48)}>
              <BarChart
                layout="vertical"
                data={data.trainingPopularity}
                margin={{ left: 24, right: 12 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis
                  type="number"
                  allowDecimals={false}
                  tick={axis}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="training"
                  tick={axis}
                  width={130}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  cursor={{ fill: "var(--secondary)", fillOpacity: 0.3 }}
                />
                <Bar
                  dataKey="registrations"
                  name="Inscriptions confirmées ou terminées"
                  radius={[0, 8, 8, 0]}
                >
                  {data.trainingPopularity.map((entry, index) => (
                    <ReCell key={entry.training} fill={PALETTE[index % PALETTE.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ChartFrame>
          ) : (
            <EmptyState title="Aucune inscription confirmée ou terminée" />
          )}
        </Panel>

        <Panel
          title="Activité des coachs"
          description="Sessions planifiées ou terminées, coachs les plus sollicités en tête ; participants distincts confirmés ou ayant terminé."
        >
          {data.coachAnalytics.coaches.length ? (
            <>
              <ChartFrame height={Math.max(220, data.coachAnalytics.coaches.length * 42)}>
                <BarChart
                  layout="vertical"
                  data={data.coachAnalytics.coaches}
                  margin={{ left: 18, right: 16 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={axis} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={axis}
                    width={125}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar
                    dataKey="sessions"
                    name="Sessions"
                    fill="var(--electric)"
                    radius={[0, 8, 8, 0]}
                  />
                </BarChart>
              </ChartFrame>
              <ol className="mt-3 divide-y divide-border/40 text-sm">
                {data.coachAnalytics.coaches.map((coach, index) => (
                  <li
                    key={coach.id ?? coach.name}
                    className="flex items-center justify-between gap-3 py-2"
                  >
                    <span className="truncate">
                      <span className="mr-2 text-muted-foreground">{index + 1}.</span>
                      {coach.name}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {coach.sessions} sessions · {coach.participants} participants
                    </span>
                  </li>
                ))}
              </ol>
            </>
          ) : (
            <EmptyState title="Aucune session avec coach pour ces filtres" />
          )}
        </Panel>

        <Panel
          title="Activité des lieux"
          description="Sessions planifiées ou terminées par lieu, avec le nombre de participants distincts confirmés ou ayant terminé."
        >
          {data.locationAnalytics.locations.length ? (
            <>
              <ChartFrame height={Math.max(220, data.locationAnalytics.locations.length * 42)}>
                <BarChart
                  layout="vertical"
                  data={data.locationAnalytics.locations}
                  margin={{ left: 18, right: 16 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={axis} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={axis}
                    width={125}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar
                    dataKey="sessions"
                    name="Sessions"
                    fill="var(--cyan)"
                    radius={[0, 8, 8, 0]}
                  />
                </BarChart>
              </ChartFrame>
              <ol className="mt-3 divide-y divide-border/40 text-sm">
                {data.locationAnalytics.locations.map((location, index) => (
                  <li
                    key={location.id ?? location.name}
                    className="flex items-center justify-between gap-3 py-2"
                  >
                    <span className="truncate">
                      <span className="mr-2 text-muted-foreground">{index + 1}.</span>
                      {location.name}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {location.sessions} sessions · {location.participants} participants
                    </span>
                  </li>
                ))}
              </ol>
            </>
          ) : (
            <EmptyState title="Aucun lieu associé aux sessions filtrées" />
          )}
        </Panel>

        <Panel
          className="xl:col-span-2"
          title="Notes et avis par formation"
          description="Avis de type formation enregistrés pour les sessions filtrées, tous statuts de publication confondus. Classement par moyenne puis nombre d’avis."
        >
          {data.trainingRatings.length ? (
            <div className="grid gap-6 xl:grid-cols-2">
              <div>
                <p className="mb-2 text-xs uppercase tracking-[0.15em] text-muted-foreground">
                  Répartition des notes
                </p>
                {data.trainingRatings.some((item) => item.reviewCount > 0) ? (
                  <ChartFrame
                    height={Math.max(
                      230,
                      data.trainingRatings.filter((item) => item.reviewCount > 0).length * 42,
                    )}
                  >
                    <BarChart
                      layout="vertical"
                      data={data.trainingRatings
                        .filter((item) => item.reviewCount > 0)
                        .map((item) => ({
                          training: item.training,
                          one: item.distribution[0]?.count ?? 0,
                          two: item.distribution[1]?.count ?? 0,
                          three: item.distribution[2]?.count ?? 0,
                          four: item.distribution[3]?.count ?? 0,
                          five: item.distribution[4]?.count ?? 0,
                        }))}
                      margin={{ left: 18, right: 16 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="var(--border)"
                        horizontal={false}
                      />
                      <XAxis type="number" allowDecimals={false} tick={axis} />
                      <YAxis
                        type="category"
                        dataKey="training"
                        tick={axis}
                        width={130}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="one" name="1 étoile" stackId="ratings" fill="var(--chart-5)" />
                      <Bar dataKey="two" name="2 étoiles" stackId="ratings" fill="var(--violet)" />
                      <Bar dataKey="three" name="3 étoiles" stackId="ratings" fill="var(--cyan)" />
                      <Bar dataKey="four" name="4 étoiles" stackId="ratings" fill="var(--mint)" />
                      <Bar
                        dataKey="five"
                        name="5 étoiles"
                        stackId="ratings"
                        fill="var(--electric)"
                        radius={[0, 8, 8, 0]}
                      />
                    </BarChart>
                  </ChartFrame>
                ) : (
                  <EmptyState
                    title="Aucune note disponible"
                    description="Les formations et leurs moyennes restent affichées à côté."
                  />
                )}
              </div>
              <div>
                <p className="mb-2 text-xs uppercase tracking-[0.15em] text-muted-foreground">
                  Classement et moyennes
                </p>
                <ol className="divide-y divide-border/40">
                  {data.trainingRatings.map((item, index) => (
                    <li
                      key={item.trainingId}
                      className="flex items-start justify-between gap-3 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          <span className="mr-2 text-muted-foreground">{index + 1}.</span>
                          {item.training}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {item.distribution
                            .map(({ rating, count }) => `${rating}★ ${count}`)
                            .join(" · ")}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-semibold">
                          {item.averageRating === null
                            ? "Aucune note"
                            : `${item.averageRating.toFixed(2)} / 5`}
                        </p>
                        <p className="text-xs text-muted-foreground">{item.reviewCount} avis</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          ) : (
            <EmptyState
              title="Aucune formation disponible pour ces filtres"
              description="Les formations apparaîtront dès qu’une session correspondra aux critères sélectionnés."
            />
          )}
        </Panel>

        <Panel
          title="Remplissage des prochaines sessions"
          description={`Sessions planifiées et disponibles à venir · affichage des ${upcomingSessions.length} prochaines sur ${data.sessionOccupancy.length} au total.`}
        >
          {upcomingSessions.length ? (
            <ChartFrame height={Math.max(240, upcomingSessions.length * 42)}>
              <BarChart
                layout="vertical"
                data={upcomingSessions.map((session) => ({
                  ...session,
                  label: `${session.session} · ${formatDate(session.startDate)}`,
                }))}
                margin={{ left: 18, right: 18 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} unit="%" tick={axis} />
                <YAxis
                  type="category"
                  dataKey="label"
                  tick={axis}
                  width={150}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value, _name, item) => [
                    `${Number(value)} % · ${item.payload.seatsTaken}/${item.payload.capacity} places`,
                    "Remplissage",
                  ]}
                />
                <Bar
                  dataKey="occupancy"
                  name="Remplissage"
                  fill="var(--violet)"
                  radius={[0, 8, 8, 0]}
                />
              </BarChart>
            </ChartFrame>
          ) : (
            <EmptyState title="Aucune session à venir" />
          )}
        </Panel>

        <Panel
          title="Sources des inscriptions"
          description="Inscriptions non annulées des sessions filtrées ; les sources courantes sont regroupées et le pourcentage porte sur les réponses recensées."
        >
          {data.referralSources.length ? (
            <div className="grid items-center gap-4 sm:grid-cols-2">
              <ChartFrame height={Math.max(230, Math.min(data.referralSources.length, 8) * 36)}>
                <PieChart>
                  <Pie
                    data={data.referralSources}
                    dataKey="registrations"
                    nameKey="source"
                    innerRadius={56}
                    outerRadius={92}
                    paddingAngle={3}
                  >
                    {data.referralSources.map((item, index) => (
                      <ReCell
                        key={item.source}
                        fill={PALETTE[index % PALETTE.length]}
                        stroke="transparent"
                      />
                    ))}
                  </Pie>
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value, _name, item) => [
                      `${Number(value)} · ${item.payload.percentage} %`,
                      item.payload.source,
                    ]}
                  />
                </PieChart>
              </ChartFrame>
              <ul className="divide-y divide-border/40 text-sm">
                {data.referralSources.map((item, index) => (
                  <li key={item.source} className="flex items-center justify-between gap-3 py-2">
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        className="size-2 shrink-0 rounded-full"
                        style={{ background: PALETTE[index % PALETTE.length] }}
                      />
                      <span className="truncate">{item.source}</span>
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {item.registrations} · {item.percentage} %
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <EmptyState title="Aucune source de provenance renseignée" />
          )}
        </Panel>
      </div>
    </>
  );
}
