import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import type { AssistantLanguage } from './admin-assistant-tools.service';
import { AdminAssistantGeminiAdapter } from './admin-assistant-gemini.adapter';
import {
  AdminAssistantChatRequestDto,
  AdminAssistantChatResponseDto,
  AdminAssistantHistoryTurnDto,
} from './admin-assistant.dto';

const MAX_HISTORY_CHARACTERS = 8000;
const MAX_HISTORY_TURNS = 8;

function redactSensitiveText(value: string): string {
  return value
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[redacted]')
    .replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, '[redacted]')
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi, '[redacted]')
    .replace(/\+[\d\s().-]{7,}\d/g, '[redacted]')
    .replace(/(?<!\d)(?:\d[\s().-]?){8,}(?!\d)/g, (match) =>
      /^\d{4}-\d{2}-\d{2}$/.test(match)
        ? match
        : `[redacted]${/\s$/.test(match) ? ' ' : ''}`,
    );
}

@Injectable()
export class AdminAssistantService {
  private readonly logger = new Logger(AdminAssistantService.name);

  constructor(private readonly geminiAdapter: AdminAssistantGeminiAdapter) {}

  async chat(
    request: AdminAssistantChatRequestDto,
  ): Promise<AdminAssistantChatResponseDto> {
    const message = redactSensitiveText(request.message.trim());
    const history = this.validateHistory(request.history ?? []);
    const language: AssistantLanguage = request.language ?? 'fr';
    const response = await this.geminiAdapter.generate({
      message,
      history,
      language,
    });

    const dto = plainToInstance(AdminAssistantChatResponseDto, response);
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
    });
    if (errors.length > 0) {
      throw new ServiceUnavailableException(
        'Admin assistant response is unavailable',
      );
    }

    this.logger.log(
      `Admin assistant answer generated from ${response.dataSources.length} analytics tools.`,
    );
    return dto;
  }

  private validateHistory(
    history: AdminAssistantHistoryTurnDto[],
  ): { role: 'user' | 'assistant'; content: string }[] {
    if (!Array.isArray(history) || history.length > MAX_HISTORY_TURNS) {
      throw new BadRequestException('Conversation history is invalid');
    }
    let totalCharacters = 0;
    let previousRole: 'user' | 'assistant' | undefined;
    const sanitized = history.map(({ role, content }) => {
      if (
        (role !== 'user' && role !== 'assistant') ||
        typeof content !== 'string' ||
        !content.trim() ||
        content.length > 2000 ||
        role === previousRole
      ) {
        throw new BadRequestException('Conversation history is invalid');
      }
      previousRole = role;
      const sanitizedContent = redactSensitiveText(content.trim());
      totalCharacters += sanitizedContent.length;
      return { role, content: sanitizedContent };
    });
    if (
      totalCharacters > MAX_HISTORY_CHARACTERS ||
      (sanitized.length > 0 && sanitized[sanitized.length - 1].role !== 'assistant')
    ) {
      throw new BadRequestException('Conversation history is invalid');
    }
    return sanitized;
  }
}
