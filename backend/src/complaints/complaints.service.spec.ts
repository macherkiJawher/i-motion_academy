import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ComplaintsService } from './complaints.service';
import {
  Complaint,
  ComplaintCategory,
  ComplaintStatus,
} from './entities/complaint.entity';
import { ComplaintMessage } from './entities/complaint-message.entity';
import { ComplaintEvent } from './entities/complaint-event.entity';
import { ComplaintAttachment } from './entities/complaint-attachment.entity';
import { User, Role } from '../users/entities/user.entity';
import { Registration } from '../registrations/entities/registration.entity';
import { Payment } from '../payments/entities/payment.entity';
import { Session } from '../sessions/entities/session.entity';
import { Certificate } from '../certificates/entities/certificate.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../audit/audit.service';

describe('ComplaintsService', () => {
  let service: ComplaintsService;

  const complaintsRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    findOneBy: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
  };
  const messagesRepo = { save: jest.fn(), find: jest.fn(), create: jest.fn() };
  const eventsRepo = { save: jest.fn(), find: jest.fn(), create: jest.fn() };
  const attachmentsRepo = {
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
  };
  const usersRepo = { find: jest.fn(), findOneBy: jest.fn() };
  const registrationsRepo = { exists: jest.fn() };
  const paymentsRepo = { exists: jest.fn() };
  const sessionsRepo = { exists: jest.fn() };
  const certificatesRepo = { exists: jest.fn() };
  const auditService = {
    log: jest.fn(),
    logAdminAction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComplaintsService,
        { provide: getRepositoryToken(Complaint), useValue: complaintsRepo },
        {
          provide: getRepositoryToken(ComplaintMessage),
          useValue: messagesRepo,
        },
        { provide: getRepositoryToken(ComplaintEvent), useValue: eventsRepo },
        {
          provide: getRepositoryToken(ComplaintAttachment),
          useValue: attachmentsRepo,
        },
        { provide: getRepositoryToken(User), useValue: usersRepo },
        {
          provide: getRepositoryToken(Registration),
          useValue: registrationsRepo,
        },
        { provide: getRepositoryToken(Payment), useValue: paymentsRepo },
        { provide: getRepositoryToken(Session), useValue: sessionsRepo },
        {
          provide: getRepositoryToken(Certificate),
          useValue: certificatesRepo,
        },
        {
          provide: NotificationsService,
          useValue: { create: jest.fn() },
        },
        { provide: AuditService, useValue: auditService },
      ],
    }).compile();

    service = module.get<ComplaintsService>(ComplaintsService);
    jest.clearAllMocks();
    usersRepo.find.mockResolvedValue([]);
  });

  it('returns only grouped complaint status/category counts without complaint text', async () => {
    const query = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      addGroupBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([
        {
          status: ComplaintStatus.NEW,
          category: ComplaintCategory.PAYMENT,
          count: '2',
        },
        {
          status: ComplaintStatus.RESOLVED,
          category: ComplaintCategory.PAYMENT,
          count: '1',
        },
      ]),
    };
    complaintsRepo.createQueryBuilder = jest.fn().mockReturnValue(query);

    const result = await service.getAdminAssistantAggregates();

    expect(query.select).toHaveBeenCalledWith('complaint.status', 'status');
    expect(query.addSelect).toHaveBeenNthCalledWith(
      1,
      'complaint.category',
      'category',
    );
    expect(query.getRawMany).toHaveBeenCalledTimes(1);
    expect(result.total).toBe(3);
    expect(result.byStatus).toEqual(
      expect.arrayContaining([
        { status: ComplaintStatus.NEW, count: 2 },
        { status: ComplaintStatus.RESOLVED, count: 1 },
      ]),
    );
    expect(result.byCategory).toEqual(
      expect.arrayContaining([
        { category: ComplaintCategory.PAYMENT, count: 3 },
      ]),
    );
    expect(JSON.stringify(result)).not.toMatch(
      /message|subject|description|userId|reference|resolution/i,
    );
  });

  it('prevents a participant from reading another participant complaint', async () => {
    complaintsRepo.findOne.mockResolvedValue({
      id: 'complaint-1',
      userId: 'participant-a',
      status: ComplaintStatus.NEW,
    });

    await expect(
      service.findOne('complaint-1', {
        id: 'participant-b',
        role: Role.PARTICIPANT,
      } as User),
    ).rejects.toThrow('Accès non autorisé');
  });

  it('rejects invalid admin status transitions', async () => {
    complaintsRepo.findOneBy.mockResolvedValue({
      id: 'complaint-1',
      status: ComplaintStatus.NEW,
      userId: 'participant-a',
      resolution: null,
    });

    await expect(
      service.update(
        'complaint-1',
        { id: 'admin-1', role: Role.ADMIN } as User,
        { status: ComplaintStatus.CLOSED },
      ),
    ).rejects.toThrow('Transition de statut invalide');
  });

  it('requires a resolution before marking a complaint as resolved', async () => {
    complaintsRepo.findOneBy.mockResolvedValue({
      id: 'complaint-1',
      status: ComplaintStatus.IN_PROGRESS,
      userId: 'participant-a',
      resolution: null,
    });

    await expect(
      service.update(
        'complaint-1',
        { id: 'admin-1', role: Role.ADMIN } as User,
        { status: ComplaintStatus.RESOLVED },
      ),
    ).rejects.toThrow('Une réponse finale est obligatoire');
  });

  it('lets the owning participant request reopening with a reason', async () => {
    const existingComplaint = {
      id: 'complaint-1',
      userId: 'participant-a',
      status: ComplaintStatus.CLOSED,
    };
    const history = [
      { id: 'event-1', type: 'STATUS_CHANGED' },
      { id: 'event-2', type: 'REOPENED_BY_PARTICIPANT' },
    ];
    complaintsRepo.findOneBy.mockResolvedValue(existingComplaint);
    complaintsRepo.update.mockResolvedValue({ affected: 1 });
    complaintsRepo.findOne.mockResolvedValue({
      ...existingComplaint,
      status: ComplaintStatus.IN_PROGRESS,
    });
    messagesRepo.find.mockResolvedValue([{ id: 'message-1' }]);
    eventsRepo.find.mockResolvedValue(history);
    attachmentsRepo.find.mockResolvedValue([{ id: 'attachment-1' }]);
    eventsRepo.save.mockResolvedValue({});

    const result = await service.requestReopen(
      'complaint-1',
      { id: 'participant-a', role: Role.PARTICIPANT } as User,
      { justification: 'Je souhaite apporter des éléments complémentaires.' },
    );

    expect(result.status).toBe(ComplaintStatus.IN_PROGRESS);
    expect(result.messages).toEqual([{ id: 'message-1' }]);
    expect(result.events).toEqual(history);
    expect(result.attachments).toEqual([{ id: 'attachment-1' }]);
    expect(complaintsRepo.update).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'complaint-1' }),
      { status: ComplaintStatus.IN_PROGRESS },
    );
    expect(eventsRepo.create).toHaveBeenCalledWith({
      complaintId: 'complaint-1',
      actorId: 'participant-a',
      type: 'REOPENED_BY_PARTICIPANT',
      details: 'Je souhaite apporter des éléments complémentaires.',
    });
  });

  it('refuses a participant who does not own the complaint', async () => {
    complaintsRepo.findOneBy.mockResolvedValue({
      id: 'complaint-1',
      userId: 'participant-a',
      status: ComplaintStatus.CLOSED,
    });

    await expect(
      service.requestReopen(
        'complaint-1',
        { id: 'participant-b', role: Role.PARTICIPANT } as User,
        { justification: 'Je souhaite apporter des éléments complémentaires.' },
      ),
    ).rejects.toThrow('Accès non autorisé');
    expect(complaintsRepo.update).not.toHaveBeenCalled();
    expect(eventsRepo.save).not.toHaveBeenCalled();
  });

  it('allows an admin to reopen a rejected complaint', async () => {
    const complaint = {
      id: 'complaint-1',
      userId: 'participant-a',
      status: ComplaintStatus.REJECTED,
    };
    complaintsRepo.findOneBy.mockResolvedValue(complaint);
    complaintsRepo.update.mockResolvedValue({ affected: 1 });
    complaintsRepo.findOne.mockResolvedValue({
      ...complaint,
      status: ComplaintStatus.IN_PROGRESS,
    });
    messagesRepo.find.mockResolvedValue([]);
    eventsRepo.find.mockResolvedValue([]);
    attachmentsRepo.find.mockResolvedValue([]);
    eventsRepo.save.mockResolvedValue({});

    const result = await service.reopenAsAdmin(
      'complaint-1',
      { id: 'admin-1', role: Role.ADMIN } as User,
      { justification: 'Réexamen demandé après vérification.' },
    );

    expect(result.status).toBe(ComplaintStatus.IN_PROGRESS);
    expect(eventsRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'REOPENED_BY_ADMIN',
        details: 'Réexamen demandé après vérification.',
      }),
    );
    expect(auditService.logAdminAction).toHaveBeenCalled();
  });

  it('rejects reopening from a non-terminal status', async () => {
    complaintsRepo.findOneBy.mockResolvedValue({
      id: 'complaint-1',
      userId: 'participant-a',
      status: ComplaintStatus.IN_PROGRESS,
    });

    await expect(
      service.requestReopen(
        'complaint-1',
        { id: 'participant-a', role: Role.PARTICIPANT } as User,
        { justification: 'Je souhaite apporter des éléments complémentaires.' },
      ),
    ).rejects.toThrow('Réouverture impossible');
    expect(complaintsRepo.update).not.toHaveBeenCalled();
    expect(eventsRepo.save).not.toHaveBeenCalled();
  });

  it('rejects a concurrent reopening after the terminal status has changed', async () => {
    complaintsRepo.findOneBy.mockResolvedValue({
      id: 'complaint-1',
      userId: 'participant-a',
      status: ComplaintStatus.CLOSED,
    });
    complaintsRepo.update.mockResolvedValue({ affected: 0 });

    await expect(
      service.requestReopen(
        'complaint-1',
        { id: 'participant-a', role: Role.PARTICIPANT } as User,
        { justification: 'Je souhaite apporter des éléments complémentaires.' },
      ),
    ).rejects.toThrow('a changé de statut');
    expect(eventsRepo.save).not.toHaveBeenCalled();
  });

  it('blocks unsupported attachment types before storing them', async () => {
    complaintsRepo.findOneBy.mockResolvedValue({
      id: 'complaint-1',
      userId: 'participant-a',
      status: ComplaintStatus.NEW,
    });

    await expect(
      service.addAttachments(
        'complaint-1',
        { id: 'participant-a', role: Role.PARTICIPANT } as User,
        [
          {
            originalname: 'dangerous.exe',
            filename: 'dangerous.exe',
            mimetype: 'application/octet-stream',
            size: 256,
            buffer: Buffer.from('not-a-pdf'),
          },
        ],
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('sanitizes path traversal names and accepts valid attachments', async () => {
    complaintsRepo.findOneBy.mockResolvedValue({
      id: 'complaint-1',
      userId: 'participant-a',
      status: ComplaintStatus.NEW,
    });
    const png = Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      Buffer.from('fake-png-content'),
    ]);
    attachmentsRepo.save.mockResolvedValue([{ id: 'attachment-1' }]);
    eventsRepo.save.mockResolvedValue({});

    const result = await service.addAttachments(
      'complaint-1',
      { id: 'participant-a', role: Role.PARTICIPANT } as User,
      [
        {
          originalname: '../../evil.png',
          filename: 'safe.png',
          mimetype: 'image/png',
          size: png.length,
          buffer: png,
        },
      ],
    );

    expect(result).toEqual([{ id: 'attachment-1' }]);
    expect(attachmentsRepo.create).toHaveBeenCalledTimes(1);
  });

  it('enforces the spam threshold on complaint creation', () => {
    const actual = service as unknown as {
      assertRateLimit: (userId: string, scope: string) => void;
    };
    const rateLimit = ((userId: string, scope: string) =>
      actual.assertRateLimit(userId, scope)) as (
      userId: string,
      scope: string,
    ) => void;

    for (let i = 0; i < 5; i += 1) {
      expect(() => rateLimit('user-1', 'complaint:create')).not.toThrow();
    }

    expect(() => rateLimit('user-1', 'complaint:create')).toThrow(
      ForbiddenException,
    );
  });
});
