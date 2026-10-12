import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum Role {
  PARTICIPANT = 'PARTICIPANT',
  ADMIN = 'ADMIN',
}

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'first_name', type: 'varchar', length: 100 })
  firstName: string;

  @Column({ name: 'last_name', type: 'varchar', length: 100 })
  lastName: string;

  @Column({ type: 'varchar', length: 200, unique: true })
  email: string;

  /**
   * Hashed password. Nullable to allow OAuth/SSO or seeded demo accounts.
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  password: string | null;

  @Column({
    name: 'password_reset_token_hash',
    type: 'varchar',
    length: 64,
    nullable: true,
  })
  passwordResetTokenHash: string | null;

  @Column({
    name: 'password_reset_expires_at',
    type: 'timestamptz',
    nullable: true,
  })
  passwordResetExpiresAt: Date | null;

  @Column({ name: 'token_version', type: 'integer', default: 0 })
  tokenVersion: number;

  @Column({ type: 'varchar', length: 40, nullable: true })
  phone: string | null;

  @Column({ type: 'enum', enum: Role, default: Role.PARTICIPANT })
  role: Role;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'avatar_url', type: 'varchar', length: 1024, nullable: true })
  avatarUrl: string | null;

  /**
   * Relations (defined in other modules):
   * - registrations: one-to-many -> Registration.user
   * - payments: one-to-many -> Payment.user
   * - certificates: one-to-many -> Certificate.user
   * - notifications: one-to-many -> AppNotification.user
   * - trainer: one-to-one -> Trainer.user (optional)
   *
   * These relations will be added once the related entities/modules exist.
   */
}
