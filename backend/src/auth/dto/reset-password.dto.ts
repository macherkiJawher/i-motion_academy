import { IsString, Length, MaxLength } from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  @Length(43, 43)
  token: string;

  @IsString()
  @Length(8, 72)
  @MaxLength(72)
  password: string;
}
