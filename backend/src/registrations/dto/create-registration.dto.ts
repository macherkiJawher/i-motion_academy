import { IsEmail, IsOptional, IsString, IsUUID, Length } from 'class-validator';

export class CreateRegistrationDto {
  @IsUUID()
  sessionId: string;

  @IsString()
  @Length(1, 100)
  firstName: string;

  @IsString()
  @Length(1, 100)
  lastName: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  @Length(0, 40)
  phone?: string;

  @IsOptional()
  @IsString()
  birthDate?: string;

  @IsOptional()
  @IsString()
  @Length(0, 300)
  address?: string;

  @IsOptional()
  @IsString()
  @Length(0, 120)
  city?: string;

  @IsOptional()
  @IsString()
  @Length(0, 120)
  country?: string;

  @IsOptional()
  @IsString()
  @Length(0, 160)
  educationLevel?: string;

  @IsOptional()
  @IsString()
  workExperience?: string;

  @IsOptional()
  @IsString()
  @Length(0, 160)
  employmentStatus?: string;

  @IsOptional()
  @IsString()
  @Length(0, 1024)
  identityDocument?: string;

  @IsOptional()
  @IsString()
  @Length(0, 1024)
  qualificationDocument?: string;

  @IsOptional()
  @IsString()
  motivation?: string;

  @IsOptional()
  @IsString()
  @Length(0, 80)
  referralSource?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
