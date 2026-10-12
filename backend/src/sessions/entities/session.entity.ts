import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Training } from '../../trainings/entities/training.entity';
import { Location } from '../../locations/entities/location.entity';
import { Trainer } from '../../trainers/entities/trainer.entity';

export enum SessionStatus {
  OPEN = 'OPEN',
  ALMOST_FULL = 'ALMOST_FULL',
  FULL = 'FULL',
  CLOSED = 'CLOSED',
}

export enum SessionLifecycleStatus {
  DRAFT = 'DRAFT',
  SCHEDULED = 'SCHEDULED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
}

export enum SessionMode {
  ON_SITE = 'On-site',
  HYBRID = 'Hybrid',
  LIVE_ONLINE = 'Live online',
}

@Entity({ name: 'sessions' })
export class Session {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'training_id', type: 'uuid' })
  trainingId: string;

  @ManyToOne(() => Training, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'training_id' })
  training: Training;

  @ManyToMany(() => Trainer, (trainer) => trainer.sessions)
  @JoinTable({
    name: 'session_trainers',
    joinColumn: { name: 'session_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'trainer_id', referencedColumnName: 'id' },
  })
  trainers: Trainer[];

  @ManyToMany(() => Location, (location) => location.sessions)
  @JoinTable({
    name: 'session_locations',
    joinColumn: { name: 'session_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'location_id', referencedColumnName: 'id' },
  })
  locations: Location[];

  @Column({ name: 'trainer_id', type: 'uuid', nullable: true })
  trainerId: string | null;

  @Column({ name: 'trainer_name', type: 'varchar', length: 200, default: '' })
  trainerName: string;

  @Column({ name: 'location_id', type: 'uuid', nullable: true })
  locationId: string | null;

  @Column({ name: 'location_name', type: 'varchar', length: 200, default: '' })
  locationName: string;

  @Column({ type: 'varchar', length: 120, default: '' })
  city: string;

  @Column({ type: 'varchar', length: 300, default: '' })
  address: string;

  @Column({ type: 'double precision', nullable: true })
  latitude: number | null;

  @Column({ type: 'double precision', nullable: true })
  longitude: number | null;

  @Column({ type: 'enum', enum: SessionMode })
  mode: SessionMode;

  @Column({ name: 'start_date', type: 'date' })
  startDate: string;

  @Column({ name: 'end_date', type: 'date' })
  endDate: string;

  @Column({ name: 'start_time', type: 'time', default: '09:00' })
  startTime: string;

  @Column({ name: 'end_time', type: 'time', default: '17:00' })
  endTime: string;

  @Column({
    name: 'meeting_url',
    type: 'varchar',
    length: 1000,
    nullable: true,
  })
  meetingUrl: string | null;

  @Column({ name: 'schedule_details', type: 'text', nullable: true })
  scheduleDetails: string | null;

  @Column({ type: 'integer' })
  capacity: number;

  @Column({ name: 'seats_taken', type: 'integer', default: 0 })
  seatsTaken: number;

  @Column({ type: 'enum', enum: SessionStatus, default: SessionStatus.OPEN })
  status: SessionStatus;

  @Column({
    name: 'lifecycle_status',
    type: 'enum',
    enum: SessionLifecycleStatus,
    default: SessionLifecycleStatus.SCHEDULED,
  })
  lifecycleStatus: SessionLifecycleStatus;

  @Column({ type: 'double precision' })
  price: number;

  @Column({ type: 'varchar', length: 3, default: 'EUR' })
  currency: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  certification: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
