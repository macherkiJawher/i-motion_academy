import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import {
  AuditLog,
  AuditAction,
  AuditEntity,
  AuditStatus,
} from './entities/audit-log.entity';
import { User, Role } from '../users/entities/user.entity';

export interface AuditQueryDto {
  action?: AuditAction;
  entity?: AuditEntity;
  status?: string;
  actorRole?: Role;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export interface SessionLogDto {
  userId: string;
  sessionId: string;
  userName: string;
  userEmail: string;
  ipAddress: string;
  device: string;
  browser: string;
  location: string;
  lastSeenAt: string;
  startedAt: string;
  status: 'ACTIVE' | 'IDLE' | 'EXPIRED';
}

export interface AuditSummary {
  totalActions: number;
  activeSessions: number;
  riskySessions: number;
  lastSyncAt: string;
}

export interface AdminAssistantAuditAggregate {
  windowStart: string;
  windowEnd: string;
  totalActions: number;
  byActionAndStatus: {
    action: AuditAction;
    status: AuditStatus;
    count: number;
  }[];
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepository: Repository<AuditLog>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async log(
    action: AuditAction,
    entity: AuditEntity,
    actorId: string | null,
    entityId: string | null,
    details: string | null,
    ipAddress: string | null = null,
    userAgent: string | null = null,
  ): Promise<AuditLog> {
    const auditLog = this.auditRepository.create({
      action,
      entity,
      actorId,
      entityId,
      details,
      ipAddress,
      userAgent,
      status: AuditStatus.SUCCESS,
    });
    return this.auditRepository.save(auditLog);
  }

  async logAdminAction(
    actorId: string | null,
    action: AuditAction,
    entity: AuditEntity,
    entityId: string | null,
    details: string | null,
    status: AuditStatus = AuditStatus.SUCCESS,
    ipAddress: string | null = null,
    userAgent: string | null = null,
  ): Promise<AuditLog> {
    const log = this.auditRepository.create({
      action,
      entity,
      actorId,
      entityId,
      details,
      status,
      ipAddress,
      userAgent,
    });
    return this.auditRepository.save(log);
  }

  async getAuditLogs(query: AuditQueryDto) {
    const {
      action,
      entity,
      status,
      actorRole,
      startDate,
      endDate,
      limit = 50,
      offset = 0,
    } = query;

    let qb = this.auditRepository
      .createQueryBuilder('audit')
      .leftJoinAndSelect('audit.actor', 'actor')
      .orderBy('audit.createdAt', 'DESC');

    if (action) {
      qb = qb.andWhere('audit.action = :action', { action });
    }

    if (entity) {
      qb = qb.andWhere('audit.entity = :entity', { entity });
    }

    if (status) {
      qb = qb.andWhere('audit.status = :status', { status });
    }

    if (actorRole) {
      qb = qb.andWhere('actor.role = :role', { role: actorRole });
    }

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      qb = qb.andWhere('audit.createdAt BETWEEN :start AND :end', {
        start,
        end,
      });
    } else if (startDate) {
      const start = new Date(startDate);
      qb = qb.andWhere('audit.createdAt >= :start', { start });
    } else if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      qb = qb.andWhere('audit.createdAt <= :end', { end });
    }

    const [items, total] = await qb.skip(offset).take(limit).getManyAndCount();

