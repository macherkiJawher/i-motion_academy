import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Query,
  UseGuards,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository, FindOptionsWhere } from 'typeorm';
import { Feedback } from './entities/feedback.entity';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../users/entities/user.entity';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@Controller('admin/feedback')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.ADMIN)
export class AdminFeedbackController {
  private readonly logger = new Logger(AdminFeedbackController.name);

  constructor(
    @InjectRepository(Feedback)
    private feedbackRepository: Repository<Feedback>,
  ) {}

  /**
   * Get all feedback (with filters)
   * GET /admin/feedback
   * Query params: isPublished, isFeatured, containsBadWords, minRating, maxRating, page, limit
   */
  @Get()
  async getAllFeedback(
    @Query('isPublished') isPublished?: string,
    @Query('isFeatured') isFeatured?: string,
    @Query('containsBadWords') containsBadWords?: string,
    @Query('minRating') minRating?: string,
    @Query('maxRating') maxRating?: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    const where: FindOptionsWhere<Feedback> = {};

    if (isPublished !== undefined) {
      where.isPublished = isPublished === 'true';
    }

    if (isFeatured !== undefined) {
      where.isFeatured = isFeatured === 'true';
    }

    if (containsBadWords !== undefined) {
      where.containsBadWords = containsBadWords === 'true';
    }

    if (minRating || maxRating) {
      const min = Math.max(
        1,
        Math.min(5, minRating ? parseInt(minRating, 10) : 1),
      );
      const max = Math.max(
        min,
        Math.min(5, maxRating ? parseInt(maxRating, 10) : 5),
      );
      where.rating = Between(min, max);
    }

    const [feedbacks, total] = await this.feedbackRepository.findAndCount({
      where,
      relations: ['user', 'session', 'session.training'],
      order: { createdAt: 'DESC' },
      skip: offset,
      take: limitNum,
    });

    return {
      data: feedbacks.map((feedback) => ({
        id: feedback.id,
        rating: feedback.rating,
        comment: feedback.comment,
        feedbackType: feedback.feedbackType,
        isPublished: feedback.isPublished,
        isFeatured: feedback.isFeatured,
        containsBadWords: feedback.containsBadWords,
        flaggedReason: feedback.flaggedReason,
        userName: feedback.user
          ? `${feedback.user.firstName} ${feedback.user.lastName}`
          : 'Participant',
        trainingName: feedback.session?.training?.title || 'Unknown',
        createdAt: feedback.createdAt,
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  /**
   * Get feedback queue (pending approval)
   * GET /admin/feedback/queue
   */
  @Get('queue')
  async getFeedbackQueue(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    const where: FindOptionsWhere<Feedback> = {
      isPublished: false,
    };

    const feedbacks = await this.feedbackRepository.find({
      where,
      relations: ['user', 'session', 'session.training', 'registration'],
      order: { containsBadWords: 'DESC', createdAt: 'DESC' },
      skip: offset,
      take: limitNum,
    });

    const total = await this.feedbackRepository.count({ where });

    return {
      data: feedbacks.map((f) => ({
        id: f.id,
        rating: f.rating,
        comment: f.comment,
        feedbackType: f.feedbackType,
        isPublished: f.isPublished,
        isFeatured: f.isFeatured,
        containsBadWords: f.containsBadWords,
        flaggedReason: f.flaggedReason,
        userName: `${f.user.firstName} ${f.user.lastName}`,
        trainingName: f.session?.training?.title || 'Unknown',
        createdAt: f.createdAt,
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  /** Toggle the approval status of a feedback. */
  @Patch(':feedbackId/publish')
  async publishFeedback(
    @Param('feedbackId') feedbackId: string,
    @CurrentUser() admin: User,
  ) {
    const feedback = await this.feedbackRepository.findOne({
      where: { id: feedbackId },
    });

    if (!feedback) {
      throw new ForbiddenException('Feedback not found');
    }

    feedback.isPublished = !feedback.isPublished;
    if (!feedback.isPublished) {
      feedback.isFeatured = false;
    }

    const updated = await this.feedbackRepository.save(feedback);
    this.logger.log(
      `Feedback ${feedbackId} approval set to ${updated.isPublished} by admin ${admin.id}`,
    );

    return updated;
  }

  /**
   * Star feedback for home page display
   * PATCH /admin/feedback/:feedbackId/star
   */
  @Patch(':feedbackId/star')
  async starFeedback(
    @Param('feedbackId') feedbackId: string,
    @CurrentUser() admin: User,
  ) {
    const feedback = await this.feedbackRepository.findOne({
      where: { id: feedbackId },
    });

    if (!feedback) {
      throw new ForbiddenException('Feedback not found');
    }

    if (!feedback.isPublished) {
      throw new ForbiddenException('Can only star published feedback');
    }

    feedback.isFeatured = !feedback.isFeatured; // Toggle

    const updated = await this.feedbackRepository.save(feedback);
    this.logger.log(
      `Feedback ${feedbackId} ${updated.isFeatured ? 'starred' : 'unstarred'} by admin ${admin.id}`,
    );

    return updated;
  }

  /**
   * Reject feedback (delete it or hide permanently)
   * DELETE /admin/feedback/:feedbackId
   */
  @Delete(':feedbackId')
  async rejectFeedback(
    @Param('feedbackId') feedbackId: string,
    @CurrentUser() admin: User,
  ) {
    const feedback = await this.feedbackRepository.findOne({
      where: { id: feedbackId },
    });

    if (!feedback) {
      throw new ForbiddenException('Feedback not found');
    }

    await this.feedbackRepository.remove(feedback);
    this.logger.log(`Feedback ${feedbackId} deleted by admin ${admin.id}`);

    return { message: 'Feedback rejected and deleted', feedbackId };
  }

  /**
   * Get featured feedbacks (testimonials for home)
   * GET /admin/feedback/featured
   */
  @Get('featured')
  async getFeaturedFeedbacks(@Query('limit') limit: string = '6') {
    const limitNum = parseInt(limit) || 6;

    const feedbacks = await this.feedbackRepository.find({
      where: {
        isPublished: true,
        isFeatured: true,
      },
      relations: ['user', 'session', 'session.training'],
      order: { createdAt: 'DESC' },
      take: limitNum,
    });

    return {
      data: feedbacks,
      count: feedbacks.length,
    };
  }

  /**
   * Get feedback statistics dashboard
   * GET /admin/feedback/stats/dashboard
   */
  @Get('stats/dashboard')
  async getFeedbackStatsDashboard() {
    const totalFeedbacks = await this.feedbackRepository.count();
    const publishedFeedbacks = await this.feedbackRepository.count({
      where: { isPublished: true },
    });
    const featuredFeedbacks = await this.feedbackRepository.count({
      where: { isFeatured: true },
    });
    const flaggedFeedbacks = await this.feedbackRepository.count({
      where: { containsBadWords: true },
    });

    const allFeedbacks = await this.feedbackRepository.find({
      where: { isPublished: true },
    });

    const averageRating =
      allFeedbacks.length > 0
        ? (
            allFeedbacks.reduce((sum, f) => sum + f.rating, 0) /
            allFeedbacks.length
          ).toFixed(2)
        : 0;

    const ratingBreakdown = {
      5: allFeedbacks.filter((f) => f.rating === 5).length,
      4: allFeedbacks.filter((f) => f.rating === 4).length,
      3: allFeedbacks.filter((f) => f.rating === 3).length,
      2: allFeedbacks.filter((f) => f.rating === 2).length,
      1: allFeedbacks.filter((f) => f.rating === 1).length,
    };

    return {
      totalFeedbacks,
      publishedFeedbacks,
      featuredFeedbacks,
      flaggedFeedbacks,
      averageRating: parseFloat(averageRating as string),
      ratingBreakdown,
      pendingApproval: totalFeedbacks - publishedFeedbacks,
    };
  }
}
