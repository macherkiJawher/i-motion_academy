import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AnalyticsModule } from '../analytics/analytics.module';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { ComplaintsModule } from '../complaints/complaints.module';
import { AdminAssistantController } from './admin-assistant.controller';
import { AdminAssistantGeminiAdapter } from './admin-assistant-gemini.adapter';
import { AdminAssistantService } from './admin-assistant.service';
import { AdminAssistantToolsService } from './admin-assistant-tools.service';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    AuthModule,
    AnalyticsModule,
    AuditModule,
    ComplaintsModule,
  ],
  controllers: [AdminAssistantController],
  providers: [
    AdminAssistantService,
    AdminAssistantGeminiAdapter,
    AdminAssistantToolsService,
  ],
  exports: [AdminAssistantService],
})
export class AdminAssistantModule {}
