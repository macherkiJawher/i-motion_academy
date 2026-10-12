import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RolesGuard } from '../auth/roles.guard';
import { Training } from '../trainings/entities/training.entity';
import { User } from '../users/entities/user.entity';
import { Session } from '../sessions/entities/session.entity';
import { Trainer } from './entities/trainer.entity';
import { TrainersController } from './trainers.controller';
import { TrainersService } from './trainers.service';

@Module({
  imports: [TypeOrmModule.forFeature([Trainer, Training, User, Session])],
  controllers: [TrainersController],
  providers: [TrainersService, RolesGuard],
  exports: [TrainersService, TypeOrmModule],
})
export class TrainersModule {}
