import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { In, Not, Repository } from 'typeorm';
import { Role, User } from '../users/entities/user.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';
import { Certificate } from '../certificates/entities/certificate.entity';
import { AuditAction, AuditEntity } from '../audit/entities/audit-log.entity';
import { AuditService } from '../audit/audit.service';
import { Payment } from '../payments/entities/payment.entity';
import { Registration } from '../registrations/entities/registration.entity';
import { Session } from '../sessions/entities/session.entity';
import { CreateComplaintDto } from './dto/create-complaint.dto';
import { CreateComplaintMessageDto } from './dto/create-complaint-message.dto';
import { ReopenComplaintDto } from './dto/reopen-complaint.dto';
import { UpdateComplaintDto } from './dto/update-complaint.dto';
import {
  Complaint,
  ComplaintCategory,
  ComplaintPriority,
  ComplaintStatus,
} from './entities/complaint.entity';
import { ComplaintEvent } from './entities/complaint-event.entity';
import { ComplaintAttachment } from './entities/complaint-attachment.entity';
import {
  ComplaintMessage,
  ComplaintMessageVisibility,
} from './entities/complaint-message.entity';

const MAX_COMPLAINTS_PER_10_MINUTES = 5;
const MAX_MESSAGES_PER_10_MINUTES = 20;
const MAX_ATTACHMENT_UPLOADS_PER_10_MINUTES = 3;
const MAX_REOPEN_REQUESTS_PER_10_MINUTES = 3;
const MAX_ATTACHMENT_FILE_SIZE = 5 * 1024 * 1024;
const MAX_ATTACHMENT_FILES_PER_REQUEST = 3;
const MAX_ATTACHMENT_TOTAL_SIZE = 12 * 1024 * 1024;
const ATTACHMENT_STORAGE_DIR = path.resolve(
  process.cwd(),
  'uploads',
  'complaints',
);

