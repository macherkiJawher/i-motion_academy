import {
  Payment,
  PaymentMethod,
  PaymentStatus,
} from '../payments/entities/payment.entity';
import {
  Registration,
  RegistrationStatus,
} from '../registrations/entities/registration.entity';
import {
  Session,
  SessionLifecycleStatus,
} from '../sessions/entities/session.entity';

export interface AnalyticsRegistration extends Pick<
  Registration,
  | 'status'
  | 'amountDue'
  | 'amountPaid'
  | 'currency'
  | 'referralSource'
  | 'createdAt'
> {
  session?: {
    training?: {
      axisCode?: string;
      title?: string;
    } | null;
  } | null;
}

export interface AnalyticsPayment extends Pick<
  Payment,
  'status' | 'amount' | 'currency' | 'method' | 'paidAt' | 'createdAt'
> {
  registration?: {
    session?: {
      training?: {
        axisCode?: string;
      } | null;
    } | null;
  } | null;
}

export interface CurrencyAmount {
  currency: string;
  amount: number;
}

export interface AnalyticsComparison {
  currentPeriod: string;
  previousPeriod: string;
  registrations: {
    current: number;
    previous: number;
    changePercent: number | null;
  };
  revenueByCurrency: {
    currency: string;
    current: number;
    previous: number;
    changePercent: number | null;
  }[];
}

const collectedPaymentStatuses = new Set<PaymentStatus>([
  PaymentStatus.PAID,
  PaymentStatus.PARTIAL,
]);
const convertedRegistrationStatuses = new Set<RegistrationStatus>([
  RegistrationStatus.CONFIRMED,
  RegistrationStatus.COMPLETED,
]);

const dateValue = (value: Date | string | null): number | null => {
  if (value === null) return null;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
};

const addAmount = (
  totals: Map<string, number>,
  currency: string,
  amount: number,
) => {
  totals.set(currency, (totals.get(currency) ?? 0) + amount);
};

const sortedAmounts = (totals: Map<string, number>): CurrencyAmount[] =>
  Array.from(totals, ([currency, amount]) => ({ currency, amount })).sort(
    (first, second) => first.currency.localeCompare(second.currency),
  );

const changePercent = (current: number, previous: number): number | null =>
  previous === 0
    ? current === 0
      ? 0
      : null
    : Math.round(((current - previous) / previous) * 10000) / 100;

const monthLabel = (date: Date): string =>
  date.toLocaleDateString('fr-TN', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });

const monthStart = (year: number, month: number): number =>
  Date.UTC(year, month, 1);

export function calculateRegistrationOutcomes(
  registrations: AnalyticsRegistration[],
) {
  const total = registrations.length;
  const cancelled = registrations.filter(
    (registration) => registration.status === RegistrationStatus.CANCELLED,
  ).length;
  const converted = registrations.filter((registration) =>
    convertedRegistrationStatuses.has(registration.status),
  ).length;
  const eligibleForConversion = total - cancelled;
  const averageDueTotals = new Map<string, { amount: number; count: number }>();
  for (const registration of registrations) {
    if (!convertedRegistrationStatuses.has(registration.status)) continue;
    const average = averageDueTotals.get(registration.currency) ?? {
      amount: 0,
      count: 0,
    };
    average.amount += registration.amountDue;
    average.count += 1;
    averageDueTotals.set(registration.currency, average);
  }

  return {
    totalRegistrations: total,
    eligibleForConversion,
    convertedRegistrations: converted,
    cancelledRegistrations: cancelled,
    conversionRate: eligibleForConversion
      ? Math.round((converted / eligibleForConversion) * 100)
      : 0,
    cancellationRate: total ? Math.round((cancelled / total) * 100) : 0,
    averageDueByCurrency: Array.from(
      averageDueTotals,
      ([currency, { amount, count }]) => ({
        currency,
        amount: amount / count,
      }),
    ).sort((first, second) => first.currency.localeCompare(second.currency)),
  };
}

