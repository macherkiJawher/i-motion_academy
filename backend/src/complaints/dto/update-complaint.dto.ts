import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';
import {
  ComplaintCategory,
  ComplaintPriority,
  ComplaintStatus,
} from '../entities/complaint.entity';

export class UpdateComplaintDto {
  @IsOptional() @IsEnum(ComplaintCategory) category?: ComplaintCategory;
  @IsOptional() @IsEnum(ComplaintPriority) priority?: ComplaintPriority;
  @IsOptional() @IsEnum(ComplaintStatus) status?: ComplaintStatus;
  @IsOptional() @IsUUID() assignedToUserId?: string | null;
  @IsOptional() @IsString() @MinLength(3) resolution?: string;
}
