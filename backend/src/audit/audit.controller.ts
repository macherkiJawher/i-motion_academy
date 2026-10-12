import {
  Controller,
  Get,
  Query,
  UseGuards,
  Res,
  BadRequestException,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { Role } from '../users/entities/user.entity';
import { AuditService, AuditQueryDto } from './audit.service';
import { AuditAction, AuditEntity } from './entities/audit-log.entity';

@ApiTags('audit')
@Controller('admin/audit-logs')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.ADMIN)
@ApiBearerAuth()
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  async list(
    @Query('action') action?: AuditAction,
    @Query('entity') entity?: AuditEntity,
    @Query('status') status?: string,
    @Query('actorRole') actorRole?: Role,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const query: AuditQueryDto = {
      action,
      entity,
      status,
      actorRole,
      startDate,
      endDate,
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
    };

    // Validate pagination
    if (
      !query.limit ||
      isNaN(query.limit) ||
      query.limit < 1 ||
      query.limit > 1000
    ) {
      query.limit = 50;
    }
    if (!query.offset || isNaN(query.offset) || query.offset < 0) {
      query.offset = 0;
    }

    const auditLogs = await this.auditService.getAuditLogs(query);
    const summary = await this.auditService.getSummary();
    const userSessions = await this.auditService.getUserSessions();

    const actions = auditLogs.items.map((log) => ({
      id: log.id,
      actorName: log.actor
        ? `${log.actor.firstName} ${log.actor.lastName}`
        : 'System',
      actorRole: log.actor?.role ?? 'SYSTEM',
      action: log.action,
      entity: log.entity,
      entityId: log.entityId ?? '',
      details: log.details ?? '',
      status: log.status,
      createdAt: log.createdAt.toISOString(),
    }));

    return {
      summary,
      actions,
      userSessions,
      pagination: {
        page: auditLogs.page,
        pageSize: auditLogs.pageSize,
        pages: auditLogs.pages,
        total: auditLogs.total,
      },
    };
  }

  @Get('export')
  async export(
    @Query('action') action?: AuditAction,
    @Query('entity') entity?: AuditEntity,
    @Query('status') status?: string,
    @Query('actorRole') actorRole?: Role,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Res() res?: Response,
  ) {
    try {
      const query: AuditQueryDto = {
        action,
        entity,
        status,
        actorRole,
        startDate,
        endDate,
        limit: 10000,
        offset: 0,
      };

      const csv = await this.auditService.exportAsCsv(query);

      const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, '-')
        .slice(0, -5);
      res!.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res!.setHeader(
        'Content-Disposition',
        `attachment; filename="audit-logs-${timestamp}.csv"`,
      );
      res!.send(csv);
    } catch (error) {
      throw new BadRequestException('Failed to export audit logs');
    }
  }
}
