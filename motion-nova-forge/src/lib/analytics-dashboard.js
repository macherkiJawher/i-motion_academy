export function resolveAnalyticsState(query, data) {
  if (query.isLoading) return "loading";
  if (query.isError) return "error";
  if (!data) return "empty";
  const { kpis } = data;
  return kpis.totalRegistrations > 0 ||
    kpis.totalParticipants > 0 ||
    kpis.upcomingSessions > 0 ||
    kpis.revenueByCurrency.length > 0 ||
    kpis.outstandingBalanceByCurrency.length > 0 ||
    data.coachAnalytics?.coaches?.length > 0 ||
    data.locationAnalytics?.locations?.length > 0 ||
    data.trainingRatings?.length > 0 ||
    data.referralSources?.length > 0
    ? "ready"
    : "empty";
}
