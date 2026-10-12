import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  Registration,
  RegistrationStatus,
} from '../registrations/entities/registration.entity';
import {
  Payment,
  PaymentMethod,
  PaymentStatus,
} from '../payments/entities/payment.entity';
import {
  Session,
  SessionLifecycleStatus,
} from '../sessions/entities/session.entity';
import { User, Role } from '../users/entities/user.entity';
import { Certificate } from '../certificates/entities/certificate.entity';
import { Training } from '../trainings/entities/training.entity';
import { Feedback } from '../feedback/entities/feedback.entity';
import { Trainer } from '../trainers/entities/trainer.entity';
import { Location } from '../locations/entities/location.entity';
import { trainingAvailabilityError } from '../trainings/training-availability';
import {
  calculateAnalyticsBreakdowns,
  type AnalyticsFilters,
} from './analytics-breakdowns';
import {
  calculateOperationalMetrics,
  calculatePaymentAnalytics,
  calculateRegistrationOutcomes,
  calculateTrainingPopularity,
  type AnalyticsComparison,
  type AnalyticsPayment,
  type AnalyticsRegistration,
  type CurrencyAmount,
} from './analytics-calculations';

export interface KPIs {
  totalParticipants: number;
  totalRegistrations: number;
  eligibleForConversion: number;
  convertedRegistrations: number;
  cancelledRegistrations: number;
  conversionRate: number;
  cancellationRate: number;
  activeRegistrations: number;
  pendingRegistrations: number;
  upcomingSessions: number;
  occupancyRate: number;
  revenue: number | null;
  revenueByCurrency: CurrencyAmount[];
  outstandingBalance: number | null;
  outstandingBalanceByCurrency: CurrencyAmount[];
  averageDueByCurrency: CurrencyAmount[];
}

export interface RegistrationTrendPoint {
  month: string;
  registrations: number;
}

export interface RevenueByAxis {
  axis: string;
  currency: string;
  amount: number;
}

export interface PaymentMethodBreakdown {
  method: PaymentMethod;
  currency: string;
  amount: number;
  transactions: number;
}

export interface TrainingPopularity {
  training: string;
  registrations: number;
}

export interface ReferralSourceCount {
  source: string;
  registrations: number;
  percentage: number;
}

export interface AnalyticsNamedCount {
  id: string | null;
  name: string;
  sessions: number;
  participants: number;
  capacity: number;
  seatsTaken: number;
  occupancyRate: number | null;
}

export interface ReferralSourceDetails {
  eligibleRegistrations: number;
  socialNetworkRegistrations: number;
  unspecifiedSocialNetwork: number;
  networks: {
    network: string;
    registrations: number;
    percentageOfSocialRegistrations: number;
    percentageOfEligibleRegistrations: number;
  }[];
}

export interface TrainingRatingAnalytics {
  trainingId: string;
  training: string;
  averageRating: number | null;
  reviewCount: number;
  distribution: { rating: number; count: number }[];
}

export interface FeedbackTypeAnalytics {
  type: string;
  averageRating: number;
  count: number;
}

export interface RegistrationBreakdown {
  training: string;
  registrations: number;
  byStatus: { status: RegistrationStatus; count: number }[];
}

export interface SessionRegistrationBreakdown extends RegistrationBreakdown {
  startDate: string;
  capacity: number;
  seatsTaken: number;
  occupancy: number;
}

export interface SessionOccupancy {
  session: string;
  startDate: string;
  seatsTaken: number;
  capacity: number;
  occupancy: number;
}

export interface AdminAnalytics {
  kpis: KPIs;
  registrationTrend: RegistrationTrendPoint[];
  revenueByAxis: RevenueByAxis[];
  paymentMethods: PaymentMethodBreakdown[];
  trainingPopularity: TrainingPopularity[];
  referralSources: ReferralSourceCount[];
  referralSourceDetails: ReferralSourceDetails;
  coachAnalytics: { coaches: AnalyticsNamedCount[] };
  locationAnalytics: { locations: AnalyticsNamedCount[] };
  trainingRatings: TrainingRatingAnalytics[];
  feedbackByType: FeedbackTypeAnalytics[];
  registrationCountsByTraining: RegistrationBreakdown[];
  registrationCountsBySession: SessionRegistrationBreakdown[];
  filterOptions: {
    trainings: { id: string; name: string }[];
    coaches: { id: string; name: string }[];
    locations: { id: string; name: string }[];
  };
  sessionOccupancy: SessionOccupancy[];
  comparison: AnalyticsComparison;
}