@Injectable()
export class ComplaintsService {
  constructor(
    @InjectRepository(Complaint)
    private readonly complaints: Repository<Complaint>,
    @InjectRepository(ComplaintMessage)
    private readonly messages: Repository<ComplaintMessage>,
    @InjectRepository(ComplaintEvent)
    private readonly events: Repository<ComplaintEvent>,
    @InjectRepository(ComplaintAttachment)
    private readonly attachments: Repository<ComplaintAttachment>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Registration)
    private readonly registrations: Repository<Registration>,
    @InjectRepository(Payment) private readonly payments: Repository<Payment>,
    @InjectRepository(Session) private readonly sessions: Repository<Session>,
    @InjectRepository(Certificate)
    private readonly certificates: Repository<Certificate>,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
  ) {}

  async getAdminAssistantAggregates(): Promise<{
    total: number;
    byStatus: { status: ComplaintStatus; count: number }[];
    byCategory: { category: ComplaintCategory; count: number }[];
  }> {
    const rows = await this.complaints
      .createQueryBuilder('complaint')
      .select('complaint.status', 'status')
      .addSelect('complaint.category', 'category')
      .addSelect('COUNT(*)', 'count')
      .groupBy('complaint.status')
      .addGroupBy('complaint.category')
      .getRawMany<{
        status: ComplaintStatus;
        category: ComplaintCategory;
        count: string | number;
      }>();

    const byStatus = Object.values(ComplaintStatus).map((status) => ({
      status,
      count: rows
        .filter((row) => row.status === status)
        .reduce((total, row) => total + Number(row.count), 0),
    }));
    const byCategory = Object.values(ComplaintCategory).map((category) => ({
      category,
      count: rows
        .filter((row) => row.category === category)
        .reduce((total, row) => total + Number(row.count), 0),
    }));
    return {
      total: byStatus.reduce((total, row) => total + row.count, 0),
      byStatus,
      byCategory,
    };
  }

  async create(user: User, dto: CreateComplaintDto): Promise<Complaint> {
    this.assertRateLimit(user.id, 'complaint:create');
    await this.assertLinkedObjectsBelongToUser(user.id, dto);
    await this.assertCategoryConsistency(user.id, dto);
    if (
      ['TRAINING', 'SESSION', 'TRAINER'].includes(dto.category) &&
      !dto.concernedName &&
      !dto.sessionId
    ) {
      throw new BadRequestException(
        'L’élément concerné est obligatoire pour cette catégorie',
      );
    }
    const complaint = await this.complaints.save(
      this.complaints.create({
        ...dto,
        reference: await this.nextReference(),
        userId: user.id,
        status: ComplaintStatus.NEW,
        priority: ComplaintPriority.NORMAL,
        assignedToUserId: null,
        resolution: null,
        resolvedAt: null,
        closedAt: null,
      }),
    );
    await this.addEvent(
      complaint.id,
      user.id,
      'CREATED',
      'Réclamation créée par le participant',
    );
    await this.audit.log(
      AuditAction.COMPLAINT_CREATED,
      AuditEntity.COMPLAINT,
      user.id,
      complaint.id,
      complaint.reference,
    );
    await this.notify(
      complaint.userId,
      'Réclamation enregistrée',
      `Votre dossier ${complaint.reference} a été reçu.`,
      complaint.id,
      complaint.reference,
      complaint.subject,
      'CREATED',
    );
    const admins = await this.users.find({ where: { role: Role.ADMIN } });
    await Promise.all(
      admins.map((admin) =>
        this.notify(
          admin.id,
          'Nouvelle réclamation',
          `${complaint.reference} — ${complaint.subject}`,
          complaint.id,
          complaint.reference,
          complaint.subject,
          'NEW_FOR_ADMIN',
          '/admin/complaints',
        ),
      ),
    );
    return this.findOne(complaint.id, user);
  }

  async findMine(userId: string, page = 1, pageSize = 20) {
    const [items, total] = await this.complaints.findAndCount({
      where: { userId },
      relations: ['assignedTo'],
      order: { updatedAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { items, total, page, pageSize };
  }

  async findAdmin(query: {
    status?: ComplaintStatus;
    priority?: ComplaintPriority;
    category?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  }) {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 20));
    const qb = this.complaints
      .createQueryBuilder('complaint')
      .leftJoinAndSelect('complaint.user', 'user')
      .leftJoinAndSelect('complaint.assignedTo', 'assignedTo')
      // TypeORM treats an expression passed directly to orderBy as an alias when
      // pagination is enabled. Select the rank first, then order by its alias.
      .addSelect(
        "CASE complaint.priority WHEN 'CRITICAL' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'NORMAL' THEN 3 ELSE 4 END",
        'priority_rank',
      )
      .orderBy('priority_rank', 'ASC')
      .addOrderBy('complaint.updatedAt', 'DESC');
    if (query.status)
      qb.andWhere('complaint.status = :status', { status: query.status });
    if (query.priority)
      qb.andWhere('complaint.priority = :priority', {
        priority: query.priority,
      });
    if (query.category)
      qb.andWhere('complaint.category = :category', {
        category: query.category,
      });
    if (query.search)
      qb.andWhere(
        "(complaint.reference ILIKE :search OR complaint.subject ILIKE :search OR user.email ILIKE :search OR user.firstName ILIKE :search OR user.lastName ILIKE :search OR CONCAT(user.firstName, ' ', user.lastName) ILIKE :search)",
        { search: `%${query.search.trim()}%` },
      );
    const [items, total] = await qb
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();
    return { items, total, page, pageSize };
  }

  async findOne(id: string, actor: User) {
    const complaint = await this.complaints.findOne({
      where: { id },
      relations: ['user', 'assignedTo'],
    });
    if (!complaint) throw new NotFoundException('Réclamation introuvable');
    this.assertAccess(complaint, actor);
    const visibility =
      actor.role === Role.ADMIN
        ? undefined
        : ComplaintMessageVisibility.PARTICIPANT;
    const messages = await this.messages.find({
      where: { complaintId: id, ...(visibility ? { visibility } : {}) },
      relations: ['author'],
      order: { createdAt: 'ASC' },
    });
    const events = await this.events.find({
      where: {
        complaintId: id,
        ...(visibility ? { type: Not('INTERNAL_NOTE') } : {}),
      },
      relations: ['actor'],
      order: { createdAt: 'ASC' },
    });
    const attachments = await this.attachments.find({
      where: { complaintId: id },
      relations: ['uploadedBy'],
      order: { createdAt: 'ASC' },
    });
    return { ...complaint, messages, events, attachments };
  }

  async addMessage(id: string, actor: User, dto: CreateComplaintMessageDto) {
    const complaint = await this.complaints.findOneBy({ id });
    if (!complaint) throw new NotFoundException('Réclamation introuvable');
    this.assertAccess(complaint, actor);
    this.assertRateLimit(actor.id, 'complaint:message');
    const internal = dto.internal === true;
    if (internal && actor.role !== Role.ADMIN)
      throw new ForbiddenException('Note interne réservée à l’administration');
    if (!dto.content || !dto.content.trim())
      throw new BadRequestException('Le message ne peut pas être vide');
    if (
      actor.role !== Role.ADMIN &&
      [ComplaintStatus.CLOSED, ComplaintStatus.REJECTED].includes(
        complaint.status,
      )
    )
      throw new BadRequestException('Ce dossier est clôturé');
    const message = await this.messages.save(
      this.messages.create({
        complaintId: id,
        authorId: actor.id,
        content: dto.content.trim(),
        visibility: internal
          ? ComplaintMessageVisibility.INTERNAL
          : ComplaintMessageVisibility.PARTICIPANT,
      }),
    );
    if (!internal) {
      if (actor.role === Role.ADMIN)
        await this.notify(
          complaint.userId,
          'Nouveau message concernant votre réclamation',
          complaint.reference,
          complaint.id,
          complaint.reference,
          complaint.subject,
          'MESSAGE',
          '/admin/complaints',
        );
      else {
        const recipients = complaint.assignedToUserId
          ? [complaint.assignedToUserId]
          : (await this.users.find({ where: { role: Role.ADMIN } })).map(
              (user) => user.id,
            );
        await Promise.all(
          recipients.map((userId) =>
            this.notify(
              userId,
              'Réponse participant',
              complaint.reference,
              complaint.id,
              complaint.reference,
              complaint.subject,
              'MESSAGE',
            ),
          ),
        );
      }
    }
    await this.addEvent(
      id,
      actor.id,
      internal ? 'INTERNAL_NOTE' : 'MESSAGE_ADDED',
      null,
    );
    return message;
  }

  async requestReopen(id: string, participant: User, dto: ReopenComplaintDto) {
    if (participant.role !== Role.PARTICIPANT) {
      throw new ForbiddenException(
        'Cette action est réservée au propriétaire participant',
      );
    }
    const complaint = await this.complaints.findOneBy({ id });
    if (!complaint) throw new NotFoundException('Réclamation introuvable');
    this.assertAccess(complaint, participant);
    this.assertReopenable(complaint.status);
    const justification = this.validateReopenJustification(dto.justification);
    this.assertRateLimit(participant.id, 'complaint:reopen');
    return this.applyReopening(
      id,
      participant,
      justification,
      'REOPENED_BY_PARTICIPANT',
    );
  }

  async reopenAsAdmin(id: string, admin: User, dto: ReopenComplaintDto) {
    if (admin.role !== Role.ADMIN) {
      throw new ForbiddenException(
        'La réouverture administrative est réservée à l’administration',
      );
    }
    const complaint = await this.complaints.findOneBy({ id });
    if (!complaint) throw new NotFoundException('Réclamation introuvable');
    this.assertReopenable(complaint.status);
    const justification = this.validateReopenJustification(dto.justification);
    return this.applyReopening(id, admin, justification, 'REOPENED_BY_ADMIN');
  }

  async getAttachmentForUser(
    complaintId: string,
    attachmentId: string,
    actor: User,
  ) {
    const complaint = await this.complaints.findOne({
      where: { id: complaintId },
      relations: ['user'],
    });
    if (!complaint) throw new NotFoundException('Réclamation introuvable');
    this.assertAccess(complaint, actor);
    const attachment = await this.attachments.findOne({
      where: { id: attachmentId, complaintId },
    });
    if (!attachment) throw new NotFoundException('Pièce jointe introuvable');
    const storagePath = path.join(
      ATTACHMENT_STORAGE_DIR,
      attachment.storageName,
    );
    const buffer = await fs.readFile(storagePath);
    return {
      mimeType: attachment.mimeType,
      originalName: attachment.originalName,
      buffer,
    };
  }

  async addAttachments(
    id: string,
    actor: User,
    files: Array<{
      originalname: string;
      filename: string;
      mimetype: string;
      size: number;
      buffer?: Buffer;
    }>,
  ) {
    const complaint = await this.complaints.findOneBy({ id });
    if (!complaint) throw new NotFoundException('Réclamation introuvable');
    this.assertAccess(complaint, actor);
    this.assertRateLimit(actor.id, 'complaint:attachment');
    if (!files.length)
      throw new BadRequestException('Ajoutez au moins un fichier');
    if (files.length > MAX_ATTACHMENT_FILES_PER_REQUEST)
      throw new BadRequestException(
        `Maximum ${MAX_ATTACHMENT_FILES_PER_REQUEST} fichiers par envoi`,
      );
    const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
    if (totalBytes > MAX_ATTACHMENT_TOTAL_SIZE)
      throw new BadRequestException(
        `La somme des fichiers ne doit pas dépasser ${MAX_ATTACHMENT_TOTAL_SIZE} octets`,
      );
    const sanitizedFiles = files.map((file) => this.sanitizeAttachment(file));
    await fs.mkdir(ATTACHMENT_STORAGE_DIR, { recursive: true });
    const created = await this.attachments.save(
      sanitizedFiles.map((file) =>
        this.attachments.create({
          complaintId: id,
          uploadedById: actor.id,
          originalName: file.originalname,
          storageName: file.filename,
          mimeType: file.mimetype,
          sizeBytes: file.size,
        }),
      ),
    );
    await Promise.all(
      sanitizedFiles.map(async (file) => {
        const targetPath = path.join(ATTACHMENT_STORAGE_DIR, file.filename);
        await fs.writeFile(targetPath, file.buffer ?? Buffer.alloc(0));
      }),
    );
    await this.addEvent(
      id,
      actor.id,
      'ATTACHMENTS_ADDED',
      `${created.length} pièce(s) jointe(s)`,
    );
    if (actor.role === Role.ADMIN) {
      await this.notify(
        complaint.userId,
        'Une pièce jointe a été ajoutée à votre réclamation',
        `${created.length} pièce(s) jointe(s) ont été ajoutée(s) à votre dossier.`,
        complaint.id,
        complaint.reference,
        complaint.subject,
        'ATTACHMENT',
      );
    } else {
      const recipients = complaint.assignedToUserId
        ? [complaint.assignedToUserId]
        : (await this.users.find({ where: { role: Role.ADMIN } })).map(
            (user) => user.id,
          );
      await Promise.all(
        recipients.map((userId) =>
          this.notify(
            userId,
            'Nouvelle pièce jointe sur une réclamation',
            `${created.length} pièce(s) jointe(s) ajoutée(s) par le participant.`,
            complaint.id,
            complaint.reference,
            complaint.subject,
            'ATTACHMENT',
            '/admin/complaints',
          ),
        ),
      );
    }
    return created;
  }

  async update(id: string, admin: User, dto: UpdateComplaintDto) {
    const complaint = await this.complaints.findOneBy({ id });
    if (!complaint) throw new NotFoundException('Réclamation introuvable');
    if (dto.assignedToUserId !== undefined && dto.assignedToUserId !== null) {
      const assignee = await this.users.findOneBy({ id: dto.assignedToUserId });
      if (!assignee || assignee.role !== Role.ADMIN)
        throw new BadRequestException(
          'Le responsable doit être un administrateur',
        );
    }
    this.assertValidStatusTransition(
      complaint.status,
      dto.status ?? complaint.status,
    );
    const finalStatus = dto.status ?? complaint.status;
    if (
      [ComplaintStatus.RESOLVED, ComplaintStatus.REJECTED].includes(
        finalStatus,
      ) &&
      !dto.resolution &&
      !complaint.resolution
    )
      throw new BadRequestException('Une réponse finale est obligatoire');
    const previousStatus = complaint.status;
    Object.assign(complaint, dto);
    if (
      dto.status === ComplaintStatus.RESOLVED ||
      dto.status === ComplaintStatus.REJECTED
    )
      complaint.resolvedAt = new Date();
    if (dto.status === ComplaintStatus.CLOSED) complaint.closedAt = new Date();
    const saved = await this.complaints.save(complaint);
    if (dto.status && dto.status !== previousStatus) {
      await this.addEvent(
        id,
        admin.id,
        'STATUS_CHANGED',
        `${previousStatus} → ${dto.status}`,
      );
      await this.notify(
        saved.userId,
        'Mise à jour de votre réclamation',
        `${saved.reference} : ${this.statusLabel(saved.status)}`,
        saved.id,
        saved.reference,
        saved.subject,
        'STATUS',
      );
    }
    if (dto.assignedToUserId !== undefined)
      await this.addEvent(
        id,
        admin.id,
        'ASSIGNED',
        dto.assignedToUserId ? 'Dossier affecté' : 'Dossier désaffecté',
      );
    if (dto.priority)
      await this.addEvent(id, admin.id, 'PRIORITY_CHANGED', dto.priority);
    await this.audit.logAdminAction(
      admin.id,
      AuditAction.COMPLAINT_UPDATED,
      AuditEntity.COMPLAINT,
      id,
      `Statut: ${saved.status}; priorité: ${saved.priority}`,
    );
    return this.findOne(id, admin);
  }

  async metrics() {
    const all = await this.complaints.find();
    const byStatus = Object.values(ComplaintStatus).reduce(
      (result, status) => ({
        ...result,
        [status]: all.filter((item) => item.status === status).length,
      }),
      {} as Record<string, number>,
    );
    const byCategory = all.reduce(
      (result, item) => ({
        ...result,
        [item.category]: (result[item.category] ?? 0) + 1,
      }),
      {} as Record<string, number>,
    );
    const resolved = all.filter((item) => item.resolvedAt);
    const averageResolutionHours = resolved.length
      ? Math.round(
          resolved.reduce(
            (sum, item) =>
              sum +
              (item.resolvedAt!.getTime() - item.createdAt.getTime()) / 3600000,
            0,
          ) / resolved.length,
        )
      : 0;
    const openItems = all.filter(
      (item) =>
        ![ComplaintStatus.CLOSED, ComplaintStatus.REJECTED].includes(
          item.status,
        ),
    );
    const overdueThreshold = Date.now() - 48 * 60 * 60 * 1000;
    return {
      total: all.length,
      open: openItems.length,
      unassigned: openItems.filter((item) => !item.assignedToUserId).length,
      waitingForParticipant:
        byStatus[ComplaintStatus.WAITING_FOR_PARTICIPANT] ?? 0,
      overdue: openItems.filter(
        (item) => item.updatedAt.getTime() < overdueThreshold,
      ).length,
      byStatus,
      byCategory,
      averageResolutionHours,
    };
  }

  async take(id: string, admin: User) {
    return this.update(id, admin, {
      assignedToUserId: admin.id,
      status: ComplaintStatus.IN_PROGRESS,
    });
  }

  private assertReopenable(status: ComplaintStatus) {
    if (
      status !== ComplaintStatus.CLOSED &&
      status !== ComplaintStatus.REJECTED
    ) {
      throw new BadRequestException(
        `Réouverture impossible depuis le statut ${status}`,
      );
    }
  }

  private validateReopenJustification(justification: string) {
    const trimmed = justification?.trim();
    if (!trimmed || trimmed.length < 10 || trimmed.length > 500) {
      throw new BadRequestException(
        'La justification doit contenir entre 10 et 500 caractères',
      );
    }
    return trimmed;
  }

  private async applyReopening(
    id: string,
    actor: User,
    justification: string,
    eventType: 'REOPENED_BY_PARTICIPANT' | 'REOPENED_BY_ADMIN',
  ) {
    const result = await this.complaints.update(
      {
        id,
        status: In([ComplaintStatus.CLOSED, ComplaintStatus.REJECTED]),
      },
      { status: ComplaintStatus.IN_PROGRESS },
    );
    if (result.affected !== 1) {
      throw new BadRequestException(
        'La réclamation a changé de statut et ne peut plus être réouverte',
      );
    }
    await this.addEvent(id, actor.id, eventType, justification);
    if (actor.role === Role.ADMIN) {
      await this.audit.logAdminAction(
        actor.id,
        AuditAction.COMPLAINT_UPDATED,
        AuditEntity.COMPLAINT,
        id,
        `Réouverture: ${justification}`,
      );
    }
    const reopened = await this.findOne(id, actor);
    if (actor.role === Role.ADMIN) {
      await this.notify(
        reopened.userId,
        'Votre réclamation a été réouverte',
        justification,
        reopened.id,
        reopened.reference,
        reopened.subject,
        'REOPENED',
        '/admin/complaints',
      );
    } else {
      const admins = await this.users.find({ where: { role: Role.ADMIN } });
      await Promise.all(
        admins.map((admin) =>
          this.notify(
            admin.id,
            'Réclamation réouverte par le participant',
            justification,
            reopened.id,
            reopened.reference,
            reopened.subject,
            'REOPENED',
          ),
        ),
      );
    }
    return reopened;
  }

  private assertAccess(complaint: Complaint, actor: User) {
    if (actor.role !== Role.ADMIN && complaint.userId !== actor.id)
      throw new ForbiddenException('Accès non autorisé');
  }
  private async addEvent(
    complaintId: string,
    actorId: string | null,
    type: string,
    details: string | null,
  ) {
    await this.events.save(
      this.events.create({ complaintId, actorId, type, details }),
    );
  }
  private async notify(
    userId: string,
    title: string,
    message: string,
    complaintId: string,
    reference: string,
    subject: string,
    event:
      | 'CREATED'
      | 'NEW_FOR_ADMIN'
      | 'MESSAGE'
      | 'ATTACHMENT'
      | 'STATUS'
      | 'REOPENED',
    link?: string,
  ) {
    try {
      await this.notifications.create({
        userId,
        type: NotificationType.SYSTEM,
        title,
        message,
        link: link ?? `/dashboard/complaints/${complaintId}`,
        complaintEmail: { event, reference, subject },
      });
    } catch {
      /* A failed email/notification must not block complaint processing. */
    }
  }
  private async nextReference() {
    const suffix = String((await this.complaints.count()) + 1).padStart(4, '0');
    return `REC-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${suffix}`;
  }

  private statusLabel(status: ComplaintStatus) {
    return (
      {
        NEW: 'nouvelle',
        IN_PROGRESS: 'en cours',
        WAITING_FOR_PARTICIPANT: 'en attente de votre réponse',
        RESOLVED: 'résolue',
        CLOSED: 'clôturée',
        REJECTED: 'rejetée',
      } as Record<ComplaintStatus, string>
    )[status];
  }

  private isAllowedStatusTransition(
    from: ComplaintStatus,
    to: ComplaintStatus,
  ): boolean {
    const allowed: Record<ComplaintStatus, ComplaintStatus[]> = {
      [ComplaintStatus.NEW]: [
        ComplaintStatus.IN_PROGRESS,
        ComplaintStatus.REJECTED,
      ],
      [ComplaintStatus.IN_PROGRESS]: [
        ComplaintStatus.WAITING_FOR_PARTICIPANT,
        ComplaintStatus.RESOLVED,
        ComplaintStatus.REJECTED,
      ],
      [ComplaintStatus.WAITING_FOR_PARTICIPANT]: [
        ComplaintStatus.IN_PROGRESS,
        ComplaintStatus.RESOLVED,
        ComplaintStatus.REJECTED,
      ],
      [ComplaintStatus.RESOLVED]: [ComplaintStatus.CLOSED],
      [ComplaintStatus.CLOSED]: [],
      [ComplaintStatus.REJECTED]: [],
    };
    return from === to || allowed[from]?.includes(to) === true;
  }

  private assertValidStatusTransition(
    from: ComplaintStatus,
    to: ComplaintStatus,
  ) {
    if (!this.isAllowedStatusTransition(from, to)) {
      throw new BadRequestException(
        `Transition de statut invalide : ${from} -> ${to}`,
      );
    }
  }

  private assertRateLimit(userId: string, scope: string) {
    const windowMs = 10 * 60 * 1000;
    const limits: Record<string, number> = {
      'complaint:create': MAX_COMPLAINTS_PER_10_MINUTES,
      'complaint:message': MAX_MESSAGES_PER_10_MINUTES,
      'complaint:attachment': MAX_ATTACHMENT_UPLOADS_PER_10_MINUTES,
      'complaint:reopen': MAX_REOPEN_REQUESTS_PER_10_MINUTES,
    };
    const limit = limits[scope] ?? MAX_MESSAGES_PER_10_MINUTES;
    const bucketKey = `${scope}:${userId}`;
    const now = Date.now();
    const current = this.rateLimitBuckets.get(bucketKey);
    if (!current || now - current.windowStart >= windowMs) {
      this.rateLimitBuckets.set(bucketKey, { windowStart: now, count: 1 });
      return;
    }
    current.count += 1;
    if (current.count > limit) {
      throw new ForbiddenException(
        `Trop de demandes. Limite: ${limit} sur 10 minutes.`,
      );
    }
  }

  private async assertCategoryConsistency(
    userId: string,
    dto: CreateComplaintDto,
  ) {
    if (
      dto.category === ComplaintCategory.REGISTRATION &&
      !dto.registrationId
    ) {
      throw new BadRequestException(
        'Une réclamation de type REGISTRATION doit inclure une inscription.',
      );
    }
    if (dto.category === ComplaintCategory.PAYMENT && !dto.paymentId) {
      throw new BadRequestException(
        'Une réclamation de type PAYMENT doit inclure un paiement.',
      );
    }
    if (dto.category === ComplaintCategory.SESSION && !dto.sessionId) {
      throw new BadRequestException(
        'Une réclamation de type SESSION doit inclure une session.',
      );
    }
    if (dto.category === ComplaintCategory.CERTIFICATE && !dto.certificateId) {
      throw new BadRequestException(
        'Une réclamation de type CERTIFICATE doit inclure un certificat.',
      );
    }
    if (
      dto.category === ComplaintCategory.TRAINER &&
      !dto.concernedName &&
      !dto.sessionId
    ) {
      throw new BadRequestException(
        'Une réclamation de type TRAINER doit préciser le formateur concerné.',
      );
    }
    if (dto.category === ComplaintCategory.TRAINING && !dto.concernedName) {
      throw new BadRequestException(
        'Une réclamation de type TRAINING doit préciser le programme concerné.',
      );
    }
    if (
      dto.category === ComplaintCategory.OTHER &&
      !dto.concernedName &&
      !dto.registrationId &&
      !dto.paymentId &&
      !dto.sessionId &&
      !dto.certificateId
    ) {
      throw new BadRequestException(
        'Veuillez préciser l’élément concerné pour cette réclamation.',
      );
    }
    return this.assertLinkedObjectsBelongToUser(userId, dto);
  }

  private sanitizeAttachment(file: {
    originalname?: string;
    filename?: string;
    mimetype?: string;
    size?: number;
    buffer?: Buffer;
  }) {
    const fileSize = Number(file.size ?? 0);
    if (!file.buffer || fileSize <= 0) {
      throw new BadRequestException('Pièce jointe invalide ou vide.');
    }
    if (fileSize > MAX_ATTACHMENT_FILE_SIZE) {
      throw new BadRequestException(
        `Le fichier ne doit pas dépasser ${MAX_ATTACHMENT_FILE_SIZE} octets.`,
      );
    }

    const buffer = file.buffer;
    const isPdf = buffer.subarray(0, 5).equals(Buffer.from('%PDF-'));
    const isPng = buffer
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    const isJpeg =
      buffer.length >= 3 &&
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff;
    const normalizedMime = (file.mimetype ?? '').toLowerCase();
    const allowedMime = new Set(['application/pdf', 'image/jpeg', 'image/png']);
    const mimeMatches = allowedMime.has(normalizedMime);
    const validSignature = isPdf || isPng || isJpeg;
    if (!mimeMatches || !validSignature) {
      throw new BadRequestException(
        'Type de fichier non autorisé. Seuls PDF, JPEG et PNG sont acceptés.',
      );
    }

    const extension =
      normalizedMime === 'application/pdf'
        ? '.pdf'
        : normalizedMime === 'image/png'
          ? '.png'
          : '.jpg';
    const safeName = `${randomUUID()}${extension}`;
    const safeOriginalName =
      String(file.originalname ?? 'document')
        .replace(/[\\/]+/g, '_')
        .replace(/\s+/g, '_')
        .replace(/[^a-zA-Z0-9_.-]/g, '_')
        .slice(0, 120) || 'document';

    return {
      ...file,
      filename: safeName,
      originalname: safeOriginalName,
      mimetype: normalizedMime,
      size: fileSize,
    };
  }

  private readonly rateLimitBuckets = new Map<
    string,
    { windowStart: number; count: number }
  >();

  private async assertLinkedObjectsBelongToUser(
    userId: string,
    dto: CreateComplaintDto,
  ) {
    if (
      dto.registrationId &&
      !(await this.registrations.exists({
        where: { id: dto.registrationId, userId },
      }))
    )
      throw new ForbiddenException('Inscription non accessible');
    if (
      dto.paymentId &&
      !(await this.payments.exists({ where: { id: dto.paymentId, userId } }))
    )
      throw new ForbiddenException('Paiement non accessible');
    if (
      dto.certificateId &&
      !(await this.certificates.exists({
        where: { id: dto.certificateId, userId },
      }))
    )
      throw new ForbiddenException('Certificat non accessible');
    if (dto.sessionId) {
      const ownsSession = await this.registrations.exists({
        where: { userId, sessionId: dto.sessionId },
      });
      if (!ownsSession) throw new ForbiddenException('Session non accessible');
    }
  }
}
