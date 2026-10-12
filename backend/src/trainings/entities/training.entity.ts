import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum AxisCode {
  EMS = 'EMS',
  LANGUAGES = 'LANGUAGES',
  MANAGEMENT = 'MANAGEMENT',
  AI = 'AI',
  SPORT_COACHING = 'SPORT_COACHING',
  WELLNESS = 'WELLNESS',
  BTP = 'BTP',
  BTS = 'BTS',
}

export enum RecognitionType {
  NONE = 'NONE',
  I_MOTION_CERTIFICATE = 'I_MOTION_CERTIFICATE',
  BTP_DIPLOMA = 'BTP_DIPLOMA',
  BTS_DIPLOMA = 'BTS_DIPLOMA',
}

export enum ApprovalStatus {
  NOT_APPLICABLE = 'NOT_APPLICABLE',
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
}

export enum TrainingLifecycleStatus {
  DRAFT = 'DRAFT',
  IN_REVIEW = 'IN_REVIEW',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

export enum TrainingDurationUnit {
  HOURS = 'HOURS',
  DAYS = 'DAYS',
  WEEKS = 'WEEKS',
  MONTHS = 'MONTHS',
  YEARS = 'YEARS',
}

export enum TrainingLevel {
  FOUNDATION = 'Foundation',
  ADVANCED = 'Advanced',
  MASTER = 'Master',
}

@Entity({ name: 'trainings' })
export class Training {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 180, unique: true })
  slug: string;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ name: 'axis_code', type: 'enum', enum: AxisCode })
  axisCode: AxisCode;

  @Column({ type: 'varchar', length: 120, default: '' })
  subcategory: string;

  @Column({
    name: 'recognition_type',
    type: 'enum',
    enum: RecognitionType,
    default: RecognitionType.NONE,
  })
  recognitionType: RecognitionType;

  @Column({
    name: 'approval_status',
    type: 'enum',
    enum: ApprovalStatus,
    default: ApprovalStatus.NOT_APPLICABLE,
  })
  approvalStatus: ApprovalStatus;

  @Column({
    name: 'approval_reference',
    type: 'varchar',
    length: 200,
    nullable: true,
  })
  approvalReference: string | null;

  @Column({
    name: 'approval_authority',
    type: 'varchar',
    length: 200,
    nullable: true,
  })
  approvalAuthority: string | null;

  @Column({ name: 'approval_valid_until', type: 'date', nullable: true })
  approvalValidUntil: string | null;

  @Column({
    name: 'lifecycle_status',
    type: 'enum',
    enum: TrainingLifecycleStatus,
    enumName: 'training_lifecycle_status',
    default: TrainingLifecycleStatus.DRAFT,
  })
  lifecycleStatus: TrainingLifecycleStatus;

  @Column({ type: 'varchar', length: 300, default: '' })
  tagline: string;

  @Column({ type: 'text', default: '' })
  description: string;

  @Column({
    type: 'enum',
    enum: TrainingLevel,
    default: TrainingLevel.FOUNDATION,
  })
  level: TrainingLevel;

  @Column({ name: 'duration_hours', type: 'integer', nullable: true })
  durationHours: number | null;

  @Column({ name: 'duration_value', type: 'double precision' })
  durationValue: number;

  @Column({
    name: 'duration_unit',
    type: 'enum',
    enum: TrainingDurationUnit,
    enumName: 'training_duration_unit',
    default: TrainingDurationUnit.HOURS,
  })
  durationUnit: TrainingDurationUnit;

  @Column({ type: 'double precision' })
  price: number;

  @Column({ type: 'varchar', length: 3, default: 'EUR' })
  currency: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  certification: string | null;

  @Column({
    name: 'credential_title',
    type: 'varchar',
    length: 200,
    nullable: true,
  })
  credentialTitle: string | null;

  @Column({
    name: 'credential_issuer',
    type: 'varchar',
    length: 200,
    nullable: true,
  })
  credentialIssuer: string | null;

  @Column({ name: 'target_audience', type: 'text', default: '' })
  targetAudience: string;

  @Column({ type: 'text', default: '' })
  prerequisites: string;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  skills: string[];

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  objectives: string[];

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  program: { title: string; detail: string; hours?: number | null }[];

  @Column({ name: 'cover_url', type: 'varchar', length: 1024, default: '' })
  coverUrl: string;

  @Column({ type: 'double precision', default: 0 })
  rating: number;

  @Column({ type: 'integer', default: 0 })
  learners: number;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
