import { IsInt, IsOptional, IsString, Max, Min, IsEnum } from 'class-validator';
import { FeedbackType } from '../entities/feedback.entity';

export class UpdateFeedbackDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @IsOptional()
  @IsString()
  comment?: string;

  @IsOptional()
  @IsEnum(FeedbackType)
  feedbackType?: FeedbackType;
}
