import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Certificate } from '../certificates/entities/certificate.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuditModule } from '../audit/audit.module';
import { Payment } from '../payments/entities/payment.entity';
import { Registration } from '../registrations/entities/registration.entity';
import { Session } from '../sessions/entities/session.entity';
import { User } from '../users/entities/user.entity';
import {
  AdminComplaintsController,
  ComplaintsController,
} from './complaints.controller';
import { ComplaintsService } from './complaints.service';
import { Complaint } from './entities/complaint.entity';
import { ComplaintAttachment } from './entities/complaint-attachment.entity';
import { ComplaintEvent } from './entities/complaint-event.entity';
import { ComplaintMessage } from './entities/complaint-message.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Complaint,
      ComplaintMessage,
      ComplaintEvent,
      ComplaintAttachment,
      User,
      Registration,
      Payment,
      Session,
      Certificate,
    ]),
    NotificationsModule,
    AuditModule,
  ],
  controllers: [ComplaintsController, AdminComplaintsController],
  providers: [ComplaintsService],
  exports: [ComplaintsService],
})
export class ComplaintsModule {}
