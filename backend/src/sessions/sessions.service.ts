import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import {
  AuditAction,
  AuditEntity,
  AuditStatus,
} from '../audit/entities/audit-log.entity';
import { Training } from '../trainings/entities/training.entity';
import { Location } from '../locations/entities/location.entity';
import { Trainer } from '../trainers/entities/trainer.entity';
import { Registration } from '../registrations/entities/registration.entity';
import {
  assertTrainingAvailable,
  trainingAvailabilityError,
} from '../trainings/training-availability';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import {
  Session,
  SessionLifecycleStatus,
  SessionMode,
  SessionStatus,
} from './entities/session.entity';
import { isSessionAvailableForRegistration } from './session-availability';

@Injectable()
export class SessionsService {
  constructor(
    @InjectRepository(Session)
    private readonly sessions: Repository<Session>,
    @InjectRepository(Training)
    private readonly trainings: Repository<Training>,
    @InjectRepository(Trainer)
    private readonly trainers: Repository<Trainer>,
    @InjectRepository(Location)
    private readonly locations: Repository<Location>,
    private readonly auditService?: AuditService,
    @Optional()
    @InjectRepository(Registration)
    private readonly registrations?: Repository<Registration>,
    @Optional()
    private readonly dataSource?: DataSource,
  ) {}

  async findAll(): Promise<ReturnType<SessionsService['toResponse']>[]> {
    const sessions = await this.sessions.find({
      relations: this.sessionRelations(),
      order: { startDate: 'ASC' },
    });
    return sessions
      .filter(
        (session) =>
          session.lifecycleStatus === SessionLifecycleStatus.SCHEDULED &&
          !trainingAvailabilityError(session.training),
      )
      .map((session) => this.toResponse(session));
  }

  async findAllAvailableForRegistration(): Promise<
    ReturnType<SessionsService['toResponse']>[]
  > {
    const sessions = await this.sessions.find({
      relations: this.sessionRelations(),
      order: { startDate: 'ASC' },
    });
    return sessions
      .filter((session) => isSessionAvailableForRegistration(session))
      .map((session) => this.toResponse(session));
  }

  async findAllForAdmin(): Promise<
    ReturnType<SessionsService['toResponse']>[]
  > {
    const sessions = await this.sessions.find({
      relations: this.sessionRelations(),
      order: { startDate: 'ASC' },
    });
    return sessions.map((session) => this.toResponse(session, true));
  }

  async findOne(id: string) {
    const session = await this.sessions.findOne({
      where: { id },
      relations: this.sessionRelations(),
    });
    if (!session) throw new NotFoundException('Session not found');
    if (
      session.lifecycleStatus !== SessionLifecycleStatus.SCHEDULED ||
      trainingAvailabilityError(session.training)
    )
      throw new NotFoundException('Session not found');
    return this.toResponse(session);
  }

