import { Transform, Type } from 'class-transformer';
import { BadRequestException } from '@nestjs/common';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
  MinLength,
  Validate,
  ValidateNested,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import {
  PublicAssistantIntent,
  PublicAssistantLanguage,
  PublicAssistantReference,
} from '../public-assistant.types';

const requestProperties = ['message', 'history'];

function rejectUnknownKeys(value: unknown, allowed: string[]): unknown {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    const unknownKeys = Object.keys(value).filter(
      (key) => !allowed.includes(key),
    );
    if (unknownKeys.length > 0) {
      throw new BadRequestException(
        `Unknown assistant request property: ${unknownKeys[0]}`,
      );
    }
  }
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function trimRequestField(
  value: unknown,
  source: unknown,
  allowed: string[],
): unknown {
  rejectUnknownKeys(source, allowed);
  return typeof value === 'string' ? value.trim() : value;
}

@ValidatorConstraint({ name: 'validAssistantHistory', async: false })
class ValidAssistantHistoryConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (value === undefined) return true;
    if (!Array.isArray(value)) return false;
    if (
      value.reduce((total: number, item: unknown) => {
        if (!isRecord(item)) return total;
        const content = item.content;
        return total + (typeof content === 'string' ? content.length : 0);
      }, 0) > 2400
    ) {
      return false;
    }
    return (
      value.length === 0 ||
      (isRecord(value[0]) &&
        value[0].role === 'user' &&
        value.every(
          (item: unknown, index: number) =>
            isRecord(item) &&
            item.role === (index % 2 === 0 ? 'user' : 'assistant'),
        ) &&
        value.length % 2 === 0)
    );
  }

  defaultMessage(): string {
    return 'History must contain complete alternating exchanges and at most 2400 characters';
  }
}

export class PublicAssistantHistoryMessageDto {
  @Transform(({ value, obj }) =>
    trimRequestField(value, obj, ['role', 'content']),
  )
  @IsString()
  @MinLength(1)
  @MaxLength(800)
  content: string;

  @IsIn(['user', 'assistant'])
  role: 'user' | 'assistant';
}

export class PublicAssistantChatRequestDto {
  @Transform(({ value, obj }) =>
    trimRequestField(value, obj, requestProperties),
  )
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  message: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(6)
  @Validate(ValidAssistantHistoryConstraint)
  @ValidateNested({ each: true })
  @Type(() => PublicAssistantHistoryMessageDto)
  history?: PublicAssistantHistoryMessageDto[];
}

export class PublicAssistantPriceDto {
  @IsNumber()
  @Min(0)
  amount: number;

  @IsString()
  @MinLength(3)
  @MaxLength(3)
  currency: string;
}

export class PublicAssistantDurationDto {
  @IsNumber()
  @Min(0)
  value: number;

  @IsString()
  @MinLength(1)
  unit: string;
}

export class PublicAssistantRecognitionDto {
  @IsString()
  @MinLength(1)
  type: string;

  @IsOptional()
  @IsString()
  title: string | null;

  @IsString()
  @MinLength(1)
  approvalStatus: string;

  @IsOptional()
  @IsString()
  validUntil: string | null;
}

export class PublicAssistantTrainingReferenceDto {
  @IsIn(['training'])
  type: 'training';

  @IsUUID()
  @MinLength(1)
  id: string;

  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  @MinLength(1)
  slug: string;

  @IsString()
  @MinLength(1)
  title: string;

  @Matches(/^\/trainings\/[a-z0-9]+(?:-[a-z0-9]+)*$/)
  href: string;

  @ValidateNested()
  @Type(() => PublicAssistantPriceDto)
  price: PublicAssistantPriceDto;

  @ValidateNested()
  @Type(() => PublicAssistantDurationDto)
  duration: PublicAssistantDurationDto;

  @ValidateNested()
  @Type(() => PublicAssistantRecognitionDto)
  recognition: PublicAssistantRecognitionDto;
}

export class PublicAssistantSessionReferenceDto {
  @IsIn(['session'])
  type: 'session';

  @IsUUID()
  id: string;

  @IsUUID()
  trainingId: string;

  @IsString()
  @MinLength(1)
  trainingSlug: string;

  @IsString()
  @MinLength(1)
  title: string;

  @Matches(
    /^\/sessions\/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  )
  href: string;

  @IsString()
  @MinLength(1)
  startDate: string;

  @IsString()
  @MinLength(1)
  endDate: string;

  @IsString()
  @MinLength(1)
  startTime: string;

  @IsString()
  @MinLength(1)
  endTime: string;

  @IsString()
  city: string;

  @IsString()
  @MinLength(1)
  mode: string;

  @IsInt()
  @Min(1)
  seatsRemaining: number;

  @ValidateNested()
  @Type(() => PublicAssistantPriceDto)
  price: PublicAssistantPriceDto;
}

export class PublicAssistantActionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  label: string;

  @IsIn(['/register', '/contact'])
  href: '/register' | '/contact';
}

export class PublicAssistantChatResponseDto {
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  answer: string;

  @IsEnum(PublicAssistantIntent)
  intent: PublicAssistantIntent;

  @IsEnum(PublicAssistantLanguage)
  language: PublicAssistantLanguage;

  @IsBoolean()
  needsClarification: boolean;

  @IsArray()
  @ArrayMaxSize(5)
  @ValidateNested({ each: true })
  @Type(() => PublicAssistantTrainingReferenceDto, {
    discriminator: {
      property: 'type',
      subTypes: [
        { name: 'training', value: PublicAssistantTrainingReferenceDto },
        { name: 'session', value: PublicAssistantSessionReferenceDto },
      ],
    },
    keepDiscriminatorProperty: true,
  })
  references: PublicAssistantReference[];

  @IsArray()
  @ArrayMaxSize(2)
  @ValidateNested({ each: true })
  @Type(() => PublicAssistantActionDto)
  actions: PublicAssistantActionDto[];

  @IsArray()
  @ArrayMaxSize(3)
  @IsString({ each: true })
  @MinLength(1, { each: true })
  @MaxLength(200, { each: true })
  suggestedQuestions: string[];
}