export function calculateTrainingPopularity(
  registrations: AnalyticsRegistration[],
) {
  const totals = new Map<string, number>();
  for (const registration of registrations) {
    if (!convertedRegistrationStatuses.has(registration.status)) continue;
    const title = registration.session?.training?.title;
    if (title) totals.set(title, (totals.get(title) ?? 0) + 1);
  }
  return Array.from(totals, ([training, registrations]) => ({
    training,
    registrations,
  }))
    .sort(
      (first, second) =>
        second.registrations - first.registrations ||
        first.training.localeCompare(second.training),
    )
    .slice(0, 5);
}

export function calculateReferralSources(
  registrations: AnalyticsRegistration[],
) {
  const totals = new Map<string, number>();
  for (const registration of registrations) {
    if (registration.status === RegistrationStatus.CANCELLED) continue;
    const source = registration.referralSource?.trim() || 'Non renseigné';
    totals.set(source, (totals.get(source) ?? 0) + 1);
  }
  return Array.from(totals, ([source, registrations]) => ({
    source,
    registrations,
  })).sort(
    (first, second) =>
      second.registrations - first.registrations ||
      first.source.localeCompare(second.source),
  );
}

export function calculatePaymentAnalytics(
  registrations: AnalyticsRegistration[],
  payments: AnalyticsPayment[],
  now: Date,
) {
  const collectedPayments = payments.filter((payment) =>
    collectedPaymentStatuses.has(payment.status),
  );
  const revenueByCurrency = new Map<string, number>();
  const outstandingByCurrency = new Map<string, number>();
  const revenueByAxis = new Map<string, Map<string, number>>();
  const paymentMethods = new Map<
    string,
    {
      currency: string;
      method: PaymentMethod;
      amount: number;
      transactions: number;
    }
  >();

  for (const payment of collectedPayments) {
    addAmount(revenueByCurrency, payment.currency, payment.amount);

    const axis = payment.registration?.session?.training?.axisCode ?? 'UNKNOWN';
    const axisTotals = revenueByAxis.get(axis) ?? new Map<string, number>();
    addAmount(axisTotals, payment.currency, payment.amount);
    revenueByAxis.set(axis, axisTotals);

    const key = `${payment.currency}:${payment.method}`;
    const methodTotal = paymentMethods.get(key) ?? {
      currency: payment.currency,
      method: payment.method,
      amount: 0,
      transactions: 0,
    };
    methodTotal.amount += payment.amount;
    methodTotal.transactions += 1;
    paymentMethods.set(key, methodTotal);
  }

  for (const registration of registrations) {
    if (registration.status === RegistrationStatus.CANCELLED) continue;
    addAmount(
      outstandingByCurrency,
      registration.currency,
      Math.max(0, registration.amountDue - registration.amountPaid),
    );
  }

  const currentMonth = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  );
  const currentStart = currentMonth.getTime();
  const previousStart = monthStart(
    currentMonth.getUTCFullYear(),
    currentMonth.getUTCMonth() - 1,
  );
  const twoMonthsAgoStart = monthStart(
    currentMonth.getUTCFullYear(),
    currentMonth.getUTCMonth() - 2,
  );
  const registrationCounts = { current: 0, previous: 0 };
  const revenueComparison = new Map<
    string,
    { current: number; previous: number }
  >();

  for (const registration of registrations) {
    const createdAt = dateValue(registration.createdAt);
    if (
      createdAt === null ||
      createdAt < twoMonthsAgoStart ||
      createdAt >= currentStart
    )
      continue;
    if (createdAt >= previousStart) registrationCounts.current += 1;
    else registrationCounts.previous += 1;
  }

  for (const payment of collectedPayments) {
    const paidAt = dateValue(payment.paidAt);
    if (paidAt === null || paidAt < twoMonthsAgoStart || paidAt >= currentStart)
      continue;
    const total = revenueComparison.get(payment.currency) ?? {
      current: 0,
      previous: 0,
    };
    if (paidAt >= previousStart) total.current += payment.amount;
    else total.previous += payment.amount;
    revenueComparison.set(payment.currency, total);
  }

  const trendStart = monthStart(
    currentMonth.getUTCFullYear(),
    currentMonth.getUTCMonth() - 5,
  );
  const trendEnd = monthStart(
    currentMonth.getUTCFullYear(),
    currentMonth.getUTCMonth() + 1,
  );
  const trend = new Map<number, number>();
  for (let index = 0; index < 6; index += 1) {
    trend.set(
      monthStart(
        currentMonth.getUTCFullYear(),
        currentMonth.getUTCMonth() - 5 + index,
      ),
      0,
    );
  }
  for (const registration of registrations) {
    const createdAt = dateValue(registration.createdAt);
    if (createdAt === null || createdAt < trendStart || createdAt >= trendEnd)
      continue;
    const created = new Date(createdAt);
    const start = monthStart(created.getUTCFullYear(), created.getUTCMonth());
    trend.set(start, (trend.get(start) ?? 0) + 1);
  }

  return {
    revenueByCurrency: sortedAmounts(revenueByCurrency),
    outstandingByCurrency: sortedAmounts(outstandingByCurrency),
    revenueByAxis: Array.from(revenueByAxis, ([axis, totals]) =>
      Array.from(totals, ([currency, amount]) => ({ axis, currency, amount })),
    )
      .flat()
      .sort((first, second) =>
        first.axis === second.axis
          ? first.currency.localeCompare(second.currency)
          : first.axis.localeCompare(second.axis),
      ),
    paymentMethods: Array.from(paymentMethods.values()).sort(
      (first, second) =>
        first.currency.localeCompare(second.currency) ||
        first.method.localeCompare(second.method),
    ),
    registrationTrend: Array.from(trend, ([start, registrations]) => ({
      month: monthLabel(new Date(start)),
      registrations,
    })),
    comparison: {
      currentPeriod: monthLabel(new Date(previousStart)),
      previousPeriod: monthLabel(new Date(twoMonthsAgoStart)),
      registrations: {
        current: registrationCounts.current,
        previous: registrationCounts.previous,
        changePercent: changePercent(
          registrationCounts.current,
          registrationCounts.previous,
        ),
      },
      revenueByCurrency: Array.from(
        revenueComparison,
        ([currency, amounts]) => ({
          currency,
          ...amounts,
          changePercent: changePercent(amounts.current, amounts.previous),
        }),
      ).sort((first, second) => first.currency.localeCompare(second.currency)),
    } satisfies AnalyticsComparison,
  };
}

