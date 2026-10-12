import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MinLength,
} from 'class-validator';
import { ComplaintCategory } from '../entities/complaint.entity';

export class CreateComplaintDto {
  @IsEnum(ComplaintCategory)
  category: ComplaintCategory;

  @IsString()
  @Length(10, 150)
  subject: string;

  @IsString()
  @MinLength(30)
  description: string;

  @IsOptional()
  @IsString()
  @Length(2, 200)
  concernedName?: string;

  @IsOptional() @IsUUID() registrationId?: string;
  @IsOptional() @IsUUID() paymentId?: string;
  @IsOptional() @IsUUID() sessionId?: string;
  @IsOptional() @IsUUID() certificateId?: string;
}