const onlyCurrencyAmount = (values: CurrencyAmount[]): number | null => {
  if (values.length > 1) return null;
  return values[0]?.amount ?? 0;
};

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    @InjectRepository(Registration)
    private registrationRepository: Repository<Registration>,
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(Session)
    private sessionRepository: Repository<Session>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Certificate)
    private certificateRepository: Repository<Certificate>,
    @InjectRepository(Training)
    private trainingRepository: Repository<Training>,
    @InjectRepository(Feedback)
    private feedbackRepository: Repository<Feedback>,
    @InjectRepository(Trainer)
    private trainerRepository: Repository<Trainer>,
    @InjectRepository(Location)
    private locationRepository: Repository<Location>,
  ) {}

  async getAdminAnalytics(
    filters: AnalyticsFilters = {},
    now = new Date(),
  ): Promise<AdminAnalytics> {
    try {
      if (
        filters.startDate &&
        filters.endDate &&
        filters.startDate > filters.endDate
      ) {
        throw new BadRequestException(
          'La date de début doit précéder ou égaler la date de fin.',
        );
      }
      const today = now.toISOString().slice(0, 10);
      const [
        totalParticipants,
        registrations,
        sessions,
        payments,
        feedback,
        trainings,
        trainers,
        locations,
      ] = await Promise.all([
        this.userRepository.count({ where: { role: Role.PARTICIPANT } }),
        this.registrationRepository.find({
          relations: { session: { training: true } },
        }),
        this.sessionRepository.find({
          relations: { training: true, trainers: true, locations: true },
        }),
        this.paymentRepository.find({
          where: {
            status: In([PaymentStatus.PAID, PaymentStatus.PARTIAL]),
          },
          relations: {
            registration: { session: { training: true } },
          },
        }),
        this.feedbackRepository.find(),
        this.trainingRepository.find({
          select: { id: true, title: true },
          order: { title: 'ASC' },
        }),
        this.trainerRepository.find({
          select: { id: true, firstName: true, lastName: true },
          order: { firstName: 'ASC', lastName: 'ASC' },
        }),
        this.locationRepository.find({
          select: { id: true, name: true },
          order: { name: 'ASC' },
        }),
      ]);

      const availableSessions = sessions.filter(
        (session) =>
          session.startDate >= today &&
          session.lifecycleStatus === SessionLifecycleStatus.SCHEDULED &&
          !trainingAvailabilityError(session.training, today),
      );
      const registrationData = registrations as AnalyticsRegistration[];
      const paymentData = payments as AnalyticsPayment[];
      const financialMetrics = calculatePaymentAnalytics(
        registrationData,
        paymentData,
        now,
      );
      const registrationOutcomes =
        calculateRegistrationOutcomes(registrationData);
      const operationalMetrics = calculateOperationalMetrics(
        registrationData,
        availableSessions,
        today,
      );
      const analyticsBreakdowns = calculateAnalyticsBreakdowns(
        sessions,
        registrations,
        feedback,
        filters,
        trainings,
      );
      const sessionOccupancy = availableSessions.map((session) => ({
        session: session.training?.title ?? 'Formation non renseignée',
        startDate: session.startDate,
        seatsTaken: Math.min(
          Math.max(0, session.seatsTaken),
          Math.max(0, session.capacity),
        ),
        capacity: Math.max(0, session.capacity),
        occupancy:
          session.capacity > 0
            ? Math.round(
                (Math.min(Math.max(0, session.seatsTaken), session.capacity) /
                  session.capacity) *
                  100,
              )
            : 0,
      }));

      return {
        kpis: {
          totalParticipants,
          ...registrationOutcomes,
          activeRegistrations: operationalMetrics.activeRegistrations,
          pendingRegistrations: operationalMetrics.pendingRegistrations,
          upcomingSessions: operationalMetrics.upcomingSessions,
          occupancyRate: operationalMetrics.occupancyRate,
          revenue: onlyCurrencyAmount(financialMetrics.revenueByCurrency),
          revenueByCurrency: financialMetrics.revenueByCurrency,
          outstandingBalance: onlyCurrencyAmount(
            financialMetrics.outstandingByCurrency,
          ),
          outstandingBalanceByCurrency: financialMetrics.outstandingByCurrency,
        },
        registrationTrend: financialMetrics.registrationTrend,
        revenueByAxis: financialMetrics.revenueByAxis,
        paymentMethods: financialMetrics.paymentMethods,
        trainingPopularity: calculateTrainingPopularity(registrationData),
        referralSources: analyticsBreakdowns.referralSources,
        referralSourceDetails: analyticsBreakdowns.referralSourceDetails,
        coachAnalytics: { coaches: analyticsBreakdowns.coaches },
        locationAnalytics: { locations: analyticsBreakdowns.locations },
        trainingRatings: analyticsBreakdowns.trainingRatings,
        feedbackByType: analyticsBreakdowns.feedbackByType,
        registrationCountsByTraining:
          analyticsBreakdowns.registrationCountsByTraining,
        registrationCountsBySession:
          analyticsBreakdowns.registrationCountsBySession,
        filterOptions: {
          trainings: trainings.map(({ id, title }) => ({ id, name: title })),
          coaches: trainers.map(({ id, firstName, lastName }) => ({
            id,
            name: `${firstName} ${lastName}`.trim(),
          })),
          locations: locations.map(({ id, name }) => ({ id, name })),
        },
        sessionOccupancy,
        comparison: financialMetrics.comparison,
      };
    } catch (error) {
      this.logger.error('Error calculating analytics', error);
      throw error;
    }
  }
}
