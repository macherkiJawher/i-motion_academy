import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RolesGuard } from '../auth/roles.guard';
import { AuditModule } from '../audit/audit.module';
import { Training } from '../trainings/entities/training.entity';
import { Session } from './entities/session.entity';
import { Location } from '../locations/entities/location.entity';
import { Trainer } from '../trainers/entities/trainer.entity';
import { Registration } from '../registrations/entities/registration.entity';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Session,
      Training,
      Trainer,
      Location,
      Registration,
    ]),
    AuditModule,
  ],
  controllers: [SessionsController],
  providers: [SessionsService, RolesGuard],
  exports: [SessionsService],
})
export class SessionsModule {}
