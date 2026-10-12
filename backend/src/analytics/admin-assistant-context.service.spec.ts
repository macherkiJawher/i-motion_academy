import type { Repository } from 'typeorm';
import {
  PaymentMethod,
  PaymentStatus,
} from '../payments/entities/payment.entity';
import { RegistrationStatus } from '../registrations/entities/registration.entity';
import {
  ApprovalStatus,
  TrainingLifecycleStatus,
} from '../trainings/entities/training.entity';
import type { AnalyticsService } from './analytics.service';
import { AdminAssistantContextService } from './admin-assistant-context.service';

describe('AdminAssistantContextService', () => {
  const now = new Date('2026-10-11T10:00:00.000Z');
  const analytics = {
    kpis: {
      upcomingSessions: 2,
      revenueByCurrency: [{ currency: 'EUR', amount: 100 }],
      outstandingBalanceByCurrency: [
        { currency: 'EUR', amount: 40 },
        { currency: 'TND', amount: 25 },
      ],
    },
    paymentMethods: [
      {
        currency: 'EUR',
        method: PaymentMethod.CARD,
        amount: 30,
        transactions: 1,
      },
      {
        currency: 'EUR',
        method: PaymentMethod.TRANSFER,
        amount: 20,
        transactions: 2,
      },
      {
        currency: 'TND',
        method: PaymentMethod.TRANSFER,
        amount: 40,
        transactions: 3,
      },
    ],
    sessionOccupancy: [
      {
        session: 'Formation EMS',
        startDate: '2026-10-20',
        capacity: 10,
        seatsTaken: 8,
        occupancy: 80,
      },
      {
        session: 'Formation IA',
        startDate: '2026-10-25',
        capacity: 5,
        seatsTaken: 7,
        occupancy: 100,
      },
    ],
    trainingRatings: [
      {
        trainingId: 'training-id',
        training: 'Formation EMS',
        averageRating: 4.5,
        reviewCount: 2,
        distribution: [
          { rating: 1, count: 0 },
          { rating: 2, count: 0 },
          { rating: 3, count: 0 },
          { rating: 4, count: 1 },
          { rating: 5, count: 1 },
        ],
      },
    ],
    trainingPopularity: [{ training: 'Formation EMS', registrations: 12 }],
    registrationTrend: [{ month: 'octobre 2026', registrations: 4 }],
    feedbackByType: [
      { type: 'TRAINING', averageRating: 4.5, count: 2 },
      { type: 'TRAINER', averageRating: 4, count: 1 },
      { type: 'LOGISTICS', averageRating: 0, count: 0 },
      { type: 'CONTENT', averageRating: 0, count: 0 },
    ],
    referralSources: [],
    referralSourceDetails: {
      eligibleRegistrations: 0,
      socialNetworkRegistrations: 0,
      unspecifiedSocialNetwork: 0,
      networks: [],
    },
    comparison: { revenueByCurrency: [] },
    registrationCountsByTraining: [
      {
        training: 'Formation EMS',
        registrations: 12,
        byStatus: [{ status: RegistrationStatus.CONFIRMED, count: 12 }],
      },
    ],
    registrationCountsBySession: [],
    coachAnalytics: {
      coaches: [
        {
          id: 'coach-private-id',
          name: 'Nom Coach Privé',
          sessions: 3,
          participants: 8,
          capacity: 30,
          seatsTaken: 18,
          occupancyRate: 60,
        },
      ],
    },
    locationAnalytics: {
      locations: [
        {
          id: 'location-private-id',
          name: 'Centre de formation',
          sessions: 2,
          participants: 5,
        },
      ],
    },
    filterOptions: {
      trainings: [],
      coaches: [{ id: 'coach-private-id', name: 'Nom Coach Privé' }],
      locations: [],
    },
  };

  const createService = (
    trainingRows: unknown[] = [],
    registrationRows: unknown[] = [],
    paymentRows: unknown[] = [],
    analyticsResult = analytics,
  ) => {
    const analyticsService = {
      getAdminAnalytics: jest.fn().mockResolvedValue(analyticsResult),
    };
    const trainingRepository = {
      find: jest.fn().mockResolvedValue(trainingRows),
      findAndCount: jest
        .fn()
        .mockResolvedValue([trainingRows, trainingRows.length]),
    };
    const registrationRepository = {
      find: jest.fn().mockResolvedValue(registrationRows),
    };
    const paymentRepository = {
      find: jest.fn().mockResolvedValue(paymentRows),
    };
    const certificateRepository = {
      find: jest.fn().mockResolvedValue([]),
    };
    const contactRequestRepository = {
      find: jest.fn().mockResolvedValue([]),
    };
    const service = new AdminAssistantContextService(
      analyticsService as unknown as AnalyticsService,
      trainingRepository as unknown as Repository<
        import('../trainings/entities/training.entity').Training
      >,
      registrationRepository as unknown as Repository<
        import('../registrations/entities/registration.entity').Registration
      >,
      paymentRepository as unknown as Repository<
        import('../payments/entities/payment.entity').Payment
      >,
      certificateRepository as unknown as Repository<
        import('../certificates/entities/certificate.entity').Certificate
      >,
      contactRequestRepository as unknown as Repository<
        import('../contact-requests/entities/contact-request.entity').ContactRequest
      >,
    );
    return {
      service,
      analyticsService,
      trainingRepository,
      registrationRepository,
      paymentRepository,
      certificateRepository,
      contactRequestRepository,
    };
  };

  it('builds status counts and pending/published training indicators', async () => {
    const { service } = createService(
      [
        {
          lifecycleStatus: TrainingLifecycleStatus.PUBLISHED,
          approvalStatus: ApprovalStatus.NOT_APPLICABLE,
        },
        {
          lifecycleStatus: TrainingLifecycleStatus.DRAFT,
          approvalStatus: ApprovalStatus.PENDING,
        },
        {
          lifecycleStatus: TrainingLifecycleStatus.IN_REVIEW,
          approvalStatus: ApprovalStatus.PENDING,
        },
      ],
      [
        { status: RegistrationStatus.PENDING },
        { status: RegistrationStatus.CONFIRMED },
        { status: RegistrationStatus.CANCELLED },
        { status: RegistrationStatus.CANCELLED },
      ],
    );

    const context = await service.getContext(now);

    expect(context.trainings).toMatchObject({
      total: 3,
      published: 1,
      pendingHomologation: 2,
      byLifecycleStatus: [
        { status: TrainingLifecycleStatus.DRAFT, count: 1 },
        { status: TrainingLifecycleStatus.IN_REVIEW, count: 1 },
        { status: TrainingLifecycleStatus.PUBLISHED, count: 1 },
        { status: TrainingLifecycleStatus.ARCHIVED, count: 0 },
      ],
    });
    expect(context.registrations).toMatchObject({
      pending: 1,
      cancelled: 2,
      byStatus: [
        { status: RegistrationStatus.PENDING, count: 1 },
        { status: RegistrationStatus.CONFIRMED, count: 1 },
        { status: RegistrationStatus.CANCELLED, count: 2 },
        { status: RegistrationStatus.COMPLETED, count: 0 },
      ],
    });
  });

  it('aggregates session seats without exceeding capacity', async () => {
    const { service } = createService();

    const context = await service.getContext(now);

    expect(context.sessions).toMatchObject({
      upcoming: 2,
      totalCapacity: 15,
      occupiedSeats: 13,
      remainingSeats: 2,
    });
    expect(context.sessions.availabilityRule).toContain('SCHEDULED');
    expect(context.generatedAt).toBe(now.toISOString());
  });

  it('calculates registration-based age aggregates without returning birth dates or IDs', async () => {
    const { service } = createService(
      [],
      [
        {
          id: 'registration-1',
          userId: 'account-1',
          birthDate: '2000-10-12',
          status: RegistrationStatus.CONFIRMED,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
        },
        {
          id: 'registration-2',
          userId: 'account-1',
          birthDate: '2000-10-12',
          status: RegistrationStatus.COMPLETED,
          createdAt: new Date('2026-01-02T00:00:00.000Z'),
        },
        {
          id: 'registration-3',
          userId: 'account-2',
          birthDate: '1990-10-11',
          status: RegistrationStatus.PENDING,
          createdAt: new Date('2026-01-03T00:00:00.000Z'),
        },
        {
          id: 'registration-4',
          userId: null,
          birthDate: null,
          status: RegistrationStatus.PENDING,
          createdAt: new Date('2026-01-04T00:00:00.000Z'),
        },
        {
          id: 'registration-5',
          userId: null,
          birthDate: '2030-01-01',
          status: RegistrationStatus.CONFIRMED,
          createdAt: new Date('2026-01-05T00:00:00.000Z'),
        },
        {
          id: 'registration-6',
          userId: 'account-3',
          birthDate: '2000-01-01',
          status: RegistrationStatus.CONFIRMED,
          createdAt: new Date('2026-01-06T00:00:00.000Z'),
        },
        {
          id: 'registration-7',
          userId: 'account-3',
          birthDate: '2001-01-01',
          status: RegistrationStatus.CONFIRMED,
          createdAt: new Date('2026-01-07T00:00:00.000Z'),
        },
        {
          id: 'registration-8',
          userId: 'cancelled-account',
          birthDate: '1995-01-01',
          status: RegistrationStatus.CANCELLED,
          createdAt: new Date('2026-01-08T00:00:00.000Z'),
        },
      ],
    );

    const demographics = await service.getParticipantDemographics(
      undefined,
      now,
    );
    const serialized = JSON.stringify(demographics);

    expect(demographics).toMatchObject({
      population: 5,
      withBirthDate: 2,
      missingBirthDate: 1,
      ambiguousBirthDate: 1,
      invalidBirthDate: 1,
      averageAgeYears: 30.5,
      referenceDate: '2026-10-11',
    });
    expect(demographics.byAgeRange).toEqual(
      expect.arrayContaining([
        { range: '25-34 ans', count: 1 },
        { range: '35-44 ans', count: 1 },
      ]),
    );
    expect(serialized).not.toContain('2000-10-12');
    expect(serialized).not.toContain('account-1');
    expect(serialized).not.toContain('registration-1');
  });

  it('applies a bounded creation-date interval to participant demographics', async () => {
    const { service, registrationRepository } = createService();

    await service.getParticipantDemographics(
      { startDate: '2026-01-01', endDate: '2026-01-31' },
      now,
    );

    expect(registrationRepository.find).toHaveBeenCalledWith(
      expect.objectContaining({
        select: {
          id: true,
          userId: true,
          birthDate: true,
          status: true,
          createdAt: true,
        },
        where: {
          createdAt: expect.anything(),
        },
      }),
    );
  });

  it('returns bounded curriculum fields without exposing training identifiers', async () => {
    const { service, trainingRepository } = createService([
      {
        id: 'internal-training-id',
        title: 'Formation IA',
        axisCode: 'AI',
        subcategory: 'Automatisation',
        recognitionType: 'NONE',
        approvalStatus: 'APPROVED',
        lifecycleStatus: 'PUBLISHED',
        durationHours: 20,
        durationValue: 20,
        durationUnit: 'HOURS',
        price: 100,
        currency: 'TND',
        rating: 4.5,
        learners: 12,
        active: true,
        tagline: 'Résumé',
        description: 'Description du programme',
        targetAudience: 'Professionnels',
        prerequisites: '',
        skills: ['Compétence'],
        objectives: ['Objectif'],
        program: [{ title: 'Module', detail: 'Détail', hours: 2 }],
      },
    ]);

    const catalog = await service.getTrainingCatalog('IA');
    const serialized = JSON.stringify(catalog);

    expect(catalog).toMatchObject({
      returned: 1,
      omitted: 0,
      trainings: [{ title: 'Formation IA', rating: 4.5 }],
    });
    expect(trainingRepository.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 20,
        order: { title: 'ASC' },
        where: expect.any(Array),
      }),
    );
    expect(serialized).not.toContain('internal-training-id');
  });

  it('groups recorded payment amounts by status and currency without claiming provider confirmation', async () => {
    const { service } = createService(
      [],
      [],
      [
        { status: PaymentStatus.PAID, amount: 20, currency: 'TND' },
        { status: PaymentStatus.PARTIAL, amount: 10, currency: 'TND' },
        { status: PaymentStatus.PAID, amount: 30, currency: 'EUR' },
        { status: PaymentStatus.PENDING, amount: 7, currency: 'EUR' },
        { status: PaymentStatus.FAILED, amount: 9, currency: 'TND' },
      ],
    );

    const context = await service.getContext(now);

    expect(context.payments.byStatus).toEqual([
      {
        status: PaymentStatus.PENDING,
        count: 1,
        recordedAmountByCurrency: [{ currency: 'EUR', amount: 7 }],
      },
      {
        status: PaymentStatus.PARTIAL,
        count: 1,
        recordedAmountByCurrency: [{ currency: 'TND', amount: 10 }],
      },
      {
        status: PaymentStatus.PAID,
        count: 2,
        recordedAmountByCurrency: [
          { currency: 'EUR', amount: 30 },
          { currency: 'TND', amount: 20 },
        ],
      },
      {
        status: PaymentStatus.FAILED,
        count: 1,
        recordedAmountByCurrency: [{ currency: 'TND', amount: 9 }],
      },
    ]);
    expect(context.payments.outstandingBalanceByCurrency).toEqual([
      { currency: 'EUR', amount: 40 },
      { currency: 'TND', amount: 25 },
    ]);
    expect(context.payments.source).toBe('application-recorded');
    expect(context.payments.independentlyConfirmedByProvider).toBe(false);
  });

  it('aggregates payment method transaction counts across currencies without combining amounts', async () => {
    const { service } = createService([], [], [], {
      ...analytics,
      paymentMethods: [
        {
          currency: 'EUR',
          method: PaymentMethod.CARD,
          amount: 30,
          transactions: 1,
        },
        {
          currency: 'EUR',
          method: PaymentMethod.TRANSFER,
          amount: 20,
          transactions: 2,
        },
        {
          currency: 'TND',
          method: PaymentMethod.TRANSFER,
          amount: 40,
          transactions: 3,
        },
      ],
    });

    const context = await service.getContext(now);

    expect(context.payments.byMethod).toEqual([
      {
        method: PaymentMethod.TRANSFER,
        transactions: 5,
        percentage: 83.3,
      },
      { method: PaymentMethod.CARD, transactions: 1, percentage: 16.7 },
      { method: PaymentMethod.CASH, transactions: 0, percentage: 0 },
      { method: PaymentMethod.CHEQUE, transactions: 0, percentage: 0 },
    ]);
    expect(context.payments.totalMethodTransactions).toBe(6);
    expect(context.payments.mostUsedMethods).toEqual([PaymentMethod.TRANSFER]);
    expect(context.payments.methodUsageRule).toContain('sans filtre de date');
  });

  it('reports ties and no most-used method when no eligible transactions exist', async () => {
    const { service } = createService([], [], [], {
      ...analytics,
      paymentMethods: [
        {
          currency: 'EUR',
          method: PaymentMethod.CARD,
          amount: 0,
          transactions: 2,
        },
        {
          currency: 'TND',
          method: PaymentMethod.TRANSFER,
          amount: 0,
          transactions: 2,
        },
      ],
    });

    const context = await service.getContext(now);

    expect(context.payments.totalMethodTransactions).toBe(4);
    expect(context.payments.mostUsedMethods).toEqual([
      PaymentMethod.CARD,
      PaymentMethod.TRANSFER,
    ]);
    expect(
      context.payments.byMethod
        .filter(({ transactions }) => transactions > 0)
        .map(({ percentage }) => percentage),
    ).toEqual([50, 50]);

    const empty = await createService([], [], [], {
      ...analytics,
      paymentMethods: [],
    }).service.getContext(now);
    expect(empty.payments.totalMethodTransactions).toBe(0);
    expect(empty.payments.mostUsedMethods).toEqual([]);
    expect(empty.payments.byMethod).toEqual(
      expect.arrayContaining([
        { method: PaymentMethod.CARD, transactions: 0, percentage: 0 },
        { method: PaymentMethod.TRANSFER, transactions: 0, percentage: 0 },
      ]),
    );
  });

  it('bounds currency groups and reports omitted payment and balance currencies', async () => {
    const currencyCodes = Array.from(
      { length: 55 },
      (_, index) => `X${String(index).padStart(2, '0')}`,
    );
    const analyticsWithManyBalances = {
      ...analytics,
      kpis: {
        ...analytics.kpis,
        outstandingBalanceByCurrency: currencyCodes.map((currency) => ({
          currency,
          amount: 1,
        })),
      },
      trainingRatings: Array.from({ length: 55 }, (_, index) => ({
        trainingId: `training-${index}`,
        training: `Formation ${index}`,
        averageRating: 4,
        reviewCount: 1,
        distribution: [{ rating: 4, count: 1 }],
      })),
      coachAnalytics: {
        coaches: Array.from({ length: 55 }, (_, index) => ({
          id: `coach-${index}`,
          name: `Coach ${index}`,
          sessions: 1,
          participants: 1,
        })),
      },
      locationAnalytics: {
        locations: Array.from({ length: 55 }, (_, index) => ({
          id: `location-${index}`,
          name: `Location ${index}`,
          sessions: 1,
          participants: 1,
        })),
      },
    };
    const { service } = createService(
      [],
      [],
      currencyCodes.map((currency) => ({
        status: PaymentStatus.PAID,
        amount: 1,
        currency,
      })),
      analyticsWithManyBalances,
    );

    const context = await service.getContext(now);
    const paid = context.payments.byStatus.find(
      ({ status }) => status === PaymentStatus.PAID,
    );

    expect(context.payments.omittedCurrencies).toBe(5);
    expect(context.payments.omittedOutstandingCurrencies).toBe(5);
    expect(paid?.recordedAmountByCurrency).toHaveLength(50);
    expect(context.payments.outstandingBalanceByCurrency).toHaveLength(50);
    expect(context.ratings.byTraining).toHaveLength(50);
    expect(context.ratings.omittedTrainingBreakdowns).toBe(5);
    expect(context.coaches.aggregates).toHaveLength(50);
    expect(context.coaches.omittedAggregates).toBe(5);
    expect(context.locations.aggregates).toHaveLength(50);
    expect(context.locations.omittedAggregates).toBe(5);
  });

  it('returns coach names and bounded metrics while excluding private identifiers', async () => {
    const { service } = createService();

    const context = await service.getContext(now);
    const serialized = JSON.stringify(context);

    expect(context.ratings.validTrainingReviewCount).toBe(2);
    expect(context.ratings.byTraining).toEqual([
      expect.objectContaining({
        training: 'Formation EMS',
        averageRating: 4.5,
        reviewCount: 2,
      }),
    ]);
    expect(context.coaches).toEqual({
      aggregates: [
        {
          name: 'Nom Coach Privé',
          sessions: 3,
          participants: 8,
          capacity: 30,
          seatsTaken: 18,
          occupancyRate: 60,
        },
      ],
      omittedAggregates: 0,
      identityPolicy: 'admin_name_only',
      participantRule: expect.any(String),
      occupancyRule: expect.any(String),
    });
    expect(context.locations.aggregates).toEqual([
      { label: 'Groupe 1', sessions: 2, participants: 5 },
    ]);
    expect(serialized).toContain('Nom Coach Privé');
    expect(serialized).not.toContain('coach-private-id');
    expect(serialized).not.toContain('participantEmail');
    expect(serialized).not.toContain('participant@example.com');
  });

  it('requests only non-personal columns and propagates unavailable data errors', async () => {
    const {
      service,
      analyticsService,
      trainingRepository,
      registrationRepository,
      paymentRepository,
    } = createService();

    await service.getContext(now);

    expect(trainingRepository.find).toHaveBeenCalledWith({
      select: { lifecycleStatus: true, approvalStatus: true },
    });
    expect(registrationRepository.find).toHaveBeenCalledWith({
      select: {
        id: true,
        userId: true,
        birthDate: true,
        status: true,
        createdAt: true,
      },
    });
    expect(paymentRepository.find).toHaveBeenCalledWith({
      select: { status: true, amount: true, currency: true },
    });
    expect(analyticsService.getAdminAnalytics).toHaveBeenCalledWith({}, now);

    trainingRepository.find.mockRejectedValueOnce(
      new Error('Database unavailable'),
    );
    await expect(service.getContext(now)).rejects.toThrow(
      'Database unavailable',
    );
  });

  it('returns real zero counts for empty training, registration, and payment data', async () => {
    const emptyAnalytics = {
      ...analytics,
      kpis: {
        upcomingSessions: 0,
        revenueByCurrency: [],
        outstandingBalanceByCurrency: [],
      },
      sessionOccupancy: [],
      trainingRatings: [],
      trainingPopularity: [],
      registrationTrend: [],
      referralSources: [],
      feedbackByType: [],
      registrationCountsByTraining: [],
      registrationCountsBySession: [],
      comparison: { revenueByCurrency: [] },
      coachAnalytics: { coaches: [] },
      locationAnalytics: { locations: [] },
    };
    const { service } = createService([], [], [], emptyAnalytics);

    const context = await service.getContext(now);

    expect(context.trainings.total).toBe(0);
    expect(context.sessions).toMatchObject({
      upcoming: 0,
      totalCapacity: 0,
      occupiedSeats: 0,
      remainingSeats: 0,
    });
    expect(
      context.registrations.byStatus.every(({ count }) => count === 0),
    ).toBe(true);
    expect(
      context.payments.byStatus.every(
        ({ count, recordedAmountByCurrency }) =>
          count === 0 && recordedAmountByCurrency.length === 0,
      ),
    ).toBe(true);
    expect(context.ratings.validTrainingReviewCount).toBe(0);
  });
});
