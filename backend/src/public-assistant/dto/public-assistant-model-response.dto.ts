import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  PublicAssistantIntent,
  PublicAssistantLanguage,
} from '../public-assistant.types';

export class PublicAssistantModelResponseDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  answer?: string;

  @IsEnum(PublicAssistantIntent)
  intent: PublicAssistantIntent;

  @IsIn(Object.values(PublicAssistantLanguage))
  language: PublicAssistantLanguage;

  @IsBoolean()
  needsClarification: boolean;

  @IsArray()
  @ArrayMaxSize(5)
  @IsString({ each: true })
  @MinLength(1, { each: true })
  @MaxLength(64, { each: true })
  referenceIds: string[];
}
