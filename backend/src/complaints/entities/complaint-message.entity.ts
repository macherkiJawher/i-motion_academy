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

export enum ComplaintMessageVisibility {
  PARTICIPANT = 'PARTICIPANT',
  INTERNAL = 'INTERNAL',
}

@Entity({ name: 'complaint_messages' })
export class ComplaintMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'complaint_id', type: 'uuid' })
  complaintId: string;

  @ManyToOne(() => Complaint, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'complaint_id' })
  complaint: Complaint;

  @Column({ name: 'author_id', type: 'uuid' })
  authorId: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'author_id' })
  author: User;

  @Column({ type: 'text' })
  content: string;

  @Column({
    type: 'varchar',
    length: 16,
    default: ComplaintMessageVisibility.PARTICIPANT,
  })
  visibility: ComplaintMessageVisibility;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
