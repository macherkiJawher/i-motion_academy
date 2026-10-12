import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class AdminAssistantHistoryTurnDto {
  @IsIn(['user', 'assistant'])
  role: 'user' | 'assistant';

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  content: string;
}

export class AdminAssistantChatRequestDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  message: string;

  @IsOptional()
  @IsIn(['fr', 'ar', 'ar-TN', 'aeb-Latn'])
  language?: 'fr' | 'ar' | 'ar-TN' | 'aeb-Latn';

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(8)
  @ValidateNested({ each: true })
  @Type(() => AdminAssistantHistoryTurnDto)
  history?: AdminAssistantHistoryTurnDto[];
}

export class AdminAssistantRecommendationDto {
  @IsString()
  @Length(1, 120)
  title: string;

  @IsString()
  @Length(1, 500)
  observedFinding: string;

  @IsString()
  @Length(1, 500)
  measuredEvidence: string;

  @IsString()
  @Length(1, 500)
  proposedAction: string;
}

export class AdminAssistantPeriodDto {
  @IsIn(['current_snapshot', 'date_range', 'mixed', 'not_requested'])
  type: 'current_snapshot' | 'date_range' | 'mixed' | 'not_requested';

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  startDate: string | null;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  endDate: string | null;
}

export class AdminAssistantChatResponseDto {
  @IsString()
  @Length(1, 3000)
  answer: string;

  @IsString()
  @IsIn(['fr', 'ar', 'ar-TN', 'aeb-Latn'])
  language: 'fr' | 'ar' | 'ar-TN' | 'aeb-Latn';

  @IsArray()
  @ArrayMaxSize(4)
  @IsString({ each: true })
  dataSources: string[];

  @ValidateNested()
  @Type(() => AdminAssistantPeriodDto)
  period: AdminAssistantPeriodDto;

  @IsArray()
  @ArrayMaxSize(24)
  @IsString({ each: true })
  missingData: string[];

  @IsArray()
  @ArrayMaxSize(3)
  @ValidateNested({ each: true })
  @Type(() => AdminAssistantRecommendationDto)
  recommendations: AdminAssistantRecommendationDto[];
}
