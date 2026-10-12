import { Module } from '@nestjs/common';
import { SessionsModule } from '../sessions/sessions.module';
import { TrainingsModule } from '../trainings/trainings.module';
import { PublicAssistantController } from './public-assistant.controller';
import { PublicAssistantRateLimitGuard } from './public-assistant-rate-limit.guard';
import { PublicAssistantService } from './public-assistant.service';
import { GeminiAdapter } from './gemini.adapter';

@Module({
  imports: [TrainingsModule, SessionsModule],
  controllers: [PublicAssistantController],
  providers: [
    PublicAssistantService,
    PublicAssistantRateLimitGuard,
    GeminiAdapter,
  ],
  exports: [PublicAssistantService],
})
export class PublicAssistantModule {}