  async create(dto: CreateSessionDto, actorId?: string, actorRole?: string) {
    const training = await this.getTraining(dto.trainingId);
    const { trainerIds, locationIds, ...sessionData } = dto;
    const trainers = await this.getActiveTrainers(trainerIds);
    const locations = await this.getActiveLocations(locationIds);
    this.validateSchedule(
      dto.startDate,
      dto.endDate,
      dto.startTime ?? '09:00',
      dto.endTime ?? '17:00',
    );
    this.validateCoordinates(dto.latitude, dto.longitude);
    this.validateModeDetails(dto.mode, dto.meetingUrl);
    this.validateSeats(dto.capacity, 0);
    const session = this.sessions.create({
      ...sessionData,
      training,
      trainers,
      locations,
      trainerId:
        trainerIds !== undefined
          ? (trainers[0]?.id ?? null)
          : (dto.trainerId ?? null),
      trainerName:
        trainerIds !== undefined
          ? trainers[0]
            ? `${trainers[0].firstName} ${trainers[0].lastName}`
            : ''
          : (dto.trainerName ?? ''),
      locationId:
        locationIds !== undefined
          ? (locations[0]?.id ?? null)
          : (dto.locationId ?? null),
      locationName:
        locationIds !== undefined
          ? (locations[0]?.name ?? '')
          : (dto.locationName ?? ''),
      city:
        locationIds !== undefined
          ? (locations[0]?.city ?? '')
          : (dto.city ?? ''),
      address:
        locationIds !== undefined
          ? (locations[0]?.address ?? '')
          : (dto.address ?? ''),
      latitude:
        locationIds !== undefined
          ? (locations[0]?.latitude ?? null)
          : (dto.latitude ?? null),
      longitude:
        locationIds !== undefined
          ? (locations[0]?.longitude ?? null)
          : (dto.longitude ?? null),
      startTime: dto.startTime ?? '09:00',
      endTime: dto.endTime ?? '17:00',
      meetingUrl: dto.meetingUrl ?? null,
      scheduleDetails: dto.scheduleDetails ?? null,
      seatsTaken: 0,
      status: this.statusFor(dto.capacity, 0, dto.status),
      lifecycleStatus: dto.lifecycleStatus ?? SessionLifecycleStatus.SCHEDULED,
      price: dto.price,
      currency: 'TND',
      certification: dto.certification ?? training.certification,
    });
    const saved = await this.sessions.save(session);
    await this.auditService?.logAdminAction(
      actorId ?? null,
      AuditAction.SESSION_CREATED,
      AuditEntity.SESSION,
      saved.id,
      `Admin created session ${saved.id}`,
      actorRole === 'ADMIN' ? AuditStatus.SUCCESS : AuditStatus.WARNING,
    );
    return this.toResponse(saved, true);
  }

