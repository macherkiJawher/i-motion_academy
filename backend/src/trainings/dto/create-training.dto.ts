import {
  IsArray,
  ArrayMaxSize,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Matches,
  Min,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import {
  ApprovalStatus,
  AxisCode,
  RecognitionType,
  TrainingDurationUnit,
  TrainingLifecycleStatus,
  TrainingLevel,
} from '../entities/training.entity';

const trimString = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export const MIN_TRAINING_DESCRIPTION_LENGTH = 100;

export class TrainingProgramModuleDto {
  @Transform(trimString)
  @IsString()
  @Length(1, 160)
  title: string;

  @Transform(trimString)
  @IsString()
  @Length(1, 2000)
  detail: string;

  @Transform(({ value }) =>
    value === '' || value === null || value === undefined
      ? null
      : Number(value),
  )
  @IsOptional()
  @IsInt()
  @Min(1)
  hours?: number | null;
}

export class CreateTrainingDto {
  @Transform(trimString)
  @IsString()
  @Length(1, 200)
  title: string;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @Length(1, 180)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug?: string;

  @IsEnum(AxisCode)
  axisCode: AxisCode;

  @IsOptional()
  @IsString()
  @Length(0, 120)
  subcategory?: string;

  @IsOptional()
  @IsEnum(RecognitionType)
  recognitionType?: RecognitionType;

  @IsOptional()
  @IsEnum(ApprovalStatus)
  approvalStatus?: ApprovalStatus;

  @IsOptional()
  @IsString()
  @Length(1, 200)
  approvalReference?: string | null;

  @IsOptional()
  @IsString()
  @Length(1, 200)
  approvalAuthority?: string | null;

  @IsOptional()
  @IsDateString()
  approvalValidUntil?: string | null;

  @IsOptional()
  @IsEnum(TrainingLifecycleStatus)
  lifecycleStatus?: TrainingLifecycleStatus;

  @Transform(trimString)
  @IsOptional()
  @IsString()
  @Length(0, 300)
  tagline?: string;

  @IsOptional()
  @IsString()
  @Transform(trimString)
  @Length(MIN_TRAINING_DESCRIPTION_LENGTH, 10000)
  description?: string;

  @IsEnum(TrainingLevel)
  level: TrainingLevel;

  @Transform(({ value }) =>
    value === '' || value === null || value === undefined
      ? null
      : Number(value),
  )
  @IsOptional()
  @IsInt()
  @Min(1)
  durationHours?: number | null;

  @Transform(({ value }) =>
    value === '' || value === null || value === undefined
      ? undefined
      : Number(value),
  )
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  durationValue?: number;

  @IsOptional()
  @IsEnum(TrainingDurationUnit)
  durationUnit?: TrainingDurationUnit;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price: number;

  @IsOptional()
  @IsString()
  @IsIn(['TND'])
  currency?: string;

  @IsOptional()
  @IsString()
  certification?: string | null;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @Length(1, 200)
  credentialTitle?: string | null;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @Length(1, 200)
  credentialIssuer?: string | null;

  @IsOptional()
  @IsString()
  targetAudience?: string;

  @IsOptional()
  @IsString()
  prerequisites?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  skills?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => TrainingProgramModuleDto)
  program?: TrainingProgramModuleDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  objectives?: string[];

  @IsOptional()
  @IsString()
  @IsUrl()
  coverUrl?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  rating?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  learners?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