export function calculateOperationalMetrics(
  registrations: Pick<Registration, 'status'>[],
  sessions: Pick<
    Session,
    'startDate' | 'lifecycleStatus' | 'capacity' | 'seatsTaken'
  >[],
  today: string,
) {
  const activeStatuses = [
    RegistrationStatus.PENDING,
    RegistrationStatus.CONFIRMED,
  ];
  const activeRegistrations = registrations.filter((registration) =>
    activeStatuses.includes(registration.status),
  ).length;
  const pendingRegistrations = registrations.filter(
    (registration) => registration.status === RegistrationStatus.PENDING,
  ).length;
  const upcomingSessions = sessions.filter(
    (session) =>
      session.startDate >= today &&
      session.lifecycleStatus === SessionLifecycleStatus.SCHEDULED,
  );
  const capacity = upcomingSessions.reduce(
    (sum, session) => sum + Math.max(0, session.capacity),
    0,
  );
  const seatsTaken = upcomingSessions.reduce(
    (sum, session) =>
      sum +
      Math.min(Math.max(0, session.seatsTaken), Math.max(0, session.capacity)),
    0,
  );

  return {
    activeRegistrations,
    pendingRegistrations,
    upcomingSessions: upcomingSessions.length,
    occupancyRate: capacity ? Math.round((seatsTaken / capacity) * 100) : 0,
  };
}
