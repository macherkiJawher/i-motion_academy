import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Session } from '../../sessions/entities/session.entity';
import { Training } from '../../trainings/entities/training.entity';
import { User } from '../../users/entities/user.entity';

@Entity({ name: 'trainers' })
export class Trainer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid', nullable: true, unique: true })
  userId: string | null;

  @OneToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  @Column({ type: 'varchar', length: 180, unique: true })
  slug: string;

  @Column({ name: 'first_name', type: 'varchar', length: 100 })
  firstName: string;

  @Column({ name: 'last_name', type: 'varchar', length: 100 })
  lastName: string;

  @Column({ type: 'varchar', length: 200 })
  email: string;

  @Column({ type: 'varchar', length: 40, nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', length: 160 })
  speciality: string;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  expertise: string[];

  @Column({ type: 'text', default: '' })
  biography: string;

  @Column({ name: 'photo_url', type: 'varchar', length: 1024, default: '' })
  photoUrl: string;

  @Column({ name: 'years_experience', type: 'integer', default: 0 })
  yearsExperience: number;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @ManyToMany(() => Training)
  @JoinTable({
    name: 'trainer_trainings',
    joinColumn: { name: 'trainer_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'training_id', referencedColumnName: 'id' },
  })
  trainings: Training[];

  @ManyToMany(() => Session, (session) => session.trainers)
  sessions: Session[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
