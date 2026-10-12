import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RolesGuard } from '../auth/roles.guard';
import { AuditModule } from '../audit/audit.module';
import { Registration } from '../registrations/entities/registration.entity';
import { RegistrationsModule } from '../registrations/registrations.module';
import { User } from '../users/entities/user.entity';
import { Payment } from './entities/payment.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, Registration, User]),
    RegistrationsModule,
    NotificationsModule,
    AuditModule,
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService, RolesGuard],
})
export class PaymentsModule {}
