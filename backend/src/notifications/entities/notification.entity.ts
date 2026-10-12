import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum NotificationType {
  REGISTRATION_RECEIVED = 'REGISTRATION_RECEIVED',
  REGISTRATION_CONFIRMED = 'REGISTRATION_CONFIRMED',
  PAYMENT = 'PAYMENT',
  SESSION_REMINDER = 'SESSION_REMINDER',
  CERTIFICATE_AVAILABLE = 'CERTIFICATE_AVAILABLE',
  SYSTEM = 'SYSTEM',
}

@Entity({ name: 'notifications' })
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'enum', enum: NotificationType })
  type: NotificationType;

  @Column({ type: 'varchar', length: 180 })
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'boolean', default: false })
  read: boolean;

  @Column({ type: 'varchar', length: 1024, nullable: true })
  link: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
