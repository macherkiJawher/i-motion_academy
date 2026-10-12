const activeRegistrationStatuses = new Set(["PENDING", "CONFIRMED"]);
const incompleteRegistrationFields = ["birthDate", "address", "educationLevel", "motivation"];

function sumByCurrency(items, getAmount) {
  return items.reduce((totals, item) => {
    const currency = item.currency || "TND";
    totals[currency] = (totals[currency] || 0) + getAmount(item);
    return totals;
  }, {});
}

export function isIncompleteRegistration(registration) {
  return (
    activeRegistrationStatuses.has(registration.status) &&
    (incompleteRegistrationFields.some((field) => !registration[field]) ||
      !registration.identityDocumentAvailable ||
      !registration.qualificationDocumentAvailable)
  );
}

export function isUpcomingSession(session, today) {
  const lifecycleStatus = session.lifecycleStatus;
  return (
    session.startDate >= today && (lifecycleStatus === undefined || lifecycleStatus === "SCHEDULED")
  );
}

export function calculateDashboardMetrics(registrations, payments, sessions, contacts, today) {
  const upcomingSessions = sessions.filter((session) => isUpcomingSession(session, today));
  const capacity = upcomingSessions.reduce(
    (sum, session) => sum + Math.max(0, session.capacity),
    0,
  );
  const seatsTaken = upcomingSessions.reduce(
    (sum, session) =>
      sum + Math.min(Math.max(0, session.seatsTaken), Math.max(0, session.capacity)),
    0,
  );

  return {
    activeRegistrations: registrations.filter((registration) =>
      activeRegistrationStatuses.has(registration.status),
    ).length,
    registrationsToReview: registrations.filter((registration) => registration.status === "PENDING")
      .length,
    upcomingSessions,
    occupancyRate: capacity ? Math.round((seatsTaken / capacity) * 100) : 0,
    revenueCollectedByCurrency: sumByCurrency(
      payments.filter((payment) => payment.status === "PAID"),
      (payment) => payment.amount,
    ),
    outstandingBalanceByCurrency: sumByCurrency(
      registrations.filter((registration) => registration.status !== "CANCELLED"),
      (registration) => Math.max(0, registration.amountDue - registration.amountPaid),
    ),
    incompleteApplications: registrations.filter(isIncompleteRegistration).length,
    contactsToProcess: contacts.filter((contact) => contact.status !== "RESOLVED").length,
  };
}

export function sortRecentRegistrations(registrations) {
  return [...registrations].sort(
    (first, second) => new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime(),
  );
}

export function resolveDashboardState(queries, hasData) {
  if (queries.some((query) => query.isLoading)) return "loading";
  if (queries.some((query) => query.isError)) return "error";
  return hasData ? "ready" : "empty";
}
