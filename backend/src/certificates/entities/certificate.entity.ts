import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Registration } from '../../registrations/entities/registration.entity';
import { User } from '../../users/entities/user.entity';

export enum CertificateType {
  CERTIFICATE = 'CERTIFICATE',
  DIPLOMA = 'DIPLOMA',
}

export enum CertificateStatus {
  ISSUED = 'ISSUED',
  ARCHIVED = 'ARCHIVED',
  REVOKED = 'REVOKED',
}

@Entity({ name: 'certificates' })
export class Certificate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 32, unique: true })
  number: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'registration_id', type: 'uuid', unique: true })
  registrationId: string;

  @ManyToOne(() => Registration, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'registration_id' })
  registration: Registration;

  @Column({ type: 'enum', enum: CertificateType })
  type: CertificateType;

  @Column({
    name: 'issued_at',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  issuedAt: Date;

  @Column({ name: 'completed_at', type: 'timestamptz' })
  completedAt: Date;

  @Column({
    type: 'enum',
    enum: CertificateStatus,
    default: CertificateStatus.ISSUED,
  })
  status: CertificateStatus;

  @Column({ name: 'file_url', type: 'varchar', length: 1024, nullable: true })
  fileUrl: string | null;

  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt: Date | null;

  @Column({ name: 'revocation_reason', type: 'text', nullable: true })
  revocationReason: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
