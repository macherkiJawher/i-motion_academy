import type { FindManyOptions, Repository } from 'typeorm';
import { AnalyticsService } from './analytics.service';
import type { Registration } from '../registrations/entities/registration.entity';
import type { Payment } from '../payments/entities/payment.entity';
import type { Session } from '../sessions/entities/session.entity';
import type { User } from '../users/entities/user.entity';
import type { Certificate } from '../certificates/entities/certificate.entity';
import type { Training } from '../trainings/entities/training.entity';

describe('AnalyticsService', () => {
  const createService = (
    userRepository: Partial<Repository<User>>,
    overrides: {
      registrations?: Partial<Repository<Registration>>;
      payments?: Partial<Repository<Payment>>;
      sessions?: Partial<Repository<Session>>;
      feedback?: Partial<
        Repository<import('../feedback/entities/feedback.entity').Feedback>
      >;
      trainings?: Partial<Repository<Training>>;
      trainers?: Partial<
        Repository<import('../trainers/entities/trainer.entity').Trainer>
      >;
      locations?: Partial<
        Repository<import('../locations/entities/location.entity').Location>
      >;
    } = {},
  ) =>
    new AnalyticsService(
      {
        find: jest.fn().mockResolvedValue([]),
        ...overrides.registrations,
      } as unknown as Repository<Registration>,
      {
        find: jest.fn().mockResolvedValue([]),
        ...overrides.payments,
      } as unknown as Repository<Payment>,
      {
        find: jest.fn().mockResolvedValue([]),
        ...overrides.sessions,
      } as unknown as Repository<Session>,
      userRepository as Repository<User>,
      {} as Repository<Certificate>,
      {
        find: jest.fn().mockResolvedValue([]),
        ...overrides.trainings,
      } as unknown as Repository<Training>,
      {
        find: jest.fn().mockResolvedValue([]),
        ...overrides.feedback,
      } as unknown as Repository<
        import('../feedback/entities/feedback.entity').Feedback
      >,
      {
        find: jest.fn().mockResolvedValue([]),
        ...overrides.trainers,
      } as unknown as Repository<
        import('../trainers/entities/trainer.entity').Trainer
      >,
      {
        find: jest.fn().mockResolvedValue([]),
        ...overrides.locations,
      } as unknown as Repository<
        import('../locations/entities/location.entity').Location
      >,
    );

  it('returns real zeroes for valid empty analytics results', async () => {
    const service = createService({
      count: jest.fn().mockResolvedValue(0),
    });

    const result = await service.getAdminAnalytics();

    expect(result.kpis).toMatchObject({
      totalParticipants: 0,
      activeRegistrations: 0,
      pendingRegistrations: 0,
      upcomingSessions: 0,
      occupancyRate: 0,
      revenue: 0,
      outstandingBalance: 0,
    });
    expect(result.registrationTrend).toHaveLength(6);
    expect(result.revenueByAxis).toEqual([]);
    expect(result.trainingPopularity).toEqual([]);
    expect(result.referralSources).toEqual([]);
    expect(result.coachAnalytics.coaches).toEqual([]);
    expect(result.locationAnalytics.locations).toEqual([]);
    expect(result.trainingRatings).toEqual([]);
    expect(result.filterOptions).toEqual({
      trainings: [],
      coaches: [],
      locations: [],
    });
  });

  it('surfaces analytics repository failures instead of returning success-shaped zeroes', async () => {
    const failure = new Error('Database unavailable');
    const service = createService({
      count: jest.fn().mockRejectedValue(failure),
    });

    await expect(service.getAdminAnalytics()).rejects.toBe(failure);
  });

  it('uses public session availability rules for the upcoming-session KPI', async () => {
    const today = new Date().toISOString().slice(0, 10);
    const tomorrowDate = new Date(`${today}T00:00:00.000Z`);
    tomorrowDate.setUTCDate(tomorrowDate.getUTCDate() + 1);
    const tomorrow = tomorrowDate.toISOString().slice(0, 10);
    const sessionFind = jest
      .fn<Promise<Session[]>, [FindManyOptions<Session>]>()
      .mockResolvedValue([
        {
          startDate: tomorrow,
          lifecycleStatus: 'SCHEDULED',
          capacity: 10,
          seatsTaken: 5,
          training: {
            lifecycleStatus: 'PUBLISHED',
            active: true,
            title: 'Formation disponible',
            slug: 'formation-disponible',
            description: 'Description de la formation',
            durationValue: 1,
            price: 100,
            currency: 'TND',
            axisCode: 'EMS',
            recognitionType: 'NONE',
            approvalStatus: 'NOT_APPLICABLE',
          },
        },
        {
          startDate: tomorrow,
          lifecycleStatus: 'SCHEDULED',
          capacity: 10,
          seatsTaken: 10,
          training: { lifecycleStatus: 'DRAFT', active: true },
        },
      ] as unknown as Session[]);
    const service = createService(
      { count: jest.fn().mockResolvedValue(0) },
      { sessions: { find: sessionFind } },
    );

    const result = await service.getAdminAnalytics();

    expect(result.kpis.upcomingSessions).toBe(1);
    expect(result.kpis.occupancyRate).toBe(50);
    expect(sessionFind).toHaveBeenCalledTimes(1);
    const options = sessionFind.mock.calls[0]?.[0];
    expect(options?.relations).toEqual({
      training: true,
      trainers: true,
      locations: true,
    });
  });
});
