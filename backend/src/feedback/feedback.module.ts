import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Feedback } from './entities/feedback.entity';
import { FeedbackService } from './services/feedback.service';
import { BadWordsService } from './services/bad-words.service';
import { FeedbackController } from './feedback.controller';
import { AdminFeedbackController } from './admin-feedback.controller';
import { Registration } from '../registrations/entities/registration.entity';
import { Session } from '../sessions/entities/session.entity';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Feedback, Registration, Session, User])],
  providers: [FeedbackService, BadWordsService],
  controllers: [FeedbackController, AdminFeedbackController],
  exports: [FeedbackService, BadWordsService],
})
export class FeedbackModule {}
