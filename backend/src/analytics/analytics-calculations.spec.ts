import {
  PaymentMethod,
  PaymentStatus,
} from '../payments/entities/payment.entity';
import {
  RegistrationStatus,
  type Registration,
} from '../registrations/entities/registration.entity';
import {
  SessionLifecycleStatus,
  type Session,
} from '../sessions/entities/session.entity';
import {
  calculateOperationalMetrics,
  calculatePaymentAnalytics,
  calculateRegistrationOutcomes,
  calculateReferralSources,
  calculateTrainingPopularity,
  type AnalyticsPayment,
  type AnalyticsRegistration,
} from './analytics-calculations';

describe('calculateOperationalMetrics', () => {
  it('counts pending and confirmed registrations as active, but not completed or cancelled', () => {
    const metrics = calculateOperationalMetrics(
      [
        { status: RegistrationStatus.PENDING, amountDue: 100, amountPaid: 0 },
        { status: RegistrationStatus.CONFIRMED, amountDue: 100, amountPaid: 0 },
        { status: RegistrationStatus.COMPLETED, amountDue: 100, amountPaid: 0 },
        { status: RegistrationStatus.CANCELLED, amountDue: 100, amountPaid: 0 },
      ] as Registration[],
      [],
      '2026-10-10',
    );

    expect(metrics.activeRegistrations).toBe(2);
    expect(metrics.pendingRegistrations).toBe(1);
  });

  it('counts only future scheduled sessions and calculates weighted occupancy', () => {
    const metrics = calculateOperationalMetrics(
      [],
      [
        {
          startDate: '2026-10-10',
          lifecycleStatus: SessionLifecycleStatus.SCHEDULED,
          capacity: 10,
          seatsTaken: 8,
        },
        {
          startDate: '2026-10-09',
          lifecycleStatus: SessionLifecycleStatus.SCHEDULED,
          capacity: 10,
          seatsTaken: 10,
        },
        {
          startDate: '2026-10-11',
          lifecycleStatus: SessionLifecycleStatus.COMPLETED,
          capacity: 10,
          seatsTaken: 10,
        },
        {
          startDate: '2026-10-12',
          lifecycleStatus: SessionLifecycleStatus.CANCELLED,
          capacity: 10,
          seatsTaken: 10,
        },
        {
          startDate: '2026-10-13',
          lifecycleStatus: SessionLifecycleStatus.DRAFT,
          capacity: 10,
          seatsTaken: 10,
        },
        {
          startDate: '2026-10-14',
          lifecycleStatus: SessionLifecycleStatus.SCHEDULED,
          capacity: 30,
          seatsTaken: 12,
        },
      ] as Session[],
      '2026-10-10',
    );

    expect(metrics.upcomingSessions).toBe(2);
    expect(metrics.occupancyRate).toBe(50);
  });

  it('returns zero occupancy when there are no available seats', () => {
    const metrics = calculateOperationalMetrics(
      [],
      [
        {
          startDate: '2026-10-10',
          lifecycleStatus: SessionLifecycleStatus.SCHEDULED,
          capacity: 0,
          seatsTaken: 0,
        },
      ] as Session[],
      '2026-10-10',
    );

    expect(metrics.occupancyRate).toBe(0);
  });
});

describe('calculateRegistrationOutcomes', () => {
  const registrations = [
    {
      status: RegistrationStatus.PENDING,
      amountDue: 100,
      currency: 'TND',
    },
    {
      status: RegistrationStatus.CONFIRMED,
      amountDue: 200,
      currency: 'TND',
    },
    {
      status: RegistrationStatus.COMPLETED,
      amountDue: 300,
      currency: 'EUR',
    },
    {
      status: RegistrationStatus.CANCELLED,
      amountDue: 400,
      currency: 'TND',
    },
  ] as AnalyticsRegistration[];

  it('calculates conversion among non-cancelled registrations and cancellations among all submissions', () => {
    expect(calculateRegistrationOutcomes(registrations)).toMatchObject({
      totalRegistrations: 4,
      eligibleForConversion: 3,
      convertedRegistrations: 2,
      cancelledRegistrations: 1,
      conversionRate: 67,
      cancellationRate: 25,
      averageDueByCurrency: [
        { currency: 'EUR', amount: 300 },
        { currency: 'TND', amount: 200 },
      ],
    });
  });

  it('returns zero rates and no average when there are no registrations', () => {
    expect(calculateRegistrationOutcomes([])).toMatchObject({
      totalRegistrations: 0,
      conversionRate: 0,
      cancellationRate: 0,
      averageDueByCurrency: [],
    });
  });
});

