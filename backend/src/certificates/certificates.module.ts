import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RolesGuard } from '../auth/roles.guard';
import { AuditModule } from '../audit/audit.module';
import { RegistrationsModule } from '../registrations/registrations.module';
import { Registration } from '../registrations/entities/registration.entity';
import { User } from '../users/entities/user.entity';
import { Certificate } from './entities/certificate.entity';
import { CertificateAudit } from './entities/certificate-audit.entity';
import { CertificatesController } from './certificates.controller';
import { CertificatesService } from './certificates.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Certificate,
      CertificateAudit,
      Registration,
      User,
    ]),
    RegistrationsModule,
    NotificationsModule,
    AuditModule,
  ],
  controllers: [CertificatesController],
  providers: [CertificatesService, RolesGuard],
})
export class CertificatesModule {}