    return {
      items,
      total,
      page: Math.floor(offset / limit) + 1,
      pageSize: limit,
      pages: Math.ceil(total / limit),
    };
  }

  async getUserSessions(): Promise<SessionLogDto[]> {
    const threshold = new Date(Date.now() - 30 * 60 * 1000);
    const recentLogins = await this.auditRepository.find({
      where: {
        action: AuditAction.USER_LOGIN,
        createdAt: Between(threshold, new Date()),
      },
      relations: ['actor'],
      order: { createdAt: 'DESC' },
    });

    const byUser = new Map<string, SessionLogDto>();
    for (const log of recentLogins) {
      if (!log.actorId || !log.actor) continue;
      const session: SessionLogDto = byUser.get(log.actorId) ?? {
        userId: log.actorId,
        sessionId: `session-${log.actorId}`,
        userName:
          `${log.actor.firstName ?? ''} ${log.actor.lastName ?? ''}`.trim() ||
          log.actor.email,
        userEmail: log.actor.email,
        ipAddress: log.ipAddress ?? 'Unknown',
        device: this.detectDevice(log.userAgent),
        browser: this.detectBrowser(log.userAgent),
        location: 'Unknown',
        lastSeenAt: log.createdAt.toISOString(),
        startedAt: log.createdAt.toISOString(),
        status: 'ACTIVE',
      };

      session.lastSeenAt = log.createdAt.toISOString();
      session.startedAt = log.createdAt.toISOString();
      session.ipAddress = log.ipAddress ?? session.ipAddress;
      session.device = this.detectDevice(log.userAgent) || session.device;
      session.browser = this.detectBrowser(log.userAgent) || session.browser;
      byUser.set(log.actorId, session);
    }

    return Array.from(byUser.values())
      .sort(
        (a, b) =>
          new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime(),
      )
      .map((session) => ({
        ...session,
        status: 'ACTIVE',
      }));
  }

  async getSummary(): Promise<AuditSummary> {
    try {
      const totalActions = await this.auditRepository.count();
      const lastSyncAt = new Date().toISOString();
      const userSessions = await this.getUserSessions();
      const activeSessions = userSessions.filter(
        (session) => session.status === 'ACTIVE',
      ).length;

      const riskyCount = await this.auditRepository.count({
        where: [{ action: AuditAction.USER_LOGIN, status: AuditStatus.FAILED }],
      });

      return {
        totalActions,
        activeSessions,
        riskySessions: riskyCount,
        lastSyncAt,
      };
    } catch (error) {
      this.logger.error('Error calculating audit summary', error);
      return {
        totalActions: 0,
        activeSessions: 0,
        riskySessions: 0,
        lastSyncAt: new Date().toISOString(),
      };
    }
  }

  async getAdminAssistantAggregates(
    now = new Date(),
  ): Promise<AdminAssistantAuditAggregate> {
    const windowStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const rows = await this.auditRepository
      .createQueryBuilder('audit')
      .select('audit.action', 'action')
      .addSelect('audit.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('audit.createdAt >= :windowStart', { windowStart })
      .andWhere('audit.createdAt <= :windowEnd', { windowEnd: now })
      .groupBy('audit.action')
      .addGroupBy('audit.status')
      .getRawMany<{
        action: AuditAction;
        status: AuditStatus;
        count: string | number;
      }>();
    const byActionAndStatus = rows
      .slice(
        0,
        Object.values(AuditAction).length * Object.values(AuditStatus).length,
      )
      .map((row) => ({
        action: row.action,
        status: row.status,
        count: Number(row.count),
      }));

    return {
      windowStart: windowStart.toISOString(),
      windowEnd: now.toISOString(),
      totalActions: byActionAndStatus.reduce(
        (total, row) => total + row.count,
        0,
      ),
      byActionAndStatus,
    };
  }

  async exportAsCsv(query: AuditQueryDto): Promise<string> {
    const { items } = await this.getAuditLogs({
      ...query,
      limit: 10000,
      offset: 0,
    });

    const headers = [
      'ID',
      'Timestamp',
      'Actor',
      'Actor Role',
      'Action',
      'Entity',
      'Entity ID',
      'Status',
      'Details',
      'IP Address',
    ];
    const rows = items.map((log) => [
      log.id,
      log.createdAt.toISOString(),
      log.actor ? `${log.actor.firstName} ${log.actor.lastName}` : 'System',
      log.actor?.role ?? 'N/A',
      log.action,
      log.entity,
      log.entityId ?? '',
      log.status,
      log.details ?? '',
      log.ipAddress ?? '',
    ]);

    const csv = [
      headers.join(','),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','),
      ),
    ].join('\n');

    return csv;
  }

  private detectDevice(userAgent?: string | null): string {
    if (!userAgent) return 'Unknown';
    if (/Mobile|Android|iPhone|iPad/i.test(userAgent)) return 'Mobile';
    if (/Windows/i.test(userAgent)) return 'Desktop';
    return 'Desktop';
  }

  private detectBrowser(userAgent?: string | null): string {
    if (!userAgent) return 'Unknown';
    if (/Edg/i.test(userAgent)) return 'Edge';
    if (/Chrome/i.test(userAgent)) return 'Chrome';
    if (/Firefox/i.test(userAgent)) return 'Firefox';
    if (/Safari/i.test(userAgent)) return 'Safari';
    return 'Unknown';
  }
}
