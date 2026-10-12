import { AuditService } from './audit.service';
import { AuditAction, AuditStatus } from './entities/audit-log.entity';
import { Role } from '../users/entities/user.entity';

describe('AuditService', () => {
  it('returns only grouped action/status counts for a bounded 30-day window', async () => {
    const query = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      addGroupBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([
        {
          action: AuditAction.USER_LOGIN,
          status: AuditStatus.SUCCESS,
          count: '3',
        },
        {
          action: AuditAction.USER_LOGIN,
          status: AuditStatus.FAILED,
          count: '1',
        },
      ]),
    };
    const auditRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(query),
    } as any;
    const service = new AuditService(auditRepository, {} as any);
    const now = new Date('2026-10-11T12:00:00.000Z');

    const result = await service.getAdminAssistantAggregates(now);

    expect(query.select).toHaveBeenCalledWith('audit.action', 'action');
    expect(query.addSelect).toHaveBeenNthCalledWith(
      1,
      'audit.status',
      'status',
    );
    expect(query.where).toHaveBeenCalledWith(
      'audit.createdAt >= :windowStart',
      { windowStart: new Date('2026-09-11T12:00:00.000Z') },
    );
    expect(query.andWhere).toHaveBeenCalledWith(
      'audit.createdAt <= :windowEnd',
      { windowEnd: now },
    );
    expect(query.getRawMany).toHaveBeenCalledTimes(1);
    expect(result.totalActions).toBe(4);
    expect(JSON.stringify(result)).not.toMatch(
      /actor|details|ipAddress|userAgent|entityId/i,
    );
  });

  it('builds active user sessions from recent login activity', async () => {
    const auditRepository = {
      count: jest.fn().mockResolvedValue(3),
      find: jest.fn().mockResolvedValue([
        {
          actorId: 'user-1',
          action: AuditAction.USER_LOGIN,
          createdAt: new Date(),
          status: AuditStatus.SUCCESS,
          actor: { firstName: 'Alice', lastName: 'Admin', role: Role.ADMIN },
        },
        {
          actorId: 'user-1',
          action: AuditAction.USER_LOGOUT,
          createdAt: new Date(Date.now() - 60 * 1000),
          status: AuditStatus.SUCCESS,
          actor: { firstName: 'Alice', lastName: 'Admin', role: Role.ADMIN },
        },
        {
          actorId: 'user-2',
          action: AuditAction.USER_LOGIN,
          createdAt: new Date(),
          status: AuditStatus.SUCCESS,
          actor: {
            firstName: 'Bob',
            lastName: 'Participant',
            role: Role.PARTICIPANT,
          },
        },
      ]),
      createQueryBuilder: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    } as any;

    const userRepository = {} as any;
    const service = new AuditService(auditRepository, userRepository);

    const sessions = await service.getUserSessions();

    expect(sessions.length).toBeGreaterThanOrEqual(1);
    expect(sessions[0]).toMatchObject({
      userId: 'user-2',
      status: 'ACTIVE',
    });
  });
});
