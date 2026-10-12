import {
  IsEmail,
  IsEnum,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { LocationType } from '../entities/location.entity';

const trimString = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

const transformCoordinate = ({ value }: { value: unknown }): unknown => {
  if (value === '' || value === null || value === undefined) return null;
  return typeof value === 'number' ? value : Number(value);
};

export class CreateLocationDto {
  @Transform(trimString)
  @IsString()
  @Length(1, 180)
  name: string;

  @IsEnum(LocationType)
  type: LocationType;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @Length(0, 120)
  city?: string;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @Length(0, 120)
  country?: string;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @Length(0, 300)
  address?: string;

  @IsOptional()
  @Transform(transformCoordinate)
  @IsNumber({ maxDecimalPlaces: 15 })
  @Min(-90)
  @Max(90)
  latitude?: number | null;

  @IsOptional()
  @Transform(transformCoordinate)
  @IsNumber({ maxDecimalPlaces: 15 })
  @Min(-180)
  @Max(180)
  longitude?: number | null;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @Length(0, 160)
  contactName?: string | null;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @Length(0, 40)
  contactPhone?: string | null;

  @IsOptional()
  @Transform(trimString)
  @IsEmail()
  @Length(1, 200)
  contactEmail?: string | null;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @Length(0, 5000)
  instructions?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
