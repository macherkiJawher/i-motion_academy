import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Registration } from '../../registrations/entities/registration.entity';
import { User } from '../../users/entities/user.entity';
import { Session } from '../../sessions/entities/session.entity';

export enum FeedbackType {
  TRAINING = 'TRAINING',
  TRAINER = 'TRAINER',
  LOGISTICS = 'LOGISTICS',
  CONTENT = 'CONTENT',
}

@Entity({ name: 'feedback' })
export class Feedback {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'registration_id', type: 'uuid' })
  registrationId: string;

  @ManyToOne(() => Registration, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'registration_id' })
  registration: Registration;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'session_id', type: 'uuid' })
  sessionId: string;

  @ManyToOne(() => Session, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'session_id' })
  session: Session;

  @Column({ type: 'integer' })
  rating: number; // 1-5

  @Column({ type: 'text', nullable: true })
  comment: string;

  @Column({
    name: 'feedback_type',
    type: 'varchar',
    length: 32,
    default: FeedbackType.TRAINING,
  })
  feedbackType: FeedbackType;

  @Column({ name: 'is_published', type: 'boolean', default: false })
  isPublished: boolean; // Admin approval

  @Column({ name: 'is_featured', type: 'boolean', default: false })
  isFeatured: boolean; // Admin star for home

  @Column({ name: 'contains_bad_words', type: 'boolean', default: false })
  containsBadWords: boolean; // Flag if bad words detected

  @Column({
    name: 'flagged_reason',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  flaggedReason: string; // Why flagged (if bad words)

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
