import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RolesGuard } from '../auth/roles.guard';
import { AuditModule } from '../audit/audit.module';
import { Session } from '../sessions/entities/session.entity';
import { User } from '../users/entities/user.entity';
import { Registration } from './entities/registration.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { RegistrationsController } from './registrations.controller';
import { RegistrationsService } from './registrations.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Registration, Session, User]),
    NotificationsModule,
    AuditModule,
  ],
  controllers: [RegistrationsController],
  providers: [RegistrationsService, RolesGuard],
  exports: [RegistrationsService],
})
export class RegistrationsModule {}
