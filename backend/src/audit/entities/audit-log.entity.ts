import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum AuditAction {
  USER_LOGIN = 'USER_LOGIN',
  USER_LOGOUT = 'USER_LOGOUT',
  REGISTRATION_CREATED = 'REGISTRATION_CREATED',
  REGISTRATION_CONFIRMED = 'REGISTRATION_CONFIRMED',
  REGISTRATION_CANCELLED = 'REGISTRATION_CANCELLED',
  PAYMENT_PROCESSED = 'PAYMENT_PROCESSED',
  CERTIFICATE_ISSUED = 'CERTIFICATE_ISSUED',
  CERTIFICATE_REVOKED = 'CERTIFICATE_REVOKED',
  SESSION_CREATED = 'SESSION_CREATED',
  SESSION_UPDATED = 'SESSION_UPDATED',
  SESSION_DELETED = 'SESSION_DELETED',
  TRAINING_CREATED = 'TRAINING_CREATED',
  TRAINING_UPDATED = 'TRAINING_UPDATED',
  TRAINING_DELETED = 'TRAINING_DELETED',
  USER_CREATED = 'USER_CREATED',
  USER_UPDATED = 'USER_UPDATED',
  USER_DELETED = 'USER_DELETED',
  ADMIN_ACTION = 'ADMIN_ACTION',
  COMPLAINT_CREATED = 'COMPLAINT_CREATED',
  COMPLAINT_UPDATED = 'COMPLAINT_UPDATED',
}

export enum AuditStatus {
  SUCCESS = 'SUCCESS',
  WARNING = 'WARNING',
  FAILED = 'FAILED',
}

export enum AuditEntity {
  USER = 'USER',
  REGISTRATION = 'REGISTRATION',
  PAYMENT = 'PAYMENT',
  CERTIFICATE = 'CERTIFICATE',
  SESSION = 'SESSION',
  TRAINING = 'TRAINING',
  COMPLAINT = 'COMPLAINT',
}

@Entity({ name: 'audit_logs' })
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'actor_id', type: 'uuid', nullable: true })
  actorId: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'actor_id' })
  actor: User | null;

  @Column({ type: 'enum', enum: AuditAction })
  action: AuditAction;

  @Column({ type: 'enum', enum: AuditEntity })
  entity: AuditEntity;

  @Column({ name: 'entity_id', type: 'uuid', nullable: true })
  entityId: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  details: string | null;

  @Column({ type: 'enum', enum: AuditStatus, default: AuditStatus.SUCCESS })
  status: AuditStatus;

  @Column({ type: 'varchar', length: 100, nullable: true })
  ipAddress: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  userAgent: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
