import {
  IsDateString,
  IsEmail,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

export class UpdateOwnRegistrationDto {
  @IsOptional()
  @IsString()
  @Length(1, 200)
  participantName?: string;

  @IsOptional()
  @IsEmail()
  @Length(1, 200)
  participantEmail?: string;

  @IsOptional()
  @IsString()
  @Length(0, 40)
  phone?: string | null;

  @IsOptional()
  @IsDateString()
  birthDate?: string | null;

  @IsOptional()
  @IsString()
  @Length(0, 300)
  address?: string | null;

  @IsOptional()
  @IsString()
  @Length(0, 120)
  city?: string | null;

  @IsOptional()
  @IsString()
  @Length(0, 120)
  country?: string | null;

  @IsOptional()
  @IsString()
  @Length(0, 160)
  educationLevel?: string | null;

  @IsOptional()
  @IsString()
  workExperience?: string | null;

  @IsOptional()
  @IsString()
  @Length(0, 160)
  employmentStatus?: string | null;

  @IsOptional()
  @IsString()
  motivation?: string | null;

  @IsOptional()
  @IsString()
  @Length(0, 80)
  referralSource?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;
}
