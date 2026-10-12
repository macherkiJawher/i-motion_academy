import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { existsSync } from 'fs';
import { basename, join } from 'path';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, QueryFailedError, Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import {
  AuditAction,
  AuditEntity,
  AuditStatus,
} from '../audit/entities/audit-log.entity';
import {
  Session,
  SessionLifecycleStatus,
  SessionStatus,
} from '../sessions/entities/session.entity';
import { Training } from '../trainings/entities/training.entity';
import { assertTrainingAvailable } from '../trainings/training-availability';
import { Role, User } from '../users/entities/user.entity';
import { CreateRegistrationDto } from './dto/create-registration.dto';
import { UpdateOwnRegistrationDto } from './dto/update-own-registration.dto';
import { UpdateRegistrationDto } from './dto/update-registration.dto';
import {
  PaymentStatus,
  Registration,
  RegistrationStatus,
} from './entities/registration.entity';
import { NotificationType } from '../notifications/entities/notification.entity';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class RegistrationsService {
  constructor(
    @InjectRepository(Registration)
    private readonly registrations: Repository<Registration>,
    @InjectRepository(Session)
    private readonly sessions: Repository<Session>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private readonly dataSource: DataSource,
    @Optional() private readonly notifications?: NotificationsService,
    private readonly auditService?: AuditService,
  ) {}

  async findAll(): Promise<Registration[]> {
    const registrations = await this.registrations.find({
      relations: { session: { training: true }, user: true },
      order: { createdAt: 'DESC' },
    });
    return registrations.map(
      (registration) => this.toResponse(registration) as Registration,
    );
  }

  async findMine(userId: string): Promise<Registration[]> {
    if (!userId) return [];
    const registrations = await this.registrations.find({
      where: { userId },
      relations: { session: { training: true }, user: true },
      order: { createdAt: 'DESC' },
    });
    return registrations.map(
      (registration) => this.toResponse(registration) as Registration,
    );
  }

  async findBySession(
    sessionId: string,
    actorId: string,
    actorRole?: string,
  ): Promise<Registration[]> {
    const registrations = await this.registrations.find({
      where:
        actorRole === Role.ADMIN
          ? { sessionId }
          : { sessionId, userId: actorId },
      relations: { session: { training: true }, user: true },
      order: { createdAt: 'DESC' },
    });
    return registrations.map(
      (registration) => this.toResponse(registration) as Registration,
    );
  }

  async findOne(id: string): Promise<Registration> {
    const registration = await this.registrations.findOne({
      where: { id },
      relations: { session: { training: true }, user: true },
    });
    if (!registration) throw new NotFoundException('Registration not found');
    return this.toResponse(registration);
  }

  async findOneForActor(
    id: string,
    actorId: string,
    actorRole?: string,
  ): Promise<Registration> {
    const registration = await this.registrations.findOne({
      where: { id },
      relations: { session: { training: true }, user: true },
    });
    if (
      !registration ||
      (actorRole !== Role.ADMIN && registration.userId !== actorId)
    ) {
      throw new NotFoundException('Registration not found');
    }
    return this.toResponse(registration);
  }

  async create(
    dto: CreateRegistrationDto,
    actorId?: string,
    actorRole?: string,
  ): Promise<Registration> {
    let saved: Registration;
    try {
      saved = await this.dataSource.transaction(async (manager) => {
        const sessions = manager.getRepository(Session);
        const registrations = manager.getRepository(Registration);
        const users = manager.getRepository(User);
        const trainings = manager.getRepository(Training);
        const session = await sessions.findOne({
          where: { id: dto.sessionId },
          lock: { mode: 'pessimistic_write' },
        });
        if (!session) throw new NotFoundException('Session not found');
        const training = await trainings.findOne({
          where: { id: session.trainingId },
        });
        if (!training) throw new ConflictException('Training is not published');
        session.training = training;
        assertTrainingAvailable(training);
        if (
          session.lifecycleStatus !== SessionLifecycleStatus.SCHEDULED ||
          session.status === SessionStatus.CLOSED
        ) {
          throw new ConflictException('Session is not accepting registrations');
        }
        if (session.seatsTaken >= session.capacity) {
          throw new ConflictException('Session is full');
        }

        const email = dto.email.trim().toLowerCase();
        const duplicate = await registrations.findOne({
          where: { sessionId: dto.sessionId, participantEmail: email },
        });
        if (duplicate && duplicate.status !== RegistrationStatus.CANCELLED) {
          throw new ConflictException(
            'Participant is already registered for this session',
          );
        }

        const user = actorId
          ? await users.findOne({ where: { id: actorId } })
          : null;
        const registration = registrations.create({
          reference: this.generateReference(),
          userId: user?.id ?? null,
          user: user ?? null,
          participantName: `${dto.firstName} ${dto.lastName}`.trim(),
          participantEmail: email,
          phone: dto.phone ?? null,
          birthDate: dto.birthDate ?? null,
          address: dto.address ?? null,
          city: dto.city ?? null,
          country: dto.country ?? null,
          educationLevel: dto.educationLevel ?? null,
          workExperience: dto.workExperience ?? null,
          employmentStatus: dto.employmentStatus ?? null,
          identityDocument: dto.identityDocument ?? null,
          qualificationDocument: dto.qualificationDocument ?? null,
          motivation: dto.motivation ?? null,
          referralSource: dto.referralSource ?? null,
          notes: dto.notes ?? null,
          sessionId: dto.sessionId,
          session,
          status: RegistrationStatus.PENDING,
          paymentStatus: PaymentStatus.PENDING,
          amountDue: Number(session.price ?? 0),
          amountPaid: 0,
          currency: 'TND',
          certificateId: null,
        });

        const created = await registrations.save(registration);
        session.seatsTaken += 1;
        session.status = this.statusFor(session);
        await sessions.save(session);
        return created;
      });
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException(
          'Participant is already registered for this session',
        );
      }
      throw error;
    }
    if (saved.userId) {
      await this.notifications?.create({
        userId: saved.userId,
        type: NotificationType.REGISTRATION_RECEIVED,
        title: 'Registration received',
        message: `Your registration ${saved.reference} has been received and is awaiting validation.`,
        link: '/dashboard/registrations',
      });
    }
    await this.auditService?.logAdminAction(
      actorId ?? saved.userId ?? null,
      AuditAction.REGISTRATION_CREATED,
      AuditEntity.REGISTRATION,
      saved.id,
      `Registration ${saved.reference} created for ${saved.participantEmail}`,
      actorRole === 'ADMIN' ? AuditStatus.SUCCESS : AuditStatus.WARNING,
    );
    return this.findOne(saved.id);
  }

  async update(
    id: string,
    dto: UpdateRegistrationDto,
    actorId?: string,
    actorRole?: string,
  ): Promise<Registration> {
    const existing = await this.registrations.findOne({ where: { id } });
    if (!existing) throw new NotFoundException('Registration not found');
    let previousStatus = existing.status;
    const saved = await this.dataSource.transaction(async (manager) => {
      const sessions = manager.getRepository(Session);
      const registrations = manager.getRepository(Registration);
      const session = await sessions.findOne({
        where: { id: existing.sessionId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!session) throw new NotFoundException('Session not found');
      const registration = await registrations.findOne({
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!registration) throw new NotFoundException('Registration not found');
      previousStatus = registration.status;

      Object.assign(registration, dto);
      if (
        dto.status === RegistrationStatus.COMPLETED &&
        previousStatus !== RegistrationStatus.COMPLETED
      ) {
        registration.completedAt = new Date();
      }
      if (
        dto.paymentStatus === PaymentStatus.PAID &&
        registration.status === RegistrationStatus.PENDING
      ) {
        registration.status = RegistrationStatus.CONFIRMED;
      }

      const wasTakingSeat = previousStatus !== RegistrationStatus.CANCELLED;
      const willTakeSeat = registration.status !== RegistrationStatus.CANCELLED;
      if (!wasTakingSeat && willTakeSeat) {
        if (
          session.lifecycleStatus !== SessionLifecycleStatus.SCHEDULED ||
          session.status === SessionStatus.CLOSED
        ) {
          throw new ConflictException('Session is not accepting registrations');
        }
        if (session.seatsTaken >= session.capacity) {
          throw new ConflictException('Session is full');
        }
        session.seatsTaken += 1;
      } else if (wasTakingSeat && !willTakeSeat) {
        session.seatsTaken = Math.max(0, session.seatsTaken - 1);
      }

      const updated = await registrations.save(registration);
      session.status = this.statusFor(session);
      await sessions.save(session);
      return updated;
    });
    if (
      saved.status === RegistrationStatus.CONFIRMED &&
      previousStatus !== RegistrationStatus.CONFIRMED &&
      saved.userId
    ) {
      await this.notifications?.create({
        userId: saved.userId,
        type: NotificationType.REGISTRATION_CONFIRMED,
        title: 'Registration confirmed',
        message: `Your registration ${saved.reference} is confirmed.`,
        link: '/dashboard/registrations',
      });
    }
    await this.auditService?.logAdminAction(
      actorId ?? saved.userId ?? null,
      dto.status === RegistrationStatus.CONFIRMED
        ? AuditAction.REGISTRATION_CONFIRMED
        : AuditAction.REGISTRATION_CANCELLED,
      AuditEntity.REGISTRATION,
      saved.id,
      `Registration ${saved.reference} status updated from ${previousStatus} to ${saved.status}`,
      actorRole === 'ADMIN' ? AuditStatus.SUCCESS : AuditStatus.WARNING,
    );
    return this.findOne(saved.id);
  }

  async applyPayment(id: string, amount: number): Promise<Registration> {
    const registration = await this.findOne(id);
    const nextAmountPaid = Number(registration.amountPaid) + amount;
    if (nextAmountPaid > Number(registration.amountDue)) {
      throw new ConflictException(
        'Payment cannot exceed the registration amount due',
      );
    }

    const entity = await this.registrations.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('Registration not found');
    entity.amountPaid = nextAmountPaid;
    entity.paymentStatus =
      nextAmountPaid >= Number(entity.amountDue)
        ? PaymentStatus.PAID
        : PaymentStatus.PARTIAL;
    if (
      (entity.paymentStatus === PaymentStatus.PAID ||
        entity.paymentStatus === PaymentStatus.PARTIAL) &&
      entity.status === RegistrationStatus.PENDING
    ) {
      entity.status = RegistrationStatus.CONFIRMED;
    }
    const saved = await this.registrations.save(entity);
    return this.toResponse({
      ...saved,
      session: registration.session,
    });
  }

  async attachCertificate(id: string, certificateId: string): Promise<void> {
    const registration = await this.registrations.findOne({ where: { id } });
    if (!registration) throw new NotFoundException('Registration not found');
    registration.certificateId = certificateId;
    await this.registrations.save(registration);
  }

  async remove(id: string): Promise<void> {
    const existing = await this.registrations.findOne({ where: { id } });
    if (!existing) throw new NotFoundException('Registration not found');
    await this.dataSource.transaction(async (manager) => {
      const sessions = manager.getRepository(Session);
      const registrations = manager.getRepository(Registration);
      const session = await sessions.findOne({
        where: { id: existing.sessionId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!session) throw new NotFoundException('Session not found');
      const registration = await registrations.findOne({
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!registration) throw new NotFoundException('Registration not found');
      if (registration.status !== RegistrationStatus.CANCELLED) {
        session.seatsTaken = Math.max(0, session.seatsTaken - 1);
        session.status = this.statusFor(session);
        await sessions.save(session);
      }
      await registrations.remove(registration);
    });
  }

  private statusFor(session: Session): SessionStatus {
    if (session.status === SessionStatus.CLOSED) return SessionStatus.CLOSED;
    if (session.seatsTaken >= session.capacity) return SessionStatus.FULL;
    if (session.seatsTaken >= session.capacity * 0.8)
      return SessionStatus.ALMOST_FULL;
    return SessionStatus.OPEN;
  }

  private isUniqueViolation(error: unknown): boolean {
    if (!(error instanceof QueryFailedError)) return false;
    const driverError: unknown = error.driverError;
    return (
      typeof driverError === 'object' &&
      driverError !== null &&
      'code' in driverError &&
      driverError.code === '23505'
    );
  }

  async attachDocuments(
    id: string,
    files: Array<{ fieldname: string; path: string }>,
    actorId?: string,
    actorRole?: string,
  ) {
    const registration = await this.registrations.findOne({ where: { id } });
    if (!registration) throw new NotFoundException('Registration not found');
    if (actorRole !== 'ADMIN' && registration.userId !== actorId)
      throw new ForbiddenException(
        'You cannot attach documents to this registration',
      );
    for (const file of files) {
      const storedPath = join(
        'uploads',
        'registrations',
        basename(file.path),
      ).replace(/\\/g, '/');
      if (file.fieldname === 'identityDocument')
        registration.identityDocument = storedPath;
      if (file.fieldname === 'qualificationDocument')
        registration.qualificationDocument = storedPath;
    }
    return this.toResponse(
      await this.registrations.save(registration),
    ) as Registration;
  }

  async getDocument(
    id: string,
    kind: 'identity' | 'qualification',
    actorId?: string,
    actorRole?: string,
  ): Promise<string> {
    const registration = await this.registrations.findOne({ where: { id } });
    if (!registration) throw new NotFoundException('Registration not found');
    if (actorRole !== Role.ADMIN && registration.userId !== actorId)
      throw new ForbiddenException(
        'You cannot access documents for this registration',
      );
    const relativePath =
      kind === 'identity'
        ? registration.identityDocument
        : registration.qualificationDocument;
    if (!relativePath) throw new NotFoundException('Document not found');
    const file = join(process.cwd(), relativePath);
    if (!existsSync(file))
      throw new NotFoundException('Document file not found');
    return file;
  }

  async updateOwnDetails(
    id: string,
    actorId: string,
    dto: UpdateOwnRegistrationDto,
  ): Promise<Registration> {
    const registration = await this.registrations.findOne({
      where: { id, userId: actorId },
      relations: { session: { training: true }, user: true },
    });
    if (!registration) throw new NotFoundException('Registration not found');

    if (dto.participantEmail !== undefined) {
      registration.participantEmail = dto.participantEmail.trim().toLowerCase();
    }
    if (dto.participantName !== undefined) {
      registration.participantName = dto.participantName.trim();
    }
    if (dto.phone !== undefined) registration.phone = dto.phone;
    if (dto.birthDate !== undefined) registration.birthDate = dto.birthDate;
    if (dto.address !== undefined) registration.address = dto.address;
    if (dto.city !== undefined) registration.city = dto.city;
    if (dto.country !== undefined) registration.country = dto.country;
    if (dto.educationLevel !== undefined)
      registration.educationLevel = dto.educationLevel;
    if (dto.workExperience !== undefined)
      registration.workExperience = dto.workExperience;
    if (dto.employmentStatus !== undefined)
      registration.employmentStatus = dto.employmentStatus;
    if (dto.motivation !== undefined) registration.motivation = dto.motivation;
    if (dto.referralSource !== undefined)
      registration.referralSource = dto.referralSource;
    if (dto.notes !== undefined) registration.notes = dto.notes;

    return this.toResponse(await this.registrations.save(registration));
  }

  private generateReference(): string {
    const year = new Date().getFullYear();
    const random = Math.floor(1000 + Math.random() * 9000);
    return `IMA-${year}-${random}`;
  }

  private toResponse(registration: Registration) {
    const session = registration.session;
    const training = session?.training;
    const createdDate =
      registration.createdAt instanceof Date
        ? registration.createdAt.toISOString().slice(0, 10)
        : String(registration.createdAt ?? '').slice(0, 10);
    const completed = registration.status === RegistrationStatus.COMPLETED;
    const confirmed =
      registration.status === RegistrationStatus.CONFIRMED || completed;
    const paid = registration.paymentStatus === PaymentStatus.PAID;

    return {
      ...registration,
      session: session ? { ...session, meetingUrl: null } : session,
      identityDocumentAvailable: Boolean(
        registration.identityDocument &&
        existsSync(join(process.cwd(), registration.identityDocument)),
      ),
      qualificationDocumentAvailable: Boolean(
        registration.qualificationDocument &&
        existsSync(join(process.cwd(), registration.qualificationDocument)),
      ),
      trainingTitle: training?.title ?? '',
      trainingSlug: training?.slug ?? '',
      sessionStartDate: session?.startDate ?? '',
      sessionCity: session?.city ?? '',
      timeline: [
        {
          step: 'SUBMITTED',
          label: 'Registration submitted',
          description: 'Your request reached the academy.',
          status: 'DONE',
          date: createdDate,
        },
        {
          step: 'VALIDATED',
          label: 'Registration validated',
          description: 'The academy is reviewing your registration.',
          status: confirmed ? 'DONE' : 'CURRENT',
          date: confirmed ? createdDate : null,
        },
        {
          step: 'PAYMENT',
          label: 'Payment',
          description: 'Payment status for this registration.',
          status: paid ? 'DONE' : confirmed ? 'CURRENT' : 'PENDING',
          date: paid ? createdDate : null,
        },
        {
          step: 'SESSION',
          label: 'Session attendance',
          description: 'Attend the scheduled training session.',
          status: completed ? 'DONE' : paid ? 'CURRENT' : 'PENDING',
          date: null,
        },
        {
          step: 'COMPLETION',
          label: 'Training completed',
          description: 'Complete the training requirements.',
          status: completed ? 'DONE' : 'PENDING',
          date: null,
        },
        {
          step: 'CERTIFICATE',
          label: 'Certificate issued',
          description: 'Your certificate becomes available after completion.',
          status: registration.certificateId ? 'DONE' : 'PENDING',
          date: null,
        },
      ],
    };
  }
}
