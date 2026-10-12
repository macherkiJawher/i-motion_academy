import {
  ApprovalStatus,
  RecognitionType,
  Training,
  TrainingLifecycleStatus,
} from '../trainings/entities/training.entity';
import {
  Session,
  SessionLifecycleStatus,
  SessionMode,
  SessionStatus,
} from './entities/session.entity';
import { isSessionAvailableForRegistration } from './session-availability';

describe('isSessionAvailableForRegistration', () => {
  const today = '2026-10-10';
  const training = {
    id: 'training-id',
    slug: 'sample-training',
    title: 'Sample training',
    axisCode: 'EMS',
    lifecycleStatus: TrainingLifecycleStatus.PUBLISHED,
    active: true,
    description: 'Published training',
    durationValue: 1,
    price: 100,
    currency: 'TND',
    recognitionType: RecognitionType.NONE,
    approvalStatus: ApprovalStatus.NOT_APPLICABLE,
  } as Training;

  const makeSession = (overrides: Partial<Session> = {}): Partial<Session> =>
    ({
      trainingId: training.id,
      training,
      mode: SessionMode.ON_SITE,
      startDate: '2026-10-11',
      endDate: '2026-10-12',
      capacity: 10,
      seatsTaken: 2,
      status: SessionStatus.OPEN,
      lifecycleStatus: SessionLifecycleStatus.SCHEDULED,
      price: 100,
      currency: 'TND',
      ...overrides,
    }) as Partial<Session>;

  it('accepts future sessions and sessions taking place today', () => {
    expect(isSessionAvailableForRegistration(makeSession(), today)).toBe(true);
    expect(
      isSessionAvailableForRegistration(
        makeSession({ startDate: today, endDate: today }),
        today,
      ),
    ).toBe(true);
  });

  it('uses the UTC date when no reference date is supplied', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-10T23:30:00.000Z'));
    try {
      expect(
        isSessionAvailableForRegistration(
          makeSession({ startDate: today, endDate: today }),
        ),
      ).toBe(true);
    } finally {
      jest.useRealTimers();
    }
  });

  it('rejects sessions that have already ended', () => {
    expect(
      isSessionAvailableForRegistration(
        makeSession({ startDate: '2026-10-08', endDate: '2026-10-09' }),
        today,
      ),
    ).toBe(false);
  });

  it('rejects full sessions even if their status is stale', () => {
    expect(
      isSessionAvailableForRegistration(
        makeSession({ seatsTaken: 10, status: SessionStatus.OPEN }),
        today,
      ),
    ).toBe(false);
  });

  it('rejects closed sessions', () => {
    expect(
      isSessionAvailableForRegistration(
        makeSession({ status: SessionStatus.CLOSED }),
        today,
      ),
    ).toBe(false);
  });

  it('accepts almost-full sessions while seats remain', () => {
    expect(
      isSessionAvailableForRegistration(
        makeSession({ seatsTaken: 9, status: SessionStatus.ALMOST_FULL }),
        today,
      ),
    ).toBe(true);
  });

  it('rejects sessions linked to an unavailable training', () => {
    expect(
      isSessionAvailableForRegistration(
        makeSession({
          training: {
            ...training,
            lifecycleStatus: TrainingLifecycleStatus.DRAFT,
          },
        }),
        today,
      ),
    ).toBe(false);
  });

  it('rejects sessions whose training relation does not match trainingId', () => {
    expect(
      isSessionAvailableForRegistration(
        makeSession({
          training: { ...training, id: 'different-training-id' },
        }),
        today,
      ),
    ).toBe(false);
  });

  it('rejects invalid or mismatched session prices', () => {
    expect(
      isSessionAvailableForRegistration(makeSession({ price: Number.NaN }), today),
    ).toBe(false);
    expect(
      isSessionAvailableForRegistration(
        makeSession({ currency: 'EUR' }),
        today,
      ),
    ).toBe(false);
  });
});
