import { ConflictException } from '@nestjs/common';
import { SessionsService } from './sessions.service';
import {
  Session,
  SessionLifecycleStatus,
  SessionMode,
  SessionStatus,
} from './entities/session.entity';
import {
  TrainingLifecycleStatus,
  Training,
} from '../trainings/entities/training.entity';
import { Trainer } from '../trainers/entities/trainer.entity';
import { Location, LocationType } from '../locations/entities/location.entity';

describe('SessionsService assignments', () => {
  const trainingId = '11111111-1111-4111-8111-111111111111';
  const trainerOneId = '22222222-2222-4222-8222-222222222222';
  const trainerTwoId = '33333333-3333-4333-8333-333333333333';
  const locationOneId = '44444444-4444-4444-8444-444444444444';
  const locationTwoId = '55555555-5555-4555-8555-555555555555';

  const training = {
    id: trainingId,
    slug: 'sample-training',
    title: 'Sample training',
    axisCode: 'EMS',
    lifecycleStatus: TrainingLifecycleStatus.PUBLISHED,
    active: true,
    description: 'Published training',
    durationHours: 8,
    durationValue: 1,
    price: 100,
    currency: 'TND',
    recognitionType: 'NONE',
    approvalStatus: 'NOT_APPLICABLE',
  } as Training;

  const trainers = [
    { id: trainerOneId, firstName: 'Ada', lastName: 'One', active: true },
    { id: trainerTwoId, firstName: 'Grace', lastName: 'Two', active: true },
  ] as Trainer[];

  const locations = [
    {
      id: locationOneId,
      name: 'Studio A',
      type: LocationType.PHYSICAL,
      city: 'Tunis',
      address: 'A street',
      active: true,
    },
    {
      id: locationTwoId,
      name: 'Studio B',
      type: LocationType.PHYSICAL,
      city: 'Sousse',
      address: 'B street',
      active: true,
    },
  ] as Location[];

  it('creates a session with multiple linked trainers and locations while retaining legacy fields', async () => {
    const sessionsRepo = {
      create: jest.fn((value: object) => value),
      save: jest.fn((value: object) => ({ ...value, id: 'session-id' })),
    };
    const trainersRepo = { find: jest.fn(() => trainers) };
    const locationsRepo = { find: jest.fn(() => locations) };
    const service = new SessionsService(
      sessionsRepo as never,
      { findOne: jest.fn(() => training) } as never,
      trainersRepo as never,
      locationsRepo as never,
    );

    const result = await service.create({
      trainingId,
      trainerIds: [trainerOneId, trainerTwoId],
      locationIds: [locationOneId, locationTwoId],
      mode: SessionMode.ON_SITE,
      startDate: '2027-01-01',
      endDate: '2027-01-02',
      capacity: 10,
      price: 100,
    });

    expect(result.trainerIds).toEqual([trainerOneId, trainerTwoId]);
    expect(result.locationIds).toEqual([locationOneId, locationTwoId]);
    expect(result.trainerId).toBe(trainerOneId);
    expect(result.trainerName).toBe('Ada One');
    expect(result.locationId).toBe(locationOneId);
    expect(result.locationName).toBe('Studio A');
    expect(result.city).toBe('Tunis');
  });

  it('rejects assignments to archived or missing locations', async () => {
    const locationsRepo = { find: jest.fn(() => []) };
    const service = new SessionsService(
      { create: jest.fn(), save: jest.fn() } as never,
      { findOne: jest.fn(() => training) } as never,
      { find: jest.fn(() => trainers) } as never,
      locationsRepo as never,
    );

    await expect(
      service.create({
        trainingId,
        locationIds: [locationOneId],
        mode: SessionMode.ON_SITE,
        startDate: '2027-01-01',
        endDate: '2027-01-02',
        capacity: 10,
        price: 100,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('keeps an archived trainer and location already assigned to a session', async () => {
    const archivedTrainer = {
      id: trainerOneId,
      slug: 'ada-one',
      firstName: 'Ada',
      lastName: 'One',
      active: false,
    } as Trainer;
    const archivedLocation = {
      ...locations[0],
      id: locationOneId,
      active: false,
    } as Location;
    const session = {
      id: 'session-id',
      trainingId,
      training,
      trainers: [archivedTrainer],
      locations: [archivedLocation],
      trainerId: trainerOneId,
      trainerName: 'Ada One',
      locationId: locationOneId,
      locationName: 'Studio A',
      city: 'Tunis',
      address: 'A street',
      mode: SessionMode.ON_SITE,
      startDate: '2027-01-01',
      endDate: '2027-01-02',
      startTime: '09:00',
      endTime: '17:00',
      capacity: 10,
      seatsTaken: 0,
      status: 'OPEN',
      price: 100,
      currency: 'TND',
      certification: null,
    };
    const sessionsRepo = {
      findOne: jest.fn(() => session),
      save: jest.fn((value: object) => value),
    };
    const dataSource = {
      transaction: jest.fn((callback: (manager: unknown) => unknown) =>
        callback({ getRepository: () => sessionsRepo }),
      ),
    };
    const service = new SessionsService(
      sessionsRepo as never,
      { findOne: jest.fn(() => training) } as never,
      { find: jest.fn(() => [archivedTrainer]) } as never,
      { find: jest.fn(() => [archivedLocation]) } as never,
      undefined,
      undefined,
      dataSource as never,
    );

    const result = await service.update('session-id', {
      trainerIds: [trainerOneId],
      locationIds: [locationOneId],
    });

    expect(result.trainerIds).toEqual([trainerOneId]);
    expect(result.locationIds).toEqual([locationOneId]);
    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(sessionsRepo.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ lock: { mode: 'pessimistic_write' } }),
    );
  });

  it('rejects assigning an archived trainer that was not already linked', async () => {
    const archivedTrainer = {
      id: trainerOneId,
      firstName: 'Ada',
      lastName: 'One',
      active: false,
    } as Trainer;
    const session = {
      id: 'session-id',
      trainingId,
      training,
      trainers: [],
      locations: [],
      trainerId: null,
      locationId: null,
    };
    const sessionsRepo = { findOne: jest.fn(() => session) };
    const dataSource = {
      transaction: jest.fn((callback: (manager: unknown) => unknown) =>
        callback({ getRepository: () => sessionsRepo }),
      ),
    };
    const service = new SessionsService(
      sessionsRepo as never,
      { findOne: jest.fn(() => training) } as never,
      { find: jest.fn(() => [archivedTrainer]) } as never,
      { find: jest.fn(() => []) } as never,
      undefined,
      undefined,
      dataSource as never,
    );

    await expect(
      service.update('session-id', { trainerIds: [trainerOneId] }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('derives the full status from capacity instead of trusting an open status', async () => {
    const sessionsRepo = {
      create: jest.fn((value: object) => value),
      save: jest.fn((value: object) => ({ ...value, id: 'session-id' })),
    };
    const service = new SessionsService(
      sessionsRepo as never,
      { findOne: jest.fn(() => training) } as never,
      { find: jest.fn(() => []) } as never,
      { find: jest.fn(() => []) } as never,
    );

    const result = await service.create({
      trainingId,
      mode: SessionMode.ON_SITE,
      startDate: '2027-01-01',
      endDate: '2027-01-02',
      capacity: 10,
      price: 100,
      status: SessionStatus.FULL,
    });

    expect(result.status).toBe('OPEN');
  });

  it('rejects a same-day session whose end time is not later than its start time', async () => {
    const service = new SessionsService(
      { create: jest.fn(), save: jest.fn() } as never,
      { findOne: jest.fn(() => training) } as never,
      { find: jest.fn(() => []) } as never,
      { find: jest.fn(() => []) } as never,
    );

    await expect(
      service.create({
        trainingId,
        mode: SessionMode.ON_SITE,
        startDate: '2027-01-01',
        endDate: '2027-01-01',
        startTime: '17:00',
        endTime: '09:00',
        capacity: 10,
        price: 100,
      }),
    ).rejects.toThrow('endTime must be later than startTime on the same day');
  });

  it('rejects coordinates provided without their pair', async () => {
    const service = new SessionsService(
      { create: jest.fn(), save: jest.fn() } as never,
      { findOne: jest.fn(() => training) } as never,
      { find: jest.fn(() => []) } as never,
      { find: jest.fn(() => []) } as never,
    );

    await expect(
      service.create({
        trainingId,
        mode: SessionMode.ON_SITE,
        startDate: '2027-01-01',
        endDate: '2027-01-02',
        latitude: 36.8,
        capacity: 10,
        price: 100,
      }),
    ).rejects.toThrow('Latitude and longitude must be provided together');
  });

  it('requires an online meeting URL for hybrid delivery', async () => {
    const service = new SessionsService(
      { create: jest.fn(), save: jest.fn() } as never,
      { findOne: jest.fn(() => training) } as never,
      { find: jest.fn(() => []) } as never,
      { find: jest.fn(() => []) } as never,
    );

    await expect(
      service.create({
        trainingId,
        mode: SessionMode.HYBRID,
        startDate: '2027-01-01',
        endDate: '2027-01-02',
        capacity: 10,
        price: 100,
      }),
    ).rejects.toThrow('A meeting URL is required');
  });

  it('refuses to delete a session with registration history', async () => {
    const session = { id: 'session-id' };
    const sessionsRepo = {
      findOne: jest.fn(() => session),
      remove: jest.fn(),
    };
    const service = new SessionsService(
      sessionsRepo as never,
      { findOne: jest.fn() } as never,
      { find: jest.fn() } as never,
      { find: jest.fn() } as never,
      undefined,
      { count: jest.fn(() => 1) } as never,
    );

    await expect(service.remove('session-id')).rejects.toThrow(
      'Sessions with registrations cannot be deleted',
    );
    expect(sessionsRepo.remove).not.toHaveBeenCalled();
  });

  it('returns the meeting URL to administrators but not public session responses', async () => {
    const session = {
      id: 'session-id',
      trainingId,
      training,
      trainers: [],
      locations: [],
      trainerId: null,
      trainerName: '',
      locationId: null,
      locationName: '',
      city: '',
      address: '',
      latitude: null,
      longitude: null,
      mode: SessionMode.LIVE_ONLINE,
      startDate: '2027-01-01',
      endDate: '2027-01-02',
      startTime: '09:00',
      endTime: '17:00',
      lifecycleStatus: SessionLifecycleStatus.SCHEDULED,
      meetingUrl: 'https://meet.example.test/session',
      scheduleDetails: null,
      capacity: 10,
      seatsTaken: 0,
      status: SessionStatus.OPEN,
      price: 100,
      currency: 'TND',
      certification: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Session;
    const draftSession = {
      ...session,
      id: 'draft-session-id',
      lifecycleStatus: SessionLifecycleStatus.DRAFT,
    };
    const pastSession = {
      ...session,
      id: 'past-session-id',
      startDate: '2025-01-01',
      endDate: '2025-01-02',
    };
    const fullSession = {
      ...session,
      id: 'full-session-id',
      capacity: 10,
      seatsTaken: 10,
      status: SessionStatus.FULL,
    };
    const sessionsRepo = {
      find: jest.fn(() => [session, draftSession, pastSession, fullSession]),
    };
    const service = new SessionsService(
      sessionsRepo as never,
      { findOne: jest.fn() } as never,
      { find: jest.fn() } as never,
      { find: jest.fn() } as never,
    );

    const publicSessions = await service.findAll();
    const availableSessions = await service.findAllAvailableForRegistration();
    const adminSessions = await service.findAllForAdmin();

    expect(publicSessions).toHaveLength(3);
    expect(publicSessions[0]).not.toHaveProperty('meetingUrl');
    expect(availableSessions).toHaveLength(1);
    expect(availableSessions[0].id).toBe(session.id);
    expect(availableSessions[0]).not.toHaveProperty('meetingUrl');
    expect(adminSessions).toHaveLength(4);
    expect(adminSessions[0].meetingUrl).toBe(session.meetingUrl);
  });
});
