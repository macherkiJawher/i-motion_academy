import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';

const trimString = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class CreateTrainerDto {
  @IsOptional()
  @IsUUID()
  userId?: string | null;

  @Transform(trimString)
  @IsString()
  @Length(1, 180)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug: string;

  @Transform(trimString)
  @IsString()
  @Length(1, 100)
  firstName: string;

  @Transform(trimString)
  @IsString()
  @Length(1, 100)
  lastName: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @Length(1, 200)
  email: string;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @Length(0, 40)
  phone?: string | null;

  @Transform(trimString)
  @IsString()
  @Length(1, 160)
  speciality: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ArrayUnique()
  @IsString({ each: true })
  expertise?: string[];

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @Length(0, 5000)
  biography?: string;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @Length(0, 1024)
  photoUrl?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  yearsExperience?: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ArrayUnique()
  @IsUUID('4', { each: true })
  trainingIds?: string[];

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
