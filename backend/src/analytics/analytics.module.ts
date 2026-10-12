import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { Registration } from '../registrations/entities/registration.entity';
import { Payment } from '../payments/entities/payment.entity';
import { Session } from '../sessions/entities/session.entity';
import { User } from '../users/entities/user.entity';
import { Certificate } from '../certificates/entities/certificate.entity';
import { Training } from '../trainings/entities/training.entity';
import { Feedback } from '../feedback/entities/feedback.entity';
import { Trainer } from '../trainers/entities/trainer.entity';
import { Location } from '../locations/entities/location.entity';
import { RolesGuard } from '../auth/roles.guard';
import { AdminAssistantContextService } from './admin-assistant-context.service';
import { ContactRequest } from '../contact-requests/entities/contact-request.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Registration,
      Payment,
      Session,
      User,
      Certificate,
      Training,
      Feedback,
      Trainer,
      Location,
      ContactRequest,
    ]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, AdminAssistantContextService, RolesGuard],
  exports: [AnalyticsService, AdminAssistantContextService],
})
export class AnalyticsModule {}
