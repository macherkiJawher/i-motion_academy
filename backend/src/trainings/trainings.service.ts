import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import {
  AuditAction,
  AuditEntity,
  AuditStatus,
} from '../audit/entities/audit-log.entity';
import {
  CreateTrainingDto,
  MIN_TRAINING_DESCRIPTION_LENGTH,
} from './dto/create-training.dto';
import { UpdateTrainingDto } from './dto/update-training.dto';
import {
  ApprovalStatus,
  AxisCode,
  RecognitionType,
  Training,
  TrainingDurationUnit,
  TrainingLevel,
  TrainingLifecycleStatus,
} from './entities/training.entity';
import { trainingAvailabilityError } from './training-availability';

@Injectable()
export class TrainingsService {
  constructor(
    @InjectRepository(Training)
    private readonly repository: Repository<Training>,
    private readonly auditService?: AuditService,
  ) {}

  async findAll(): Promise<Training[]> {
    const trainings = await this.repository.find({
      where: [
        { lifecycleStatus: TrainingLifecycleStatus.PUBLISHED },
        {
          lifecycleStatus: TrainingLifecycleStatus.IN_REVIEW,
          axisCode: AxisCode.BTP,
          recognitionType: RecognitionType.BTP_DIPLOMA,
          approvalStatus: ApprovalStatus.PENDING,
        },
        {
          lifecycleStatus: TrainingLifecycleStatus.IN_REVIEW,
          axisCode: AxisCode.BTS,
          recognitionType: RecognitionType.BTS_DIPLOMA,
          approvalStatus: ApprovalStatus.PENDING,
        },
      ],
      order: { createdAt: 'DESC' },
    });
    return trainings.filter(
      (training) =>
        !trainingAvailabilityError(training) ||
        (((training.axisCode === AxisCode.BTP &&
          training.recognitionType === RecognitionType.BTP_DIPLOMA) ||
          (training.axisCode === AxisCode.BTS &&
            training.recognitionType === RecognitionType.BTS_DIPLOMA)) &&
          training.approvalStatus === ApprovalStatus.PENDING &&
          (training.lifecycleStatus === TrainingLifecycleStatus.IN_REVIEW ||
            training.lifecycleStatus === TrainingLifecycleStatus.PUBLISHED)),
    );
  }

  findAllForAdmin(): Promise<Training[]> {
    return this.repository.find({ order: { createdAt: 'DESC' } });
  }

  async findPublicOne(idOrSlug: string): Promise<Training> {
    const training = await this.findOne(idOrSlug);
    const error = trainingAvailabilityError(training);
    if (error) throw new NotFoundException('Training not found');
    return training;
  }

  async findOne(idOrSlug: string): Promise<Training> {
    const where = this.isUuid(idOrSlug)
      ? [{ id: idOrSlug }, { slug: idOrSlug }]
      : [{ slug: idOrSlug }];
    const training = await this.repository.findOne({ where });
    if (!training) throw new NotFoundException('Training not found');
    return training;
  }

  async create(
    dto: CreateTrainingDto,
    actorId?: string,
    actorRole?: string,
  ): Promise<Training> {
    const title = dto.title.trim();
    const slug = (dto.slug ?? this.slugify(title)).trim();
    const existing = await this.repository.findOne({
      where: [{ slug }, { title }],
    });
    if (existing)
      throw new ConflictException('Training title or slug already exists');

    const lifecycleStatus = this.resolveLifecycleStatus(dto);
    const credentialTitle =
      dto.credentialTitle?.trim() || dto.certification?.trim() || null;
    const durationUnit =
      dto.durationUnit ??
      ((dto.axisCode === AxisCode.BTP &&
        dto.recognitionType === RecognitionType.BTP_DIPLOMA) ||
      (dto.axisCode === AxisCode.BTS &&
        dto.recognitionType === RecognitionType.BTS_DIPLOMA)
        ? TrainingDurationUnit.YEARS
        : TrainingDurationUnit.HOURS);
    const durationHours = dto.durationHours ?? null;
    const normalized = {
      ...dto,
      title,
      description: dto.description?.trim() ?? '',
      slug,
      lifecycleStatus,
      recognitionType: dto.recognitionType ?? RecognitionType.NONE,
      approvalStatus: dto.approvalStatus ?? ApprovalStatus.NOT_APPLICABLE,
      durationHours,
      durationValue:
        dto.durationValue ??
        (durationUnit === TrainingDurationUnit.HOURS
          ? (durationHours ?? undefined)
          : undefined),
      durationUnit,
      credentialTitle,
      credentialIssuer: dto.credentialIssuer?.trim() || null,
      currency: dto.currency ?? 'TND',
    };
    this.validateTraining(
      normalized,
      dto.description !== undefined ||
        lifecycleStatus === TrainingLifecycleStatus.PUBLISHED,
    );

    const training = this.repository.create({
      ...normalized,
      slug,
      subcategory: dto.subcategory ?? '',
      recognitionType: dto.recognitionType ?? RecognitionType.NONE,
      approvalStatus: dto.approvalStatus ?? ApprovalStatus.NOT_APPLICABLE,
      approvalReference: dto.approvalReference ?? null,
      approvalAuthority: dto.approvalAuthority ?? null,
      approvalValidUntil: dto.approvalValidUntil ?? null,
      currency: 'TND',
      tagline: dto.tagline ?? '',
      description: normalized.description,
      certification: credentialTitle,
      credentialTitle,
      credentialIssuer: dto.credentialIssuer?.trim() || null,
      targetAudience: dto.targetAudience ?? '',
      prerequisites: dto.prerequisites ?? '',
      skills: dto.skills ?? [],
      objectives: dto.objectives ?? [],
      program: dto.program ?? [],
      coverUrl: dto.coverUrl ?? '',
      rating: dto.rating ?? 0,
      learners: dto.learners ?? 0,
      active: lifecycleStatus === TrainingLifecycleStatus.PUBLISHED,
    });
    const saved = await this.repository.save(training);
    await this.auditService?.logAdminAction(
      actorId ?? null,
      AuditAction.TRAINING_CREATED,
      AuditEntity.TRAINING,
      saved.id,
      `Admin created training ${saved.title}`,
      actorRole === 'ADMIN' ? AuditStatus.SUCCESS : AuditStatus.WARNING,
    );
    return saved;
  }

