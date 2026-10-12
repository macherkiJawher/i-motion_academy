import {
  FeedbackType,
  type Feedback,
} from '../feedback/entities/feedback.entity';
import {
  RegistrationStatus,
  type Registration,
} from '../registrations/entities/registration.entity';
import {
  SessionLifecycleStatus,
  type Session,
} from '../sessions/entities/session.entity';
import { calculateAnalyticsBreakdowns } from './analytics-breakdowns';

describe('calculateAnalyticsBreakdowns', () => {
  const sessions = [
    {
      id: 'session-1',
      trainingId: 'training-1',
      startDate: '2026-05-01',
      lifecycleStatus: SessionLifecycleStatus.COMPLETED,
      capacity: 10,
      seatsTaken: 4,
      trainerId: null,
      trainerName: '',
      locationId: null,
      locationName: '',
      training: { id: 'training-1', title: 'Formation A' },
      trainers: [{ id: 'coach-1', firstName: 'Amina', lastName: 'Ali' }],
      locations: [{ id: 'location-1', name: 'Tunis' }],
    },
    {
      id: 'session-2',
      trainingId: 'training-1',
      startDate: '2026-06-01',
      lifecycleStatus: SessionLifecycleStatus.SCHEDULED,
      capacity: 8,
      seatsTaken: 6,
      trainerId: null,
      trainerName: '',
      locationId: null,
      locationName: '',
      training: { id: 'training-1', title: 'Formation A' },
      trainers: [
        { id: 'coach-1', firstName: 'Amina', lastName: 'Ali' },
        { id: 'coach-2', firstName: 'Sami', lastName: 'Ben Ali' },
      ],
      locations: [{ id: 'location-1', name: 'Tunis' }],
    },
    {
      id: 'session-cancelled',
      trainingId: 'training-1',
      startDate: '2026-06-10',
      lifecycleStatus: SessionLifecycleStatus.CANCELLED,
      capacity: 12,
      seatsTaken: 10,
      trainerId: null,
      trainerName: '',
      locationId: null,
      locationName: '',
      training: { id: 'training-1', title: 'Formation A' },
      trainers: [{ id: 'coach-1', firstName: 'Amina', lastName: 'Ali' }],
      locations: [{ id: 'location-1', name: 'Tunis' }],
    },
  ] as unknown as Session[];
  const registrations = [
    {
      sessionId: 'session-1',
      status: RegistrationStatus.CONFIRMED,
      userId: 'participant-1',
      participantEmail: 'one@example.com',
      referralSource: 'Facebook',
    },
    {
      sessionId: 'session-1',
      status: RegistrationStatus.PENDING,
      userId: 'participant-2',
      participantEmail: 'two@example.com',
      referralSource: 'instagram',
    },
    {
      sessionId: 'session-2',
      status: RegistrationStatus.COMPLETED,
      userId: 'participant-1',
      participantEmail: 'one@example.com',
      referralSource: 'Web',
    },
    {
      sessionId: 'session-cancelled',
      status: RegistrationStatus.CONFIRMED,
      userId: 'participant-3',
      participantEmail: 'three@example.com',
      referralSource: 'Publicité',
    },
  ] as unknown as Registration[];
  const feedback = [
    { sessionId: 'session-1', rating: 5, feedbackType: FeedbackType.TRAINING },
    { sessionId: 'session-2', rating: 1, feedbackType: FeedbackType.TRAINING },
    { sessionId: 'session-2', rating: 4, feedbackType: FeedbackType.TRAINER },
    { sessionId: 'session-2', rating: 8, feedbackType: FeedbackType.TRAINING },
  ] as unknown as Feedback[];

  it('aggregates sessions, distinct participants, referral percentages, and valid training ratings', () => {
    const result = calculateAnalyticsBreakdowns(
      sessions,
      registrations,
      feedback,
      {},
      [{ id: 'training-1', title: 'Formation A' }],
    );

    expect(result.coaches).toEqual([
      {
        id: 'coach-1',
        name: 'Amina Ali',
        sessions: 2,
        participants: 1,
        capacity: 18,
        seatsTaken: 10,
        occupancyRate: 55.6,
      },
      {
        id: 'coach-2',
        name: 'Sami Ben Ali',
        sessions: 1,
        participants: 1,
        capacity: 8,
        seatsTaken: 6,
        occupancyRate: 75,
      },
    ]);
    expect(result.locations).toEqual([
      {
        id: 'location-1',
        name: 'Tunis',
        sessions: 2,
        participants: 1,
        capacity: 18,
        seatsTaken: 10,
        occupancyRate: 55.6,
      },
    ]);
    expect(result.referralSources).toEqual([
      { source: 'Réseaux sociaux', registrations: 2, percentage: 66.7 },
      { source: 'Internet', registrations: 1, percentage: 33.3 },
    ]);
    expect(result.referralSourceDetails).toEqual({
      eligibleRegistrations: 3,
      socialNetworkRegistrations: 2,
      unspecifiedSocialNetwork: 0,
      networks: [
        {
          network: 'Facebook',
          registrations: 1,
          percentageOfSocialRegistrations: 50,
          percentageOfEligibleRegistrations: 33.3,
        },
        {
          network: 'Instagram',
          registrations: 1,
          percentageOfSocialRegistrations: 50,
          percentageOfEligibleRegistrations: 33.3,
        },
      ],
    });
    expect(result.trainingRatings).toEqual([
      {
        trainingId: 'training-1',
        training: 'Formation A',
        averageRating: 3,
        reviewCount: 2,
        distribution: [
          { rating: 1, count: 1 },
          { rating: 2, count: 0 },
          { rating: 3, count: 0 },
          { rating: 4, count: 0 },
          { rating: 5, count: 1 },
        ],
      },
    ]);
    expect(result.registrationCountsByTraining).toEqual([
      {
        training: 'Formation A',
        registrations: 3,
        byStatus: [
          { status: RegistrationStatus.PENDING, count: 1 },
          { status: RegistrationStatus.CONFIRMED, count: 1 },
          { status: RegistrationStatus.CANCELLED, count: 0 },
          { status: RegistrationStatus.COMPLETED, count: 1 },
        ],
      },
    ]);
    expect(result.registrationCountsBySession).toEqual([
      expect.objectContaining({
        training: 'Formation A',
        startDate: '2026-05-01',
        capacity: 10,
        seatsTaken: 4,
        registrations: 2,
      }),
      expect.objectContaining({
        training: 'Formation A',
        startDate: '2026-06-01',
        registrations: 1,
        byStatus: expect.arrayContaining([
          { status: RegistrationStatus.COMPLETED, count: 1 },
        ]),
      }),
    ]);
    expect(result.feedbackByType).toEqual([
      { type: FeedbackType.TRAINING, averageRating: 3, count: 2 },
      { type: FeedbackType.TRAINER, averageRating: 4, count: 1 },
      { type: FeedbackType.LOGISTICS, averageRating: 0, count: 0 },
      { type: FeedbackType.CONTENT, averageRating: 0, count: 0 },
    ]);
  });

  it('applies session date and coach filters and represents a selected course without reviews', () => {
    const result = calculateAnalyticsBreakdowns(
      sessions,
      registrations,
      feedback,
      {
        startDate: '2026-06-01',
        endDate: '2026-06-01',
        trainerId: 'coach-2',
      },
      [{ id: 'training-1', title: 'Formation A' }],
    );

    expect(result.coaches).toEqual([
      {
        id: 'coach-2',
        name: 'Sami Ben Ali',
        sessions: 1,
        participants: 1,
        capacity: 8,
        seatsTaken: 6,
        occupancyRate: 75,
      },
    ]);
    expect(result.referralSources).toEqual([
      { source: 'Internet', registrations: 1, percentage: 100 },
    ]);
    expect(result.trainingRatings[0]).toMatchObject({
      training: 'Formation A',
      averageRating: 1,
      reviewCount: 1,
    });

    const noReviewResult = calculateAnalyticsBreakdowns(
      [],
      [],
      [],
      { trainingId: 'training-1' },
      [{ id: 'training-1', title: 'Formation A' }],
    );
    expect(noReviewResult.trainingRatings[0]).toMatchObject({
      averageRating: null,
      reviewCount: 0,
    });
    expect(noReviewResult.referralSources).toEqual([]);
  });

  it('keeps generic social-media categories separate from known platform values', () => {
    const result = calculateAnalyticsBreakdowns(
      [sessions[0]],
      [
        registrations[0],
        {
          ...registrations[0],
          userId: 'participant-4',
          referralSource: 'Réseaux sociaux',
          status: RegistrationStatus.PENDING,
        },
        {
          ...registrations[0],
          userId: 'participant-5',
          referralSource: null,
          status: RegistrationStatus.CANCELLED,
        },
      ],
      [],
      {},
      [{ id: 'training-1', title: 'Formation A' }],
    );

    expect(result.referralSourceDetails).toEqual({
      eligibleRegistrations: 2,
      socialNetworkRegistrations: 2,
      unspecifiedSocialNetwork: 1,
      networks: [
        {
          network: 'Facebook',
          registrations: 1,
          percentageOfSocialRegistrations: 50,
          percentageOfEligibleRegistrations: 50,
        },
      ],
    });
  });

  it('returns no network distribution when the eligible registration denominator is zero', () => {
    const result = calculateAnalyticsBreakdowns([], [], [], {}, [
      { id: 'training-1', title: 'Formation A' },
    ]);

    expect(result.referralSourceDetails).toEqual({
      eligibleRegistrations: 0,
      socialNetworkRegistrations: 0,
      unspecifiedSocialNetwork: 0,
      networks: [],
    });
  });

  it('deduplicates unlinked coach participants by normalized email and excludes pending registrations', () => {
    const result = calculateAnalyticsBreakdowns(
      [sessions[0]],
      [
        {
          sessionId: sessions[0].id,
          status: RegistrationStatus.CONFIRMED,
          userId: null,
          participantEmail: ' Person@Example.com ',
          referralSource: null,
        },
        {
          sessionId: sessions[0].id,
          status: RegistrationStatus.COMPLETED,
          userId: null,
          participantEmail: 'person@example.com',
          referralSource: null,
        },
        {
          sessionId: sessions[0].id,
          status: RegistrationStatus.PENDING,
          userId: null,
          participantEmail: 'pending@example.com',
          referralSource: null,
        },
      ] as unknown as Registration[],
      [],
      {},
      [{ id: 'training-1', title: 'Formation A' }],
    );

    expect(result.coaches[0]).toMatchObject({
      name: 'Amina Ali',
      sessions: 1,
      participants: 1,
      capacity: 10,
      seatsTaken: 4,
      occupancyRate: 40,
    });
    expect(JSON.stringify(result.coaches)).not.toContain('@');
  });
});
