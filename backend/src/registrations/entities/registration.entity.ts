import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Session } from '../../sessions/entities/session.entity';
import { User } from '../../users/entities/user.entity';

export enum RegistrationStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PARTIAL = 'PARTIAL',
  PAID = 'PAID',
  FAILED = 'FAILED',
}

@Entity({ name: 'registrations' })
export class Registration {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 32, unique: true })
  reference: string;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  @Column({ name: 'participant_name', type: 'varchar', length: 200 })
  participantName: string;

  @Column({ name: 'participant_email', type: 'varchar', length: 200 })
  participantEmail: string;

  @Column({ type: 'varchar', length: 40, nullable: true })
  phone: string | null;

  @Column({ name: 'birth_date', type: 'date', nullable: true })
  birthDate: string | null;

  @Column({ type: 'varchar', length: 300, nullable: true })
  address: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  city: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  country: string | null;

  @Column({
    name: 'education_level',
    type: 'varchar',
    length: 160,
    nullable: true,
  })
  educationLevel: string | null;

  @Column({ name: 'work_experience', type: 'text', nullable: true })
  workExperience: string | null;

  @Column({
    name: 'employment_status',
    type: 'varchar',
    length: 160,
    nullable: true,
  })
  employmentStatus: string | null;

  @Column({
    name: 'identity_document',
    type: 'varchar',
    length: 1024,
    nullable: true,
  })
  identityDocument: string | null;

  @Column({
    name: 'qualification_document',
    type: 'varchar',
    length: 1024,
    nullable: true,
  })
  qualificationDocument: string | null;

  @Column({ type: 'text', nullable: true })
  motivation: string | null;

  @Column({
    name: 'referral_source',
    type: 'varchar',
    length: 80,
    nullable: true,
  })
  referralSource: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'session_id', type: 'uuid' })
  sessionId: string;

  @ManyToOne(() => Session, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'session_id' })
  session: Session;

  @Column({
    type: 'enum',
    enum: RegistrationStatus,
    default: RegistrationStatus.PENDING,
  })
  status: RegistrationStatus;

  @Column({
    name: 'payment_status',
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  paymentStatus: PaymentStatus;

  @Column({ name: 'amount_due', type: 'double precision', default: 0 })
  amountDue: number;

  @Column({ name: 'amount_paid', type: 'double precision', default: 0 })
  amountPaid: number;

  @Column({ type: 'varchar', length: 3, default: 'EUR' })
  currency: string;

  @Column({ name: 'certificate_id', type: 'uuid', nullable: true })
  certificateId: string | null;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