  async update(
    idOrSlug: string,
    dto: UpdateTrainingDto,
    actorId?: string,
    actorRole?: string,
  ): Promise<Training> {
    const training = await this.findOne(idOrSlug);
    const nextTitle = dto.title?.trim() ?? training.title;
    const nextSlug = (
      dto.slug ?? (dto.title ? this.slugify(nextTitle) : training.slug)
    ).trim();
    if (
      nextSlug !== training.slug ||
      (dto.title && nextTitle !== training.title)
    ) {
      const duplicate = await this.repository.findOne({
        where: dto.title
          ? [{ slug: nextSlug }, { title: nextTitle }]
          : [{ slug: nextSlug }],
      });
      if (duplicate && duplicate.id !== training.id)
        throw new ConflictException('Training title or slug already exists');
    }
    const lifecycleStatus = this.resolveLifecycleStatus(
      dto,
      training.lifecycleStatus,
    );
    const nextDurationUnit = dto.durationUnit ?? training.durationUnit;
    const nextDurationValue =
      dto.durationValue ??
      (nextDurationUnit === TrainingDurationUnit.HOURS &&
      dto.durationHours !== undefined &&
      dto.durationHours !== null
        ? dto.durationHours
        : training.durationValue);
    const nextCredentialTitle =
      dto.credentialTitle === undefined
        ? dto.certification === undefined
          ? training.credentialTitle
          : dto.certification?.trim() || null
        : dto.credentialTitle?.trim() || null;
    const next = {
      ...training,
      ...dto,
      title: dto.title?.trim() ?? training.title,
      description: dto.description?.trim() ?? training.description,
      slug: nextSlug,
      lifecycleStatus,
      durationValue: nextDurationValue,
      durationUnit: nextDurationUnit,
      credentialTitle: nextCredentialTitle,
      credentialIssuer:
        dto.credentialIssuer === undefined
          ? training.credentialIssuer
          : dto.credentialIssuer?.trim() || null,
      currency: dto.currency ?? training.currency,
    };
    this.validateTraining(
      next,
      dto.description !== undefined ||
        lifecycleStatus === TrainingLifecycleStatus.PUBLISHED,
    );
    Object.assign(training, next, {
      certification: nextCredentialTitle,
      active: lifecycleStatus === TrainingLifecycleStatus.PUBLISHED,
    });
    const saved = await this.repository.save(training);
    await this.auditService?.logAdminAction(
      actorId ?? null,
      AuditAction.TRAINING_UPDATED,
      AuditEntity.TRAINING,
      saved.id,
      `Admin updated training ${saved.title}`,
      actorRole === 'ADMIN' ? AuditStatus.SUCCESS : AuditStatus.WARNING,
    );
    return saved;
  }

  async remove(
    idOrSlug: string,
    actorId?: string,
    actorRole?: string,
  ): Promise<void> {
    const training = await this.findOne(idOrSlug);
    await this.repository.remove(training);
    await this.auditService?.logAdminAction(
      actorId ?? null,
      AuditAction.TRAINING_DELETED,
      AuditEntity.TRAINING,
      training.id,
      `Admin deleted training ${training.title}`,
      actorRole === 'ADMIN' ? AuditStatus.SUCCESS : AuditStatus.WARNING,
    );
  }

