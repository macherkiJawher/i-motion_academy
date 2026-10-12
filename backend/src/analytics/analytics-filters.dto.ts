import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class AnalyticsFiltersDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsUUID()
  trainingId?: string;

  @IsOptional()
  @IsUUID()
  trainerId?: string;

  @IsOptional()
  @IsUUID()
  locationId?: string;
}
