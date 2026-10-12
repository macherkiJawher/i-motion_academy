import { Body, Controller, Post, UseGuards, UsePipes } from '@nestjs/common';
import { PublicAssistantChatRequestDto } from './dto/public-assistant-chat.dto';
import { PublicAssistantService } from './public-assistant.service';
import { PublicAssistantRateLimitGuard } from './public-assistant-rate-limit.guard';
import { PublicAssistantValidationPipe } from './public-assistant-validation.pipe';

@Controller('assistant/public')
@UseGuards(PublicAssistantRateLimitGuard)
export class PublicAssistantController {
  constructor(private readonly assistant: PublicAssistantService) {}

  @Post('chat')
  @UsePipes(new PublicAssistantValidationPipe())
  chat(@Body() request: PublicAssistantChatRequestDto) {
    return this.assistant.chat(request);
  }
}
