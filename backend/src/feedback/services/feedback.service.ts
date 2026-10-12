import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { Feedback, FeedbackType } from '../entities/feedback.entity';
import {
  Registration,
  RegistrationStatus,
} from '../../registrations/entities/registration.entity';
import { Session } from '../../sessions/entities/session.entity';
import { User } from '../../users/entities/user.entity';
import { CreateFeedbackDto } from '../dto/create-feedback.dto';
import { UpdateFeedbackDto } from '../dto/update-feedback.dto';
import { BadWordsService, BadWordCheckResult } from './bad-words.service';

@Injectable()
export class FeedbackService {
  private readonly logger = new Logger(FeedbackService.name);

  constructor(
    @InjectRepository(Feedback)
    private feedbackRepository: Repository<Feedback>,
    @InjectRepository(Registration)
    private registrationRepository: Repository<Registration>,
    @InjectRepository(Session)
    private sessionRepository: Repository<Session>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private badWordsService: BadWordsService,
  ) {}

  /**
   * Create feedback (participant endpoint)
   */
  async createFeedback(
    userId: string,
    createFeedbackDto: CreateFeedbackDto,
  ): Promise<Feedback> {
    const { registrationId, rating, comment, feedbackType } = createFeedbackDto;

    // 1. Get registration
    const registration = await this.registrationRepository.findOne({
      where: { id: registrationId, userId },
      relations: ['session'],
    });

    if (!registration) {
      throw new UnauthorizedException('Registration not found or not yours');
    }

    // 2. Check if registration is completed
    if (registration.status !== RegistrationStatus.COMPLETED) {
      throw new BadRequestException(
        'Registration must be completed to submit feedback',
      );
    }

    // 3. A completed registration can receive feedback before or after the session end date.
    const session = registration.session;
    const sessionEndDate = new Date(session.endDate);
    const today = new Date();

    // 4. Check if feedback window has expired (> 30 days after the session end)
    const daysSinceEnd = Math.floor(
      (today.getTime() - sessionEndDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysSinceEnd > 30) {
      throw new BadRequestException(
        'Feedback window expired (30 days after session end)',
      );
    }

    // 5. Check for existing feedback
    const existingFeedback = await this.feedbackRepository.findOne({
      where: { registrationId, feedbackType },
    });

    if (existingFeedback) {
      throw new BadRequestException(
        `Feedback already submitted for this registration and type: ${feedbackType}`,
      );
    }

    // 6. Check for bad words
    const badWordsCheck = this.badWordsService.checkBadWords(comment || '');

    // 7. Create feedback
    const feedback = new Feedback();
    feedback.registrationId = registrationId;
    feedback.userId = userId;
    feedback.sessionId = registration.sessionId;
    feedback.rating = rating;
    feedback.comment = comment || '';
    feedback.feedbackType = feedbackType;
    feedback.containsBadWords = badWordsCheck.hasBadWords;
    feedback.flaggedReason = badWordsCheck.hasBadWords
      ? `Bad words detected: ${badWordsCheck.detectedWords.join(', ')}`
      : '';

    const saved = await this.feedbackRepository.save(feedback);
    this.logger.log(`Feedback created: ${saved.id} by user ${userId}`);

    return saved;
  }

  /**
   * Get feedback for a registration (participant view)
   */
  async getFeedbackByRegistration(
    registrationId: string,
    userId: string,
  ): Promise<Feedback | null> {
    const feedback = await this.feedbackRepository.findOne({
      where: { registrationId, userId },
      relations: ['registration', 'session', 'user'],
    });

    if (!feedback) {
      return null;
    }

    return feedback;
  }

  /**
   * Update feedback (only if within 7 days and not published)
   */
  async updateFeedback(
    feedbackId: string,
    userId: string,
    updateFeedbackDto: UpdateFeedbackDto,
  ): Promise<Feedback> {
    const feedback = await this.feedbackRepository.findOne({
      where: { id: feedbackId, userId },
      relations: ['registration', 'session'],
    });

    if (!feedback) {
      throw new NotFoundException('Feedback not found');
    }

    // Check if published (admin approved)
    if (feedback.isPublished) {
      throw new BadRequestException('Cannot modify published feedback');
    }

    // Check if within 7 days of creation
    const createdAt = new Date(feedback.createdAt);
    const today = new Date();
    const daysSinceCreated = Math.floor(
      (today.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysSinceCreated > 7) {
      throw new BadRequestException(
        'Can only modify feedback within 7 days of submission',
      );
    }

    // Update fields
    if (updateFeedbackDto.rating) {
      feedback.rating = updateFeedbackDto.rating;
    }

    if (updateFeedbackDto.comment !== undefined) {
      feedback.comment = updateFeedbackDto.comment || '';
    }

    if (updateFeedbackDto.feedbackType) {
      const existingFeedback = await this.feedbackRepository.findOne({
        where: {
          registrationId: feedback.registrationId,
          feedbackType: updateFeedbackDto.feedbackType,
          id: Not(feedback.id),
        },
      });

      if (existingFeedback) {
        throw new BadRequestException(
          `Feedback already submitted for this registration and type: ${updateFeedbackDto.feedbackType}`,
        );
      }
      feedback.feedbackType = updateFeedbackDto.feedbackType;
    }

    // Re-check for bad words
    const badWordsCheck = this.badWordsService.checkBadWords(
      feedback.comment || '',
    );
    feedback.containsBadWords = badWordsCheck.hasBadWords;
    feedback.flaggedReason = badWordsCheck.hasBadWords
      ? `Bad words detected: ${badWordsCheck.detectedWords.join(', ')}`
      : '';

    const updated = await this.feedbackRepository.save(feedback);
    this.logger.log(`Feedback updated: ${feedbackId}`);

    return updated;
  }

  /**
   * Check if feedback is available for a registration
   */
  async isFeedbackAvailable(
    registrationId: string,
    userId: string,
  ): Promise<{
    available: boolean;
    sessionEndDate?: Date;
    feedbackDeadline?: Date;
    reason?: string;
  }> {
    const registration = await this.registrationRepository.findOne({
      where: { id: registrationId, userId },
      relations: ['session'],
    });

    if (!registration) {
      return { available: false, reason: 'Registration not found' };
    }

    if (registration.status !== RegistrationStatus.COMPLETED) {
      return {
        available: false,
        reason: 'Registration must be completed',
      };
    }

    const sessionEndDate = new Date(registration.session.endDate);
    const today = new Date();

    const daysSinceEnd = Math.floor(
      (today.getTime() - sessionEndDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysSinceEnd > 30) {
      return {
        available: false,
        sessionEndDate,
        feedbackDeadline: new Date(
          sessionEndDate.getTime() + 30 * 24 * 60 * 60 * 1000,
        ),
        reason: 'Feedback window expired (30 days after session end)',
      };
    }

    const feedbackDeadline = new Date(
      sessionEndDate.getTime() + 30 * 24 * 60 * 60 * 1000,
    );

    return {
      available: true,
      sessionEndDate,
      feedbackDeadline,
    };
  }

  /**
   * Get testimonials for home page (top featured feedbacks)
   */
  async getTestimonials(limit: number = 3): Promise<Feedback[]> {
    return this.feedbackRepository.find({
      where: {
        isPublished: true,
        isFeatured: true,
        containsBadWords: false,
      },
      relations: ['user', 'session', 'session.training'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Get approved feedback for a public training detail page.
   */
  async getTrainingFeedback(trainingSlug: string, limit: number = 10) {
    const feedbacks = await this.feedbackRepository
      .createQueryBuilder('feedback')
      .leftJoinAndSelect('feedback.user', 'user')
      .leftJoinAndSelect('feedback.session', 'session')
      .leftJoinAndSelect('session.training', 'training')
      .where('training.slug = :trainingSlug', { trainingSlug })
      .andWhere('feedback.isPublished = true')
      .andWhere('feedback.containsBadWords = false')
      .orderBy('feedback.createdAt', 'DESC')
      .take(limit)
      .getMany();

    return feedbacks.map((feedback) => ({
      id: feedback.id,
      rating: feedback.rating,
      comment: feedback.comment,
      feedbackType: feedback.feedbackType,
      userName: feedback.user
        ? `${feedback.user.firstName} ${feedback.user.lastName}`
        : 'Participant',
      createdAt: feedback.createdAt,
    }));
  }

  /**
   * Get live public metrics for a training detail page.
   */
  async getTrainingSummary(trainingSlug: string) {
    const feedbacks = await this.feedbackRepository
      .createQueryBuilder('feedback')
      .leftJoin('feedback.session', 'feedbackSession')
      .leftJoin('feedbackSession.training', 'feedbackTraining')
      .where('feedbackTraining.slug = :trainingSlug', { trainingSlug })
      .andWhere('feedback.isPublished = true')
      .andWhere('feedback.containsBadWords = false')
      .getMany();

    const alumniCount = await this.registrationRepository
      .createQueryBuilder('registration')
      .innerJoin('registration.session', 'registrationSession')
      .innerJoin('registrationSession.training', 'registrationTraining')
      .where('registrationTraining.slug = :trainingSlug', { trainingSlug })
      .andWhere('registration.status = :status', {
        status: RegistrationStatus.COMPLETED,
      })
      .getCount();

    return {
      averageRating: feedbacks.length
        ? Number(
            (
              feedbacks.reduce((sum, feedback) => sum + feedback.rating, 0) /
              feedbacks.length
            ).toFixed(2),
          )
        : 0,
      ratingCount: feedbacks.length,
      alumniCount,
    };
  }

  /**
   * Get feedback statistics for a session
   */
  async getSessionFeedbackStats(sessionId: string): Promise<any> {
    const feedbacks = await this.feedbackRepository.find({
      where: { sessionId, isPublished: true },
    });

    if (feedbacks.length === 0) {
      return {
        totalFeedbacks: 0,
        averageRating: 0,
        ratingBreakdown: {},
      };
    }

    const ratings = feedbacks.map((f) => f.rating);
    const averageRating = ratings.reduce((a, b) => a + b, 0) / ratings.length;

    const ratingBreakdown = {
      5: feedbacks.filter((f) => f.rating === 5).length,
      4: feedbacks.filter((f) => f.rating === 4).length,
      3: feedbacks.filter((f) => f.rating === 3).length,
      2: feedbacks.filter((f) => f.rating === 2).length,
      1: feedbacks.filter((f) => f.rating === 1).length,
    };

    return {
      totalFeedbacks: feedbacks.length,
      averageRating: parseFloat(averageRating.toFixed(2)),
      ratingBreakdown,
    };
  }

  /**
   * Get feedback statistics for a training
   */
  async getTrainingFeedbackStats(trainingId: string): Promise<any> {
    const feedbacks = await this.feedbackRepository
      .createQueryBuilder('feedback')
      .leftJoinAndSelect('feedback.session', 'session')
      .where('session.trainingId = :trainingId', { trainingId })
      .andWhere('feedback.isPublished = true')
      .getMany();

    if (feedbacks.length === 0) {
      return {
        totalFeedbacks: 0,
        averageRating: 0,
        ratingBreakdown: {},
      };
    }

    const ratings = feedbacks.map((f) => f.rating);
    const averageRating = ratings.reduce((a, b) => a + b, 0) / ratings.length;

    const ratingBreakdown = {
      5: feedbacks.filter((f) => f.rating === 5).length,
      4: feedbacks.filter((f) => f.rating === 4).length,
      3: feedbacks.filter((f) => f.rating === 3).length,
      2: feedbacks.filter((f) => f.rating === 2).length,
      1: feedbacks.filter((f) => f.rating === 1).length,
    };

    return {
      totalFeedbacks: feedbacks.length,
      averageRating: parseFloat(averageRating.toFixed(2)),
      ratingBreakdown,
    };
  }

  /**
   * Get feedback statistics for a trainer
   */
  async getTrainerFeedbackStats(trainerId: string): Promise<any> {
    const feedbacks = await this.feedbackRepository
      .createQueryBuilder('feedback')
      .leftJoinAndSelect('feedback.session', 'session')
      .where('session.trainerId = :trainerId', { trainerId })
      .andWhere('feedback.isPublished = true')
      .getMany();

    if (feedbacks.length === 0) {
      return {
        totalFeedbacks: 0,
        averageRating: 0,
        ratingBreakdown: {},
      };
    }

    const ratings = feedbacks.map((f) => f.rating);
    const averageRating = ratings.reduce((a, b) => a + b, 0) / ratings.length;

    const ratingBreakdown = {
      5: feedbacks.filter((f) => f.rating === 5).length,
      4: feedbacks.filter((f) => f.rating === 4).length,
      3: feedbacks.filter((f) => f.rating === 3).length,
      2: feedbacks.filter((f) => f.rating === 2).length,
      1: feedbacks.filter((f) => f.rating === 1).length,
    };

    return {
      totalFeedbacks: feedbacks.length,
      averageRating: parseFloat(averageRating.toFixed(2)),
      ratingBreakdown,
    };
  }

  /**
   * Check bad words in text (API endpoint)
   */
  async checkBadWords(text: string): Promise<BadWordCheckResult> {
    return this.badWordsService.checkBadWords(text);
  }
}