  private slugify(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  private resolveLifecycleStatus(
    input: {
      lifecycleStatus?: TrainingLifecycleStatus;
      active?: boolean;
      axisCode?: AxisCode;
      recognitionType?: RecognitionType;
      approvalStatus?: ApprovalStatus;
    },
    fallback?: TrainingLifecycleStatus,
  ): TrainingLifecycleStatus {
    if (input.lifecycleStatus) return input.lifecycleStatus;
    if (input.active === false) return TrainingLifecycleStatus.ARCHIVED;
    if (
      (input.axisCode === AxisCode.BTP &&
        input.recognitionType === RecognitionType.BTP_DIPLOMA) ||
      (input.axisCode === AxisCode.BTS &&
        input.recognitionType === RecognitionType.BTS_DIPLOMA)
    ) {
      if (input.approvalStatus !== ApprovalStatus.APPROVED) {
        return TrainingLifecycleStatus.IN_REVIEW;
      }
    }
    if (input.active === true) return TrainingLifecycleStatus.PUBLISHED;
    return fallback ?? TrainingLifecycleStatus.DRAFT;
  }

  private validateTraining(
    input: Partial<Training>,
    validateDescription: boolean,
  ): void {
    const title = input.title?.trim() ?? '';
    if (!title || title.length > 200) {
      throw new ConflictException(
        'Title must contain between 1 and 200 characters',
      );
    }

    const slug = input.slug?.trim() ?? '';
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 180) {
      throw new ConflictException(
        'Slug must contain lowercase letters, numbers and single hyphens',
      );
    }

    if (!Object.values(AxisCode).includes(input.axisCode as AxisCode)) {
      throw new ConflictException('A valid training domain is required');
    }
    if (
      !Object.values(RecognitionType).includes(
        input.recognitionType as RecognitionType,
      )
    ) {
      throw new ConflictException('A valid recognition type is required');
    }
    if (
      !Object.values(ApprovalStatus).includes(
        input.approvalStatus as ApprovalStatus,
      )
    ) {
      throw new ConflictException('A valid approval status is required');
    }
    if (!Object.values(TrainingLevel).includes(input.level as TrainingLevel)) {
      throw new ConflictException('A valid training level is required');
    }
    if (
      !Object.values(TrainingLifecycleStatus).includes(
        input.lifecycleStatus as TrainingLifecycleStatus,
      )
    ) {
      throw new ConflictException(
        'A valid training lifecycle status is required',
      );
    }
    const description = input.description?.trim() ?? '';
    if (description.length > 10000) {
      throw new ConflictException(
        'Description must be at most 10000 characters',
      );
    }
    if (
      validateDescription &&
      description.length > 0 &&
      description.length < MIN_TRAINING_DESCRIPTION_LENGTH
    ) {
      throw new ConflictException(
        `Description must contain at least ${MIN_TRAINING_DESCRIPTION_LENGTH} characters`,
      );
    }
    if (
      input.durationHours !== undefined &&
      input.durationHours !== null &&
      (!Number.isInteger(input.durationHours) || input.durationHours < 1)
    ) {
      throw new ConflictException(
        'Teaching duration must be a positive number of hours',
      );
    }
    if (
      input.durationValue === undefined ||
      !Number.isFinite(input.durationValue) ||
      input.durationValue <= 0
    ) {
      throw new ConflictException('Program duration must be greater than zero');
    }
    if (
      input.durationUnit === TrainingDurationUnit.HOURS &&
      input.durationHours !== undefined &&
      input.durationHours !== null &&
      input.durationValue !== input.durationHours
    ) {
      throw new ConflictException(
        'Hour-based program duration must match the teaching hours',
      );
    }
    if (
      !Object.values(TrainingDurationUnit).includes(
        input.durationUnit as TrainingDurationUnit,
      )
    ) {
      throw new ConflictException('A valid program duration unit is required');
    }
    if (!Number.isFinite(input.price) || (input.price ?? -1) < 0) {
      throw new ConflictException(
        'Catalog price must be a non-negative number',
      );
    }
    if (Number((input.price ?? 0).toFixed(2)) !== input.price) {
      throw new ConflictException(
        'Catalog price supports at most two decimal places',
      );
    }
    if (input.currency !== 'TND') {
      throw new ConflictException('Training prices must use TND');
    }

    this.validateList(input.skills, 'Skills', 200);
    this.validateList(input.objectives, 'Objectives', 500);
    if (input.program) {
      if (!Array.isArray(input.program) || input.program.length > 100) {
        throw new ConflictException('Program must contain at most 100 modules');
      }
      for (const module of input.program) {
        if (!module.title?.trim() || module.title.trim().length > 160) {
          throw new ConflictException(
            'Each program module needs a title of 1 to 160 characters',
          );
        }
        if (!module.detail?.trim() || module.detail.trim().length > 2000) {
          throw new ConflictException(
            'Each program module needs details of 1 to 2000 characters',
          );
        }
        if (
          module.hours !== undefined &&
          module.hours !== null &&
          (!Number.isInteger(module.hours) || module.hours < 1)
        ) {
          throw new ConflictException(
            'Each program module must have a positive number of hours',
          );
        }
      }
      const hasAllModuleHours =
        input.program.length > 0 &&
        input.program.every(
          (module) => module.hours !== undefined && module.hours !== null,
        );
      const moduleHoursTotal = input.program.reduce(
        (total, module) => total + (module.hours ?? 0),
        0,
      );
      if (
        input.durationHours !== undefined &&
        input.durationHours !== null &&
        hasAllModuleHours &&
        moduleHoursTotal !== input.durationHours
      ) {
        throw new ConflictException(
          'Program module hours must equal the teaching duration',
        );
      }
    }

    this.validateRecognition(input);
    if (input.lifecycleStatus === TrainingLifecycleStatus.PUBLISHED) {
      if (description.length < MIN_TRAINING_DESCRIPTION_LENGTH) {
        throw new ConflictException(
          `Description must contain at least ${MIN_TRAINING_DESCRIPTION_LENGTH} characters before publication`,
        );
      }
      const availabilityError = trainingAvailabilityError(input);
      if (availabilityError) throw new ConflictException(availabilityError);
      if (
        (input.recognitionType === RecognitionType.I_MOTION_CERTIFICATE ||
          input.recognitionType === RecognitionType.BTP_DIPLOMA ||
          input.recognitionType === RecognitionType.BTS_DIPLOMA) &&
        !(input.credentialTitle ?? input.certification)?.trim()
      ) {
        throw new ConflictException(
          'A credential title is required before publication',
        );
      }
    }
  }

