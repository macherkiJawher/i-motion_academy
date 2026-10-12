import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Certificate } from './certificate.entity';

export enum CertificateAuditAction {
  ISSUED = 'ISSUED',
  ARCHIVED = 'ARCHIVED',
  REVOKED = 'REVOKED',
  DOWNLOADED = 'DOWNLOADED',
}

@Entity({ name: 'certificate_audits' })
export class CertificateAudit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'certificate_id', type: 'uuid' })
  certificateId: string;

  @ManyToOne(() => Certificate, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'certificate_id' })
  certificate: Certificate;

  @Column({ name: 'actor_user_id', type: 'uuid', nullable: true })
  actorUserId: string | null;

  @Column({ type: 'enum', enum: CertificateAuditAction })
  action: CertificateAuditAction;

  @Column({ type: 'text', nullable: true })
  details: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
