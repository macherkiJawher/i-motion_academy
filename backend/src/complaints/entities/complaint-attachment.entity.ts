import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Complaint } from './complaint.entity';
import { User } from '../../users/entities/user.entity';

@Entity({ name: 'complaint_attachments' })
export class ComplaintAttachment {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'complaint_id', type: 'uuid' }) complaintId: string;
  @ManyToOne(() => Complaint, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'complaint_id' })
  complaint: Complaint;
  @Column({ name: 'uploaded_by_id', type: 'uuid' }) uploadedById: string;
  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'uploaded_by_id' })
  uploadedBy: User;
  @Column({ name: 'original_name', type: 'varchar', length: 255 })
  originalName: string;
  @Column({ name: 'storage_name', type: 'varchar', length: 255 })
  storageName: string;
  @Column({ name: 'mime_type', type: 'varchar', length: 100 }) mimeType: string;
  @Column({ name: 'size_bytes', type: 'integer' }) sizeBytes: number;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
}
