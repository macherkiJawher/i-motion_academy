import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum ComplaintCategory {
  REGISTRATION = 'REGISTRATION',
  PAYMENT = 'PAYMENT',
  SESSION = 'SESSION',
  TRAINING = 'TRAINING',
  CERTIFICATE = 'CERTIFICATE',
  TRAINER = 'TRAINER',
  OTHER = 'OTHER',
}

export enum ComplaintStatus {
  NEW = 'NEW',
  IN_PROGRESS = 'IN_PROGRESS',
  WAITING_FOR_PARTICIPANT = 'WAITING_FOR_PARTICIPANT',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
  REJECTED = 'REJECTED',
}

export enum ComplaintPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

@Entity({ name: 'complaints' })
export class Complaint {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 32, unique: true })
  reference: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'varchar', length: 32 })
  category: ComplaintCategory;

  @Column({ type: 'varchar', length: 150 })
  subject: string;

  @Column({ type: 'text' })
  description: string;

  @Column({
    name: 'concerned_name',
    type: 'varchar',
    length: 200,
    nullable: true,
  })
  concernedName: string | null;

  @Column({ type: 'varchar', length: 32, default: ComplaintStatus.NEW })
  status: ComplaintStatus;

  @Column({ type: 'varchar', length: 16, default: ComplaintPriority.NORMAL })
  priority: ComplaintPriority;

  @Column({ name: 'assigned_to_user_id', type: 'uuid', nullable: true })
  assignedToUserId: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assigned_to_user_id' })
  assignedTo: User | null;

  @Column({ name: 'registration_id', type: 'uuid', nullable: true })
  registrationId: string | null;

  @Column({ name: 'payment_id', type: 'uuid', nullable: true })
  paymentId: string | null;

  @Column({ name: 'session_id', type: 'uuid', nullable: true })
  sessionId: string | null;

  @Column({ name: 'certificate_id', type: 'uuid', nullable: true })
  certificateId: string | null;

  @Column({ type: 'text', nullable: true })
  resolution: string | null;

  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
  resolvedAt: Date | null;

  @Column({ name: 'closed_at', type: 'timestamptz', nullable: true })
  closedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
