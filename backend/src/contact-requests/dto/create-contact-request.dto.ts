import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';

const trimString = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class CreateContactRequestDto {
  @Transform(trimString)
  @IsString()
  @Length(1, 80)
  firstName: string;

  @Transform(trimString)
  @IsString()
  @Length(1, 80)
  lastName: string;

  @Transform(trimString)
  @IsEmail()
  @MaxLength(160)
  email: string;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(30)
  phone?: string | null;

  @Transform(trimString)
  @IsString()
  @Length(1, 140)
  subject: string;

  @Transform(trimString)
  @IsString()
  @Length(1, 1000)
  message: string;
}
