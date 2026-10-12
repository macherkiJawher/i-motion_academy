import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { RegistrationsService } from './registrations.service';
import {
  Registration,
  RegistrationStatus,
  PaymentStatus,
} from './entities/registration.entity';
import {
  Session,
  SessionLifecycleStatus,
  SessionStatus,
} from '../sessions/entities/session.entity';
import { User } from '../users/entities/user.entity';
import {
  ApprovalStatus,
  AxisCode,
  RecognitionType,
  Training,
  TrainingDurationUnit,
  TrainingLifecycleStatus,
  TrainingLevel,
} from '../trainings/entities/training.entity';
import { AuditService } from '../audit/audit.service';

describe('RegistrationsService', () => {
  let service: RegistrationsService;

  const registrationsRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };

  const sessionsRepo = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const usersRepo = {
    findOne: jest.fn(),
  };
  const trainingsRepo = {
    findOne: jest.fn(),
  };
  const dataSource = {
    transaction: jest.fn((callback: (manager: unknown) => unknown) =>
      callback({
        getRepository: (entity: object) => {
          if (entity === Session) return sessionsRepo;
          if (entity === Registration) return registrationsRepo;
          if (entity === User) return usersRepo;
          if (entity === Training) return trainingsRepo;
          throw new Error('Unexpected repository');
        },
      }),
    ),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegistrationsService,
        {
          provide: getRepositoryToken(Registration),
          useValue: registrationsRepo,
        },
        { provide: getRepositoryToken(Session), useValue: sessionsRepo },
        { provide: getRepositoryToken(User), useValue: usersRepo },
        { provide: DataSource, useValue: dataSource },
        {
          provide: AuditService,
          useValue: {
            logAdminAction: jest.fn(),
            getAuditLogs: jest.fn(),
            getSummary: jest.fn(),
            getUserSessions: jest.fn(),
            exportAsCsv: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<RegistrationsService>(RegistrationsService);
    jest.clearAllMocks();
  });

  it('limits session registration results to the authenticated owner', async () => {
    registrationsRepo.find.mockResolvedValue([]);

    await service.findBySession('session-1', 'user-1', 'PARTICIPANT');

    expect(registrationsRepo.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { sessionId: 'session-1', userId: 'user-1' },
      }),
    );
  });

  it('allows admins to list all registrations for a session', async () => {
    registrationsRepo.find.mockResolvedValue([]);

    await service.findBySession('session-1', 'admin-1', 'ADMIN');

    expect(registrationsRepo.find).toHaveBeenCalledWith(
      expect.objectContaining({ where: { sessionId: 'session-1' } }),
    );
  });

  it('does not allow a participant to read another user registration', async () => {
    registrationsRepo.findOne.mockResolvedValue({
      id: 'reg-1',
      userId: 'user-2',
      createdAt: new Date(),
      session: null,
    });

    await expect(
      service.findOneForActor('reg-1', 'user-1', 'PARTICIPANT'),
    ).rejects.toThrow('Registration not found');
  });

  it('allows the registration owner to read their registration', async () => {
    registrationsRepo.findOne.mockResolvedValue({
      id: 'reg-1',
      userId: 'user-1',
      createdAt: new Date(),
      session: null,
      status: RegistrationStatus.PENDING,
      paymentStatus: PaymentStatus.PENDING,
    });

    await expect(
      service.findOneForActor('reg-1', 'user-1', 'PARTICIPANT'),
    ).resolves.toMatchObject({ id: 'reg-1', userId: 'user-1' });
  });

  it('updates only the authenticated owner’s personal registration details', async () => {
    const registration = {
      id: 'reg-1',
      userId: 'user-1',
      participantName: 'John Doe',
      participantEmail: 'john@example.com',
      phone: '123',
      address: 'Old address',
      identityDocument: 'uploads/registrations/id.pdf',
      status: RegistrationStatus.CONFIRMED,
      paymentStatus: PaymentStatus.PENDING,
      amountDue: 100,
      amountPaid: 0,
      createdAt: new Date(),
      session: null,
    };
    registrationsRepo.findOne.mockResolvedValue(registration);
    registrationsRepo.save.mockResolvedValue(registration);

    const result = await service.updateOwnDetails('reg-1', 'user-1', {
      participantName: 'Jane Doe',
      address: 'New address',
    });

    expect(registrationsRepo.findOne).toHaveBeenCalledWith({
      where: { id: 'reg-1', userId: 'user-1' },
      relations: { session: { training: true }, user: true },
    });
    expect(registrationsRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        participantName: 'Jane Doe',
        address: 'New address',
        identityDocument: 'uploads/registrations/id.pdf',
        status: RegistrationStatus.CONFIRMED,
        paymentStatus: PaymentStatus.PENDING,
      }),
    );
    expect(result.participantName).toBe('Jane Doe');
  });

  it('does not allow a participant to view another user’s registration document', async () => {
    registrationsRepo.findOne.mockResolvedValue({
      id: 'reg-1',
      userId: 'user-2',
      identityDocument: 'uploads/registrations/id.pdf',
    });

    await expect(
      service.getDocument('reg-1', 'identity', 'user-1', 'PARTICIPANT'),
    ).rejects.toThrow('You cannot access documents for this registration');
  });

  it('creates a registration with default pending statuses and a generated reference', async () => {
    const training: Training = {
      id: 'training-1',
      slug: 'ems-workshop',
      title: 'EMS Workshop',
      axisCode: AxisCode.EMS,
      subcategory: 'EMS',
      recognitionType: RecognitionType.I_MOTION_CERTIFICATE,
      approvalStatus: ApprovalStatus.NOT_APPLICABLE,
      approvalReference: null,
      approvalAuthority: null,
      approvalValidUntil: null,
      lifecycleStatus: TrainingLifecycleStatus.PUBLISHED,
      tagline: 'Power your mobility',
      description: 'desc',
      level: TrainingLevel.FOUNDATION,
      durationHours: 12,
      durationValue: 12,
      durationUnit: TrainingDurationUnit.HOURS,
      price: 350,
      currency: 'TND',
      certification: 'CERT',
      credentialTitle: 'CERT',
      credentialIssuer: null,
      targetAudience: 'Everyone',
      prerequisites: '',
      skills: ['mobility'],
      objectives: [],
      program: [],
      coverUrl: '',
      rating: 4.7,
      learners: 100,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const session: Session = {
      id: 'session-1',
      trainingId: training.id,
      training,
      trainerId: null,
      trainerName: 'Alice',
      locationId: null,
      locationName: 'Studio',
      city: 'Paris',
      mode: 'On-site',
      startDate: '2026-10-01',
      endDate: '2026-10-03',
      startTime: '09:00',
      endTime: '17:00',
      lifecycleStatus: SessionLifecycleStatus.SCHEDULED,
      capacity: 10,
      seatsTaken: 2,
      status: SessionStatus.OPEN,
      price: 350,
      currency: 'EUR',
      certification: 'CERT',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Session;

    sessionsRepo.findOne.mockResolvedValue(session);
    trainingsRepo.findOne.mockResolvedValue(training);

    const created = {
      id: 'reg-1',
      reference: 'IMA-2026-0001',
      userId: null,
      participantName: 'John Doe',
      participantEmail: 'john@example.com',
      phone: '0123456789',
      notes: 'Need invoice',
      sessionId: session.id,
      status: RegistrationStatus.PENDING,
      paymentStatus: PaymentStatus.PENDING,
      amountDue: 350,
      amountPaid: 0,
      currency: 'EUR',
      certificateId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      session,
    };

    registrationsRepo.create.mockReturnValue(created);
    registrationsRepo.save.mockResolvedValue(created);
    registrationsRepo.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValue(created);
    sessionsRepo.findOne.mockResolvedValue(session);

    const result = await service.create({
      sessionId: session.id,
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      phone: '0123456789',
      notes: 'Need invoice',
    });

    expect(result.reference).toMatch(/^IMA-/);
    expect(result.status).toBe(RegistrationStatus.PENDING);
    expect(result.paymentStatus).toBe(PaymentStatus.PENDING);
    expect(result.amountDue).toBe(350);
    expect(result.participantName).toBe('John Doe');
    expect(sessionsRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ seatsTaken: 3, status: SessionStatus.OPEN }),
    );
    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(sessionsRepo.findOne).toHaveBeenCalledWith({
      where: { id: session.id },
      lock: { mode: 'pessimistic_write' },
    });
    expect(trainingsRepo.findOne).toHaveBeenCalledWith({
      where: { id: training.id },
    });
  });

  it('keeps payment pending when an admin confirms a registration', async () => {
    const registration = {
      id: 'reg-1',
      status: RegistrationStatus.PENDING,
      paymentStatus: PaymentStatus.PENDING,
      sessionId: 'session-1',
      session: { training: {} },
      createdAt: new Date(),
    } as Registration;

    registrationsRepo.findOne.mockResolvedValue(registration);
    sessionsRepo.findOne.mockResolvedValue({
      id: 'session-1',
      seatsTaken: 2,
      capacity: 10,
      status: SessionStatus.OPEN,
    });
    registrationsRepo.save.mockImplementation((value: Registration) =>
      Promise.resolve(value),
    );

    const result = await service.update('reg-1', {
      status: RegistrationStatus.CONFIRMED,
    });

    expect(result.status).toBe(RegistrationStatus.CONFIRMED);
    expect(result.paymentStatus).toBe(PaymentStatus.PENDING);
    expect(sessionsRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ seatsTaken: 2 }),
    );
  });

  it('confirms a pending registration when payment becomes paid', async () => {
    const registration = {
      id: 'reg-1',
      status: RegistrationStatus.PENDING,
      paymentStatus: PaymentStatus.PENDING,
      sessionId: 'session-1',
      session: { training: {} },
      createdAt: new Date(),
    } as Registration;

    registrationsRepo.findOne.mockResolvedValue(registration);
    sessionsRepo.findOne.mockResolvedValue({
      id: 'session-1',
      seatsTaken: 2,
      capacity: 10,
      status: SessionStatus.OPEN,
    });
    registrationsRepo.save.mockImplementation((value: Registration) =>
      Promise.resolve(value),
    );

    const result = await service.update('reg-1', {
      paymentStatus: PaymentStatus.PAID,
    });

    expect(result.status).toBe(RegistrationStatus.CONFIRMED);
    expect(result.paymentStatus).toBe(PaymentStatus.PAID);
  });

  it('confirms a pending registration when a partial payment is applied', async () => {
    const registration = {
      id: 'reg-1',
      status: RegistrationStatus.PENDING,
      paymentStatus: PaymentStatus.PENDING,
      amountDue: 350,
      amountPaid: 0,
      sessionId: 'session-1',
      session: { training: {} },
      createdAt: new Date(),
    } as Registration;

    registrationsRepo.findOne.mockResolvedValue(registration);
    registrationsRepo.save.mockImplementation((value: Registration) =>
      Promise.resolve(value),
    );

    const result = await service.applyPayment('reg-1', 100);

    expect(result.status).toBe(RegistrationStatus.CONFIRMED);
    expect(result.paymentStatus).toBe(PaymentStatus.PARTIAL);
    expect(result.amountPaid).toBe(100);
    expect(registrationsRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        status: RegistrationStatus.CONFIRMED,
        paymentStatus: PaymentStatus.PARTIAL,
        amountPaid: 100,
      }),
    );
  });

  it('decrements seats and recalculates status when a registration is cancelled', async () => {
    const registration = {
      id: 'reg-1',
      status: RegistrationStatus.PENDING,
      paymentStatus: PaymentStatus.PENDING,
      sessionId: 'session-1',
      session: { training: {} },
      createdAt: new Date(),
    } as Registration;
    registrationsRepo.findOne.mockResolvedValue(registration);
    registrationsRepo.save.mockImplementation((value: Registration) =>
      Promise.resolve(value),
    );
    sessionsRepo.findOne.mockResolvedValue({
      id: 'session-1',
      seatsTaken: 8,
      capacity: 10,
      status: SessionStatus.ALMOST_FULL,
    });

    await service.update('reg-1', { status: RegistrationStatus.CANCELLED });

    expect(sessionsRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ seatsTaken: 7, status: SessionStatus.OPEN }),
    );
  });

  it('does not permit reactivation when the session is full', async () => {
    const registration = {
      id: 'reg-1',
      status: RegistrationStatus.CANCELLED,
      paymentStatus: PaymentStatus.PENDING,
      sessionId: 'session-1',
    } as Registration;
    registrationsRepo.findOne.mockResolvedValue(registration);
    sessionsRepo.findOne.mockResolvedValue({
      id: 'session-1',
      seatsTaken: 10,
      capacity: 10,
      status: SessionStatus.FULL,
      lifecycleStatus: SessionLifecycleStatus.SCHEDULED,
    });

    await expect(
      service.update('reg-1', { status: RegistrationStatus.CONFIRMED }),
    ).rejects.toThrow('Session is full');
  });

  it('releases the seat when an active registration is deleted', async () => {
    const registration = {
      id: 'reg-1',
      status: RegistrationStatus.CONFIRMED,
      sessionId: 'session-1',
    } as Registration;
    registrationsRepo.findOne.mockResolvedValue(registration);
    registrationsRepo.remove.mockImplementation((value: Registration) =>
      Promise.resolve(value),
    );
    sessionsRepo.findOne.mockResolvedValue({
      id: 'session-1',
      seatsTaken: 10,
      capacity: 10,
      status: SessionStatus.FULL,
    });

    await service.remove('reg-1');

    expect(sessionsRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        seatsTaken: 9,
        status: SessionStatus.ALMOST_FULL,
      }),
    );
    expect(registrationsRepo.remove).toHaveBeenCalledWith(registration);
  });

  it('rejects new registrations for cancelled sessions', async () => {
    sessionsRepo.findOne.mockResolvedValue({
      id: 'session-1',
      status: SessionStatus.OPEN,
      lifecycleStatus: SessionLifecycleStatus.CANCELLED,
      seatsTaken: 0,
      capacity: 10,
      training: {
        lifecycleStatus: TrainingLifecycleStatus.PUBLISHED,
        active: true,
        title: 'EMS Workshop',
        slug: 'ems-workshop',
        description: 'desc',
        durationHours: 12,
        durationValue: 12,
        price: 350,
        currency: 'TND',
        axisCode: AxisCode.EMS,
        recognitionType: RecognitionType.I_MOTION_CERTIFICATE,
        approvalStatus: ApprovalStatus.NOT_APPLICABLE,
        certification: 'CERT',
        credentialTitle: 'CERT',
      },
    });

    await expect(
      service.create({
        sessionId: 'session-1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '0123456789',
      }),
    ).rejects.toThrow('Session is not accepting registrations');
  });
});
