import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FeedbackService } from './services/feedback.service';
import { BadWordsService } from './services/bad-words.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { UpdateFeedbackDto } from './dto/update-feedback.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@Controller('feedback')
export class FeedbackController {
  private readonly logger = new Logger(FeedbackController.name);

  constructor(
    private readonly feedbackService: FeedbackService,
    private readonly badWordsService: BadWordsService,
  ) {}

  /**
   * Submit feedback for a registration
   * POST /feedback
   */
  @Post()
  @UseGuards(AuthGuard('jwt'))
  async createFeedback(
    @Body() createFeedbackDto: CreateFeedbackDto,
    @CurrentUser() user: User,
  ) {
    this.logger.log(
      `User ${user.id} submitting feedback for registration ${createFeedbackDto.registrationId}`,
    );

    return this.feedbackService.createFeedback(user.id, createFeedbackDto);
  }

  /**
   * Get approved feedback for a training detail page
   * GET /feedback/public/training/:trainingSlug
   */
  @Get('public/training/:trainingSlug')
  async getTrainingFeedback(@Param('trainingSlug') trainingSlug: string) {
    return this.feedbackService.getTrainingFeedback(trainingSlug);
  }

  /**
   * Get live approved rating and alumni count for a training
   * GET /feedback/public/training/:trainingSlug/summary
   */
  @Get('public/training/:trainingSlug/summary')
  async getTrainingSummary(@Param('trainingSlug') trainingSlug: string) {
    return this.feedbackService.getTrainingSummary(trainingSlug);
  }

  /**
   * Get feedback for a registration
   * GET /feedback/:registrationId
   */
  @Get(':registrationId')
  @UseGuards(AuthGuard('jwt'))
  async getFeedback(
    @Param('registrationId') registrationId: string,
    @CurrentUser() user: User,
  ) {
    const feedback = await this.feedbackService.getFeedbackByRegistration(
      registrationId,
      user.id,
    );

    if (!feedback) {
      return { message: 'No feedback submitted yet' };
    }

    return feedback;
  }

  /**
   * Check if feedback is available for a registration
   * GET /feedback/:registrationId/available
   */
  @Get(':registrationId/available')
  @UseGuards(AuthGuard('jwt'))
  async isFeedbackAvailable(
    @Param('registrationId') registrationId: string,
    @CurrentUser() user: User,
  ) {
    return this.feedbackService.isFeedbackAvailable(registrationId, user.id);
  }

  /**
   * Update feedback (within 7 days)
   * PATCH /feedback/:feedbackId
   */
  @Patch(':feedbackId')
  @UseGuards(AuthGuard('jwt'))
  async updateFeedback(
    @Param('feedbackId') feedbackId: string,
    @Body() updateFeedbackDto: UpdateFeedbackDto,
    @CurrentUser() user: User,
  ) {
    this.logger.log(`User ${user.id} updating feedback ${feedbackId}`);

    return this.feedbackService.updateFeedback(
      feedbackId,
      user.id,
      updateFeedbackDto,
    );
  }

  /**
   * Check for bad words in text (real-time validation)
   * POST /feedback/check-bad-words
   * Body: { text: string }
   */
  @Post('check-bad-words')
  async checkBadWords(@Body('text') text: string) {
    if (!text || typeof text !== 'string') {
      throw new BadRequestException('Text is required and must be a string');
    }

    const result = this.badWordsService.checkBadWords(text);

    return {
      hasBadWords: result.hasBadWords,
      detectedWords: result.detectedWords,
      warning: result.hasBadWords
        ? `⚠️ Your comment contains inappropriate words: ${result.detectedWords.join(', ')}. They will be masked in the final submission.`
        : null,
    };
  }

  /**
   * Get public testimonials (for home page)
   * GET /feedback/testimonials
   */
  @Get('public/testimonials')
  async getTestimonials() {
    const testimonials = await this.feedbackService.getTestimonials(3);

    return testimonials.map((t) => ({
      id: t.id,
      rating: t.rating,
      comment: t.comment,
      userName: `${t.user.firstName} ${t.user.lastName}`,
      trainingName: t.session?.training?.title || 'Unknown',
      createdAt: t.createdAt,
    }));
  }

  /**
   * Get session feedback statistics
   * GET /feedback/session/:sessionId/stats
   */
  @Get('session/:sessionId/stats')
  async getSessionStats(@Param('sessionId') sessionId: string) {
    return this.feedbackService.getSessionFeedbackStats(sessionId);
  }

  /**
   * Get training feedback statistics
   * GET /feedback/training/:trainingId/stats
   */
  @Get('training/:trainingId/stats')
  async getTrainingStats(@Param('trainingId') trainingId: string) {
    return this.feedbackService.getTrainingFeedbackStats(trainingId);
  }

  /**
   * Get trainer feedback statistics
   * GET /feedback/trainer/:trainerId/stats
   */
  @Get('trainer/:trainerId/stats')
  async getTrainerStats(@Param('trainerId') trainerId: string) {
    return this.feedbackService.getTrainerFeedbackStats(trainerId);
  }
}
