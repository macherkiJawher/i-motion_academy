import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { hash } from 'bcryptjs';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

const BCRYPT_MAX_PASSWORD_BYTES = 72;

@Injectable()
export class UsersService {
  constructor(
    @Optional()
    @InjectRepository(User)
    private readonly repo?: Repository<User>,
  ) {}

  async create(dto: CreateUserDto): Promise<User> {
    if (!this.repo)
      throw new ServiceUnavailableException('Database not configured');
    const exists = await this.repo.findOne({ where: { email: dto.email } });
    if (exists) throw new ConflictException('Email already in use');
    const password = await this.hashPassword(dto.password);

    const user = this.repo.create({
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email.toLowerCase(),
      password,
      phone: dto.phone ?? null,
      avatarUrl: dto.avatarUrl ?? null,
    });
    return this.repo.save(user);
  }

  async createGoogleUser(dto: {
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl?: string | null;
  }): Promise<User> {
    if (!this.repo)
      throw new ServiceUnavailableException('Database not configured');

    const normalizedEmail = dto.email.toLowerCase();
    const existing = await this.repo.findOne({
      where: { email: normalizedEmail },
    });

    if (existing) {
      if (existing.password) {
        throw new ConflictException(
          'This email is already associated with a local account. Sign in with your password or contact support to link Google.',
        );
      }
      return existing;
    }

    const user = this.repo.create({
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: normalizedEmail,
      password: null,
      avatarUrl: dto.avatarUrl ?? null,
      phone: null,
    });

    return this.repo.save(user);
  }

  async setPassword(id: string, password: string): Promise<User> {
    if (!this.repo)
      throw new ServiceUnavailableException('Database not configured');
    const user = await this.findOne(id);
    user.password = await this.hashPassword(password);
    user.passwordResetTokenHash = null;
    user.passwordResetExpiresAt = null;
    user.tokenVersion = (user.tokenVersion ?? 0) + 1;
    return this.repo.save(user);
  }

  async storePasswordResetToken(
    id: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<void> {
    if (!this.repo)
      throw new ServiceUnavailableException('Database not configured');
    await this.repo.update(id, {
      passwordResetTokenHash: tokenHash,
      passwordResetExpiresAt: expiresAt,
    });
  }

  async clearPasswordResetToken(id: string): Promise<void> {
    if (!this.repo)
      throw new ServiceUnavailableException('Database not configured');
    await this.repo.update(id, {
      passwordResetTokenHash: null,
      passwordResetExpiresAt: null,
    });
  }

  async resetPasswordWithToken(
    tokenHash: string,
    password: string,
  ): Promise<void> {
    if (!this.repo)
      throw new ServiceUnavailableException('Database not configured');

    const candidate = await this.repo.findOne({
      where: { passwordResetTokenHash: tokenHash },
    });
    if (
      !candidate ||
      !candidate.passwordResetExpiresAt ||
      candidate.passwordResetExpiresAt.getTime() <= Date.now()
    ) {
      throw new BadRequestException('Invalid or expired password reset token');
    }

    const hashedPassword = await this.hashPassword(password);
    await this.repo.manager.transaction(async (manager) => {
      const users = manager.getRepository(User);
      const user = await users.findOne({
        where: { id: candidate.id },
        lock: { mode: 'pessimistic_write' },
      });
      if (
        !user ||
        user.passwordResetTokenHash !== tokenHash ||
        !user.passwordResetExpiresAt ||
        user.passwordResetExpiresAt.getTime() <= Date.now()
      ) {
        throw new BadRequestException(
          'Invalid or expired password reset token',
        );
      }

      user.password = hashedPassword;
      user.passwordResetTokenHash = null;
      user.passwordResetExpiresAt = null;
      user.tokenVersion = (user.tokenVersion ?? 0) + 1;
      await users.save(user);
    });
  }

  hashPassword(password: string): Promise<string> {
    if (Buffer.byteLength(password, 'utf8') > BCRYPT_MAX_PASSWORD_BYTES) {
      throw new BadRequestException(
        `Password must not exceed ${BCRYPT_MAX_PASSWORD_BYTES} UTF-8 bytes`,
      );
    }
    return hash(password, 10);
  }

  findAll(): Promise<User[]> {
    if (!this.repo)
      throw new ServiceUnavailableException('Database not configured');
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<User> {
    if (!this.repo)
      throw new ServiceUnavailableException('Database not configured');
    const user = await this.repo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    if (!this.repo)
      throw new ServiceUnavailableException('Database not configured');
    return this.repo.findOne({ where: { email: email.toLowerCase() } });
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    if (!this.repo)
      throw new ServiceUnavailableException('Database not configured');
    const user = await this.findOne(id);
    const roleChanged = dto.role !== undefined && dto.role !== user.role;
    const patched = Object.assign(user, dto);
    if (roleChanged) patched.tokenVersion = (user.tokenVersion ?? 0) + 1;
    return this.repo.save(patched);
  }

  async updateProfile(id: string, dto: UpdateProfileDto): Promise<User> {
    if (!this.repo)
      throw new ServiceUnavailableException('Database not configured');

    const user = await this.findOne(id);
    if (dto.email !== undefined) {
      const email = dto.email.trim().toLowerCase();
      if (email !== user.email.toLowerCase()) {
        const existing = await this.repo.findOne({ where: { email } });
        if (existing && existing.id !== id) {
          throw new ConflictException('Email already in use');
        }
      }
      user.email = email;
    }
    if (dto.firstName !== undefined) user.firstName = dto.firstName;
    if (dto.lastName !== undefined) user.lastName = dto.lastName;
    if (dto.phone !== undefined) user.phone = dto.phone;

    return this.repo.save(user);
  }

  async remove(id: string): Promise<void> {
    if (!this.repo)
      throw new ServiceUnavailableException('Database not configured');
    const res = await this.repo.delete(id);
    if (res.affected === 0) throw new NotFoundException('User not found');
  }
}
