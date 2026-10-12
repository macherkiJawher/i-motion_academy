import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Training } from '../trainings/entities/training.entity';
import { User } from '../users/entities/user.entity';
import {
  Session,
  SessionLifecycleStatus,
} from '../sessions/entities/session.entity';
import { CreateTrainerDto } from './dto/create-trainer.dto';
import { UpdateTrainerDto } from './dto/update-trainer.dto';
import { Trainer } from './entities/trainer.entity';

@Injectable()
export class TrainersService {
  constructor(
    @InjectRepository(Trainer)
    private readonly trainers: Repository<Trainer>,
    @InjectRepository(Training)
    private readonly trainings: Repository<Training>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
    @InjectRepository(Session)
    private readonly sessions: Repository<Session>,
  ) {}

  findAll(): Promise<Trainer[]> {
    return this.trainers.find({
      where: { active: true },
      relations: { trainings: true },
      order: { lastName: 'ASC', firstName: 'ASC' },
    });
  }

  findAllForAdmin(): Promise<Trainer[]> {
    return this.trainers.find({
      relations: { trainings: true },
      order: { lastName: 'ASC', firstName: 'ASC' },
    });
  }

  async findOne(idOrSlug: string): Promise<Trainer> {
    const trainer = await this.trainers.findOne({
      where: this.isUuid(idOrSlug)
        ? [{ id: idOrSlug }, { slug: idOrSlug }]
        : { slug: idOrSlug },
      relations: { trainings: true },
    });
    if (!trainer) throw new NotFoundException('Trainer not found');
    return trainer;
  }

  async findPublicOne(idOrSlug: string): Promise<Trainer> {
    const trainer = await this.findOne(idOrSlug);
    if (!trainer.active) throw new NotFoundException('Trainer not found');
    return trainer;
  }

  async findSessions(idOrSlug: string): Promise<Session[]> {
    const trainer = await this.findOne(idOrSlug);
    const sessions = await this.sessions.find({
      where: {
        trainers: { id: trainer.id },
        lifecycleStatus: SessionLifecycleStatus.SCHEDULED,
      },
      relations: { training: true, trainers: true, locations: true },
      order: { startDate: 'ASC' },
    });
    return sessions.map((session) => ({ ...session, meetingUrl: null }));
  }

  async create(dto: CreateTrainerDto): Promise<Trainer> {
    await this.ensureUnique(dto.slug, dto.email);
    const user = await this.getUser(dto.userId);
    const trainings = await this.getTrainings(dto.trainingIds);
    return this.trainers.save(
      this.trainers.create({
        ...dto,
        userId: user?.id ?? null,
        user,
        email: dto.email.toLowerCase(),
        phone: dto.phone ?? null,
        expertise: this.normalizeExpertise(dto.expertise),
        biography: dto.biography ?? '',
        photoUrl: dto.photoUrl ?? '',
        yearsExperience: dto.yearsExperience ?? 0,
        active: dto.active ?? true,
        trainings,
      }),
    );
  }

  async update(idOrSlug: string, dto: UpdateTrainerDto): Promise<Trainer> {
    const trainer = await this.findOne(idOrSlug);
    const slug = dto.slug ?? trainer.slug;
    const email = dto.email?.toLowerCase() ?? trainer.email;
    await this.ensureUnique(slug, email, trainer.id);
    const user =
      dto.userId === undefined ? trainer.user : await this.getUser(dto.userId);
    const trainings =
      dto.trainingIds === undefined
        ? trainer.trainings
        : await this.getTrainings(dto.trainingIds);
    Object.assign(trainer, dto, {
      slug,
      email,
      userId: user?.id ?? null,
      user,
      expertise:
        dto.expertise === undefined
          ? trainer.expertise
          : this.normalizeExpertise(dto.expertise),
      trainings,
    });
    return this.trainers.save(trainer);
  }

  async archive(idOrSlug: string): Promise<Trainer> {
    const trainer = await this.findOne(idOrSlug);
    trainer.active = false;
    return this.trainers.save(trainer);
  }

  async restore(idOrSlug: string): Promise<Trainer> {
    const trainer = await this.findOne(idOrSlug);
    trainer.active = true;
    return this.trainers.save(trainer);
  }

  private async ensureUnique(
    slug: string,
    email: string,
    exceptId?: string,
  ): Promise<void> {
    const matches = await this.trainers.find({
      where: [{ slug }, { email: email.toLowerCase() }],
      select: { id: true, slug: true, email: true },
    });
    if (matches.some((trainer) => trainer.id !== exceptId)) {
      throw new ConflictException('Trainer slug or email already exists');
    }
  }

  private async getUser(userId?: string | null): Promise<User | null> {
    if (!userId) return null;
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Linked user not found');
    return user;
  }

  private async getTrainings(trainingIds?: string[]): Promise<Training[]> {
    if (!trainingIds?.length) return [];
    const trainings = await this.trainings.find({
      where: { id: In(trainingIds) },
    });
    if (trainings.length !== new Set(trainingIds).size) {
      throw new NotFoundException('One or more trainings were not found');
    }
    return trainings;
  }

  private normalizeExpertise(expertise?: string[]): string[] {
    return [
      ...new Set((expertise ?? []).map((item) => item.trim()).filter(Boolean)),
    ];
  }

  private isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    );
  }
}
