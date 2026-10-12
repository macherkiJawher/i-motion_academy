import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RolesGuard } from '../auth/roles.guard';
import { AuditModule } from '../audit/audit.module';
import { Training } from './entities/training.entity';
import { TrainingsController } from './trainings.controller';
import { TrainingsService } from './trainings.service';

@Module({
  imports: [TypeOrmModule.forFeature([Training]), AuditModule],
  controllers: [TrainingsController],
  providers: [TrainingsService, RolesGuard],
  exports: [TrainingsService],
})
export class TrainingsModule {}