describe('calculatePaymentAnalytics', () => {
  const registration = (overrides: Partial<AnalyticsRegistration> = {}) =>
    ({
      status: RegistrationStatus.CONFIRMED,
      amountDue: 100,
      amountPaid: 75,
      currency: 'TND',
      referralSource: ' Web ',
      createdAt: new Date('2026-09-04T12:00:00.000Z'),
      session: { training: { axisCode: 'EMS', title: 'EMS Foundation' } },
      ...overrides,
    }) as AnalyticsRegistration;
  const payment = (overrides: Partial<AnalyticsPayment> = {}) =>
    ({
      status: PaymentStatus.PARTIAL,
      amount: 25,
      currency: 'TND',
      method: PaymentMethod.TRANSFER,
      paidAt: new Date('2026-09-05T12:00:00.000Z'),
      createdAt: new Date('2026-09-05T12:00:00.000Z'),
      registration: { session: { training: { axisCode: 'EMS' } } },
      ...overrides,
    }) as AnalyticsPayment;
  const now = new Date('2026-10-10T12:00:00.000Z');

  it('aggregates only received payment rows once by currency, axis, and method', () => {
    const metrics = calculatePaymentAnalytics(
      [registration()],
      [
        payment(),
        payment({ status: PaymentStatus.PAID, amount: 50 }),
        payment({ status: PaymentStatus.PENDING, amount: 80 }),
        payment({ status: PaymentStatus.FAILED, amount: 90 }),
      ],
      now,
    );

    expect(metrics.revenueByCurrency).toEqual([
      { currency: 'TND', amount: 75 },
    ]);
    expect(metrics.revenueByAxis).toEqual([
      { axis: 'EMS', currency: 'TND', amount: 75 },
    ]);
    expect(metrics.paymentMethods).toEqual([
      {
        currency: 'TND',
        method: PaymentMethod.TRANSFER,
        amount: 75,
        transactions: 2,
      },
    ]);
    expect(metrics.outstandingByCurrency).toEqual([
      { currency: 'TND', amount: 25 },
    ]);
  });

  it('does not combine different currencies in financial breakdowns', () => {
    const metrics = calculatePaymentAnalytics(
      [],
      [payment(), payment({ currency: 'EUR', amount: 20 })],
      now,
    );

    expect(metrics.revenueByCurrency).toEqual([
      { currency: 'EUR', amount: 20 },
      { currency: 'TND', amount: 25 },
    ]);
  });

  it('compares the last two complete months using registration and paid dates', () => {
    const metrics = calculatePaymentAnalytics(
      [
        registration({ createdAt: new Date('2026-08-20T12:00:00.000Z') }),
        registration({ createdAt: new Date('2026-09-10T12:00:00.000Z') }),
        registration({
          status: RegistrationStatus.CANCELLED,
          createdAt: new Date('2026-09-15T12:00:00.000Z'),
        }),
        registration({ createdAt: new Date('2026-10-02T12:00:00.000Z') }),
      ],
      [
        payment({ paidAt: new Date('2026-08-12T12:00:00.000Z'), amount: 40 }),
        payment({ paidAt: new Date('2026-09-12T12:00:00.000Z'), amount: 60 }),
        payment({ paidAt: new Date('2026-10-02T12:00:00.000Z'), amount: 500 }),
      ],
      now,
    );

    expect(metrics.comparison).toMatchObject({
      currentPeriod: 'septembre 2026',
      previousPeriod: 'août 2026',
      registrations: { current: 2, previous: 1, changePercent: 100 },
      revenueByCurrency: [
        {
          currency: 'TND',
          current: 60,
          previous: 40,
          changePercent: 50,
        },
      ],
    });
  });
});

describe('registration analytics groupings', () => {
  const registrations = [
    {
      status: RegistrationStatus.CONFIRMED,
      amountDue: 100,
      currency: 'TND',
      referralSource: 'Web',
      createdAt: new Date('2026-10-10T09:00:00.000Z'),
      session: { training: { title: 'Formation A' } },
    },
    {
      status: RegistrationStatus.COMPLETED,
      amountDue: 100,
      currency: 'TND',
      referralSource: 'Web',
      createdAt: new Date('2026-10-10T10:00:00.000Z'),
      session: { training: { title: 'Formation A' } },
    },
    {
      status: RegistrationStatus.PENDING,
      amountDue: 100,
      currency: 'TND',
      referralSource: 'Ami',
      createdAt: new Date('2026-10-10T11:00:00.000Z'),
      session: { training: { title: 'Formation B' } },
    },
    {
      status: RegistrationStatus.CANCELLED,
      amountDue: 100,
      currency: 'TND',
      referralSource: 'Publicité',
      createdAt: new Date('2026-10-10T12:00:00.000Z'),
      session: { training: { title: 'Formation B' } },
    },
  ] as AnalyticsRegistration[];

  it('counts only confirmed and completed registrations for training popularity', () => {
    expect(calculateTrainingPopularity(registrations)).toEqual([
      { training: 'Formation A', registrations: 2 },
    ]);
  });

  it('excludes cancelled applications and normalizes blank referral sources', () => {
    expect(calculateReferralSources(registrations)).toEqual([
      { source: 'Web', registrations: 2 },
      { source: 'Ami', registrations: 1 },
    ]);
  });
});
