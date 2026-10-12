import type { ContactRequest, Payment, Registration, TrainingSession } from "@/types/domain";

export function isIncompleteRegistration(registration: Registration): boolean;
export function isUpcomingSession(session: TrainingSession, today: string): boolean;
export function calculateDashboardMetrics(
  registrations: Registration[],
  payments: Payment[],
  sessions: TrainingSession[],
  contacts: ContactRequest[],
  today: string,
): {
  activeRegistrations: number;
  registrationsToReview: number;
  upcomingSessions: TrainingSession[];
  occupancyRate: number;
  revenueCollectedByCurrency: Record<string, number>;
  outstandingBalanceByCurrency: Record<string, number>;
  incompleteApplications: number;
  contactsToProcess: number;
};
export function sortRecentRegistrations(registrations: Registration[]): Registration[];
export function resolveDashboardState(
  queries: { isLoading: boolean; isError: boolean }[],
  hasData: boolean,
): "loading" | "error" | "ready" | "empty";
