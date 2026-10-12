import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateComplaintMessageDto {
  @IsString()
  @MinLength(1)
  content: string;

  @IsOptional()
  @IsBoolean()
  internal?: boolean;
}
