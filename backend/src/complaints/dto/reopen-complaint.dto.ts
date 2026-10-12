import { IsString, MaxLength, MinLength } from 'class-validator';

export class ReopenComplaintDto {
  @IsString()
  @MinLength(10)
  @MaxLength(500)
  justification: string;
}