  private validateList(
    values: unknown,
    label: string,
    maxLength: number,
  ): void {
    if (values === undefined) return;
    if (!Array.isArray(values) || values.length > 50) {
      throw new ConflictException(`${label} must contain at most 50 entries`);
    }
    if (
      values.some(
        (value) =>
          typeof value !== 'string' ||
          !value.trim() ||
          value.trim().length > maxLength,
      )
    ) {
      throw new ConflictException(
        `Each ${label.toLowerCase()} entry must contain 1 to ${maxLength} characters`,
      );
    }
  }

  private isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    );
  }

  private validateRecognition(input: {
    axisCode?: AxisCode;
    recognitionType?: RecognitionType;
    approvalStatus?: ApprovalStatus;
    approvalReference?: string | null;
    approvalAuthority?: string | null;
    approvalValidUntil?: string | null;
  }): void {
    const recognitionType = input.recognitionType ?? RecognitionType.NONE;
    const approvalStatus =
      input.approvalStatus ?? ApprovalStatus.NOT_APPLICABLE;
    const isDiploma =
      recognitionType === RecognitionType.BTP_DIPLOMA ||
      recognitionType === RecognitionType.BTS_DIPLOMA;

    if (
      recognitionType === RecognitionType.BTP_DIPLOMA &&
      input.axisCode !== AxisCode.BTP
    ) {
      throw new ConflictException('A BTP diploma must use the BTP category');
    }
    if (
      recognitionType === RecognitionType.BTS_DIPLOMA &&
      input.axisCode !== AxisCode.BTS
    ) {
      throw new ConflictException('A BTS diploma must use the BTS category');
    }

    if (!isDiploma && approvalStatus !== ApprovalStatus.NOT_APPLICABLE) {
      throw new ConflictException(
        'Only BTP or BTS diplomas can have an approval status',
      );
    }
    if (isDiploma && approvalStatus === ApprovalStatus.NOT_APPLICABLE) {
      throw new ConflictException(
        'A BTP or BTS diploma must have an approval status',
      );
    }
    if (approvalStatus !== ApprovalStatus.APPROVED) return;

    if (
      !input.approvalReference ||
      !input.approvalAuthority ||
      !input.approvalValidUntil
    ) {
      throw new ConflictException(
        'An approved diploma requires an approval reference, authority and validity date',
      );
    }
    if (input.approvalValidUntil < new Date().toISOString().slice(0, 10)) {
      throw new ConflictException(
        'An approved diploma cannot use an expired approval',
      );
    }
  }
}