  async update(
    id: string,
    dto: UpdateSessionDto,
    actorId?: string,
    actorRole?: string,
  ) {
    if (!this.dataSource) {
      throw new InternalServerErrorException(
        'Database transactions are not available for session updates',
      );
    }
    const saved = await this.dataSource.transaction(async (manager) => {
      const sessions = manager.getRepository(Session);
      const lockedSession = await sessions.findOne({
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!lockedSession) throw new NotFoundException('Session not found');
      const session = await sessions.findOne({
        where: { id },
        relations: this.sessionRelations(),
      });
      if (!session) throw new NotFoundException('Session not found');
      const training =
        dto.trainingId && dto.trainingId !== session.trainingId
          ? await this.getTraining(dto.trainingId)
          : session.training;
      const { trainerIds, locationIds, ...sessionData } = dto;
      const trainers =
        trainerIds === undefined
          ? (session.trainers ?? [])
          : await this.getActiveTrainers(trainerIds, [
              ...(session.trainers ?? []).map((trainer) => trainer.id),
              ...(session.trainerId ? [session.trainerId] : []),
            ]);
      const locations =
        locationIds === undefined
          ? (session.locations ?? [])
          : await this.getActiveLocations(locationIds, [
              ...(session.locations ?? []).map((location) => location.id),
              ...(session.locationId ? [session.locationId] : []),
            ]);
      const capacity = dto.capacity ?? session.capacity;
      const seatsTaken = session.seatsTaken;
      this.validateSeats(capacity, seatsTaken);
      this.validateSchedule(
        dto.startDate ?? session.startDate,
        dto.endDate ?? session.endDate,
        dto.startTime ?? session.startTime,
        dto.endTime ?? session.endTime,
      );
      this.validateCoordinates(
        dto.latitude === undefined ? session.latitude : dto.latitude,
        dto.longitude === undefined ? session.longitude : dto.longitude,
      );
      this.validateModeDetails(
        dto.mode ?? session.mode,
        dto.meetingUrl === undefined ? session.meetingUrl : dto.meetingUrl,
      );
      Object.assign(session, sessionData, {
        training,
        trainingId: training.id,
        trainers,
        locations,
        ...(trainerIds !== undefined
          ? {
              trainerId: trainers[0]?.id ?? null,
              trainerName: trainers[0]
                ? `${trainers[0].firstName} ${trainers[0].lastName}`
                : '',
            }
          : {}),
        ...(locationIds !== undefined
          ? {
              locationId: locations[0]?.id ?? null,
              locationName: locations[0]?.name ?? '',
              city: locations[0]?.city ?? '',
              address: locations[0]?.address ?? '',
              latitude: locations[0]?.latitude ?? null,
              longitude: locations[0]?.longitude ?? null,
            }
          : {}),
        seatsTaken,
        status: this.statusFor(
          capacity,
          seatsTaken,
          dto.status ?? session.status,
        ),
        currency: 'TND',
        certification:
          dto.certification === undefined
            ? (session.certification ?? training.certification)
            : dto.certification,
      });
      return sessions.save(session);
    });
    await this.auditService?.logAdminAction(
      actorId ?? null,
      AuditAction.SESSION_UPDATED,
      AuditEntity.SESSION,
      saved.id,
      `Admin updated session ${saved.id}`,
      actorRole === 'ADMIN' ? AuditStatus.SUCCESS : AuditStatus.WARNING,
    );
    return this.toResponse(saved, true);
  }

  async remove(
    id: string,
    actorId?: string,
    actorRole?: string,
  ): Promise<void> {
    const session = await this.sessions.findOne({ where: { id } });
    if (!session) throw new NotFoundException('Session not found');
    if (
      this.registrations &&
      (await this.registrations.count({ where: { sessionId: id } })) > 0
    ) {
      throw new ConflictException(
        'Sessions with registrations cannot be deleted. Cancel the session to preserve its history.',
      );
    }
    await this.sessions.remove(session);
    await this.auditService?.logAdminAction(
      actorId ?? null,
      AuditAction.SESSION_DELETED,
      AuditEntity.SESSION,
      session.id,
      `Admin deleted session ${session.id}`,
      actorRole === 'ADMIN' ? AuditStatus.SUCCESS : AuditStatus.WARNING,
    );
  }

  private async getTraining(id: string): Promise<Training> {
    const training = await this.trainings.findOne({ where: { id } });
    if (!training) throw new NotFoundException('Training not found');
    assertTrainingAvailable(training);
    return training;
  }

  private sessionRelations() {
    return { training: true, trainers: true, locations: true };
  }

  private async getActiveTrainers(
    ids?: string[],
    previouslyAssignedIds: string[] = [],
  ): Promise<Trainer[]> {
    if (!ids?.length) return [];
    const trainers = await this.trainers.find({
      where: { id: In(ids) },
    });
    if (trainers.length !== new Set(ids).size) {
      throw new ConflictException('One or more trainers do not exist');
    }
    if (
      trainers.some(
        (trainer) =>
          !trainer.active && !previouslyAssignedIds.includes(trainer.id),
      )
    ) {
      throw new ConflictException(
        'Archived trainers cannot be assigned to a session',
      );
    }
    const trainersById = new Map(
      trainers.map((trainer) => [trainer.id, trainer]),
    );
    return ids.map((id) => trainersById.get(id)!);
  }

  private async getActiveLocations(
    ids?: string[],
    previouslyAssignedIds: string[] = [],
  ): Promise<Location[]> {
    if (!ids?.length) return [];
    const locations = await this.locations.find({
      where: { id: In(ids) },
    });
    if (locations.length !== new Set(ids).size) {
      throw new ConflictException('One or more locations do not exist');
    }
    if (
      locations.some(
        (location) =>
          !location.active && !previouslyAssignedIds.includes(location.id),
      )
    ) {
      throw new ConflictException(
        'Archived locations cannot be assigned to a session',
      );
    }
    const locationsById = new Map(
      locations.map((location) => [location.id, location]),
    );
    return ids.map((id) => locationsById.get(id)!);
  }

  private validateSeats(capacity: number, seatsTaken: number): void {
    if (seatsTaken > capacity)
      throw new BadRequestException('seatsTaken cannot exceed capacity');
  }

  private validateSchedule(
    startDate: string,
    endDate: string,
    startTime: string,
    endTime: string,
  ): void {
    const startDay = startDate.slice(0, 10);
    const endDay = endDate.slice(0, 10);
    if (endDay < startDay) {
      throw new BadRequestException('endDate cannot be before startDate');
    }
    if (
      !/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(startTime) ||
      !/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(endTime)
    ) {
      throw new BadRequestException(
        'Session times must use the 24-hour HH:mm format',
      );
    }
    const seconds = (time: string) => {
      const [hours, minutes, remainingSeconds = '0'] = time.split(':');
      return (
        Number(hours) * 3600 + Number(minutes) * 60 + Number(remainingSeconds)
      );
    };
    if (startDay === endDay && seconds(endTime) <= seconds(startTime)) {
      throw new BadRequestException(
        'endTime must be later than startTime on the same day',
      );
    }
  }

  private validateCoordinates(
    latitude: number | null | undefined,
    longitude: number | null | undefined,
  ): void {
    if ((latitude == null) !== (longitude == null)) {
      throw new BadRequestException(
        'Latitude and longitude must be provided together',
      );
    }
    if (latitude != null && (latitude < -90 || latitude > 90)) {
      throw new BadRequestException('Latitude must be between -90 and 90');
    }
    if (longitude != null && (longitude < -180 || longitude > 180)) {
      throw new BadRequestException('Longitude must be between -180 and 180');
    }
  }

  private validateModeDetails(
    mode: Session['mode'],
    meetingUrl: string | null | undefined,
  ): void {
    if (
      (mode === SessionMode.HYBRID || mode === SessionMode.LIVE_ONLINE) &&
      !meetingUrl?.trim()
    ) {
      throw new BadRequestException(
        'A meeting URL is required for hybrid and online sessions',
      );
    }
  }

  private statusFor(
    capacity: number,
    seatsTaken: number,
    requestedStatus?: SessionStatus,
  ): SessionStatus {
    if (requestedStatus === SessionStatus.CLOSED) return SessionStatus.CLOSED;
    if (seatsTaken >= capacity) return SessionStatus.FULL;
    if (seatsTaken >= capacity * 0.8) return SessionStatus.ALMOST_FULL;
    return SessionStatus.OPEN;
  }

  private toResponse(session: Session, includePrivateDelivery = false) {
    return {
      id: session.id,
      trainingId: session.trainingId,
      trainingSlug: session.training.slug,
      trainingTitle: session.training.title,
      axisCode: session.training.axisCode,
      trainers: (session.trainers ?? []).map((trainer) => ({
        id: trainer.id,
        slug: trainer.slug,
        firstName: trainer.firstName,
        lastName: trainer.lastName,
        speciality: trainer.speciality,
      })),
      trainerIds: (session.trainers ?? []).map((trainer) => trainer.id),
      locations: (session.locations ?? []).map((location) => ({
        id: location.id,
        name: location.name,
        type: location.type,
        city: location.city,
        country: location.country,
        address: location.address,
        latitude: location.latitude,
        longitude: location.longitude,
      })),
      locationIds: (session.locations ?? []).map((location) => location.id),
      trainerId: session.trainerId,
      trainerName: session.trainerName,
      locationId: session.locationId,
      locationName: session.locationName,
      city: session.city,
      address: session.address,
      latitude: session.latitude,
      longitude: session.longitude,
      mode: session.mode,
      startDate: session.startDate,
      endDate: session.endDate,
      startTime: session.startTime,
      endTime: session.endTime,
      scheduleDetails: session.scheduleDetails,
      ...(includePrivateDelivery ? { meetingUrl: session.meetingUrl } : {}),
      capacity: session.capacity,
      seatsTaken: session.seatsTaken,
      seatsLeft: Math.max(0, session.capacity - session.seatsTaken),
      status: session.status,
      lifecycleStatus: session.lifecycleStatus,
      price: session.price,
      currency: session.currency,
      certification: session.certification,
    };
  }
}
