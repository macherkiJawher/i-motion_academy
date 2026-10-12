import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, ILike, Repository } from 'typeorm';
import {
  Payment,
  PaymentMethod,
  PaymentStatus,
} from '../payments/entities/payment.entity';
import {
  Certificate,
  CertificateStatus,
  CertificateType,
} from '../certificates/entities/certificate.entity';
import {
  ContactRequest,
  ContactRequestStatus,
} from '../contact-requests/entities/contact-request.entity';
import {
  Registration,
  RegistrationStatus,
} from '../registrations/entities/registration.entity';
import {
  ApprovalStatus,
  Training,
  TrainingLifecycleStatus,
} from '../trainings/entities/training.entity';
import { AnalyticsService } from './analytics.service';
import type { CurrencyAmount } from './analytics-calculations';

const MAX_CURRENCY_GROUPS = 50;
const MAX_TRAINING_RATINGS = 50;
const MAX_COACH_AGGREGATES = 50;
const MAX_LOCATION_AGGREGATES = 50;

export interface AdminAssistantContext {
  version: 1;
  generatedAt: string;
  scope: 'global-current-snapshot';
  trainings: {
    total: number;
    byLifecycleStatus: {
      status: TrainingLifecycleStatus;
      count: number;
    }[];
    published: number;
    pendingHomologation: number;
    popularity: { training: string; registrations: number }[];
  };
  sessions: {
    upcoming: number;
    totalCapacity: number;
    occupiedSeats: number;
    remainingSeats: number;
    occupancy: {
      training: string;
      startDate: string;
      occupiedSeats: number;
      capacity: number;
      occupancyPercentage: number;
    }[];
    registrationBreakdown: {
      training: string;
      startDate: string;
      capacity: number;
      seatsTaken: number;
      occupancy: number;
      registrations: number;
      byStatus: { status: RegistrationStatus; count: number }[];
    }[];
    availabilityRule: string;
  };
  registrations: {
    byStatus: { status: RegistrationStatus; count: number }[];
    pending: number;
    cancelled: number;
    trend: { month: string; registrations: number }[];
    popularityByTraining: { training: string; registrations: number }[];
    byTraining: {
      training: string;
      registrations: number;
      byStatus: { status: RegistrationStatus; count: number }[];
    }[];
    referralSources: {
      source: string;
      registrations: number;
      percentage: number;
    }[];
    referralSourceDetails: {
      eligibleRegistrations: number;
      socialNetworkRegistrations: number;
      unspecifiedSocialNetwork: number;
      networks: {
        network: string;
        registrations: number;
        percentageOfSocialRegistrations: number;
        percentageOfEligibleRegistrations: number;
      }[];
    };
  };
  participants: {
    population: number;
    withBirthDate: number;
    missingBirthDate: number;
    ambiguousBirthDate: number;
    invalidBirthDate: number;
    averageAgeYears: number | null;
    byAgeRange: { range: string; count: number }[];
    referenceDate: string;
    populationRule: string;
  };
  payments: {
    byMethod: {
      method: PaymentMethod;
      transactions: number;
      percentage: number;
    }[];
    totalMethodTransactions: number;
    mostUsedMethods: PaymentMethod[];
    methodUsageRule: string;
    byStatus: {
      status: PaymentStatus;
      count: number;
      recordedAmountByCurrency: CurrencyAmount[];
    }[];
    recordedRevenueByCurrency: CurrencyAmount[];
    revenueComparisonByCurrency: {
      currency: string;
      current: number;
      previous: number;
      changePercent: number | null;
    }[];
    outstandingBalanceByCurrency: CurrencyAmount[];
    omittedOutstandingCurrencies: number;
    source: 'application-recorded';
    independentlyConfirmedByProvider: false;
    amountInterpretation: string;
    outstandingBalanceInterpretation: string;
    omittedCurrencies: number;
  };
  ratings: {
    validTrainingReviewCount: number;
    byTraining: {
      training: string;
      averageRating: number | null;
      reviewCount: number;
      distribution: { rating: number; count: number }[];
    }[];
    otherFeedbackByType: {
      type: string;
      averageRating: number;
      count: number;
    }[];
    omittedTrainingBreakdowns: number;
    eligibilityRule: string;
  };
  coaches: {
    aggregates: {
      name: string;
      sessions: number;
      participants: number;
      capacity: number;
      seatsTaken: number;
      occupancyRate: number | null;
    }[];
    omittedAggregates: number;
    identityPolicy: 'admin_name_only';
    participantRule: string;
    occupancyRule: string;
  };
  locations: {
    aggregates: {
      label: string;
      sessions: number;
      participants: number;
    }[];
    omittedAggregates: number;
    identityPolicy: 'anonymized';
  };
  certificates: {
    byStatus: { status: string; count: number }[];
    byType: { type: string; count: number }[];
  };
  contactRequests: {
    byStatus: { status: string; count: number }[];
    total: number;
    processingDurationAvailable: false;
  };
  limits: {
    currencyGroups: number;
    trainingRatings: number;
    coachAggregates: number;
    locationAggregates: number;
  };
}

type PaymentRow = Pick<Payment, 'status' | 'amount' | 'currency'>;
type ParticipantRegistration = Pick<
  Registration,
  'id' | 'userId' | 'birthDate' | 'createdAt' | 'status'
>;

const AGE_RANGES = [
  { range: 'Moins de 18 ans', min: 0, max: 18 },
  { range: '18-24 ans', min: 18, max: 25 },
  { range: '25-34 ans', min: 25, max: 35 },
  { range: '35-44 ans', min: 35, max: 45 },
  { range: '45-54 ans', min: 45, max: 55 },
  { range: '55 ans et plus', min: 55, max: Infinity },
] as const;

const SAFE_REFERRAL_LABELS = new Set([
  'Réseaux sociaux',
  'Bouche-à-oreille',
  'Internet',
  'Publicité',
  'Non renseigné',
]);

function ageOnDate(birthDate: string, referenceDate: Date): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return null;
  const parsed = new Date(`${birthDate}T00:00:00.000Z`);
  if (
    !Number.isFinite(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== birthDate ||
    parsed.getTime() > referenceDate.getTime()
  ) {
    return null;
  }
  let age = referenceDate.getUTCFullYear() - parsed.getUTCFullYear();
  if (
    referenceDate.getUTCMonth() < parsed.getUTCMonth() ||
    (referenceDate.getUTCMonth() === parsed.getUTCMonth() &&
      referenceDate.getUTCDate() < parsed.getUTCDate())
  ) {
    age -= 1;
  }
  return age;
}

function participantDemographics(
  rows: ParticipantRegistration[],
  referenceDate: Date,
  period?: { startDate: string; endDate: string },
) {
  const people = new Map<string, Set<string>>();
  for (const row of rows) {
    if (row.status === RegistrationStatus.CANCELLED) continue;
    const key = row.userId ? `user:${row.userId}` : `registration:${row.id}`;
    const dates = people.get(key) ?? new Set<string>();
    if (row.birthDate) dates.add(row.birthDate);
    people.set(key, dates);
  }

  let missingBirthDate = 0;
  let ambiguousBirthDate = 0;
  let invalidBirthDate = 0;
  let ageTotal = 0;
  const ageCounts = new Map(AGE_RANGES.map(({ range }) => [range, 0]));
  for (const dates of people.values()) {
    if (dates.size === 0) {
      missingBirthDate += 1;
      continue;
    }
    if (dates.size > 1) {
      ambiguousBirthDate += 1;
      continue;
    }
    const birthDate = Array.from(dates)[0];
    const age = birthDate ? ageOnDate(birthDate, referenceDate) : null;
    if (age === null) {
      invalidBirthDate += 1;
      continue;
    }
    ageTotal += age;
    const ageRange = AGE_RANGES.find(({ min, max }) => age >= min && age < max);
    if (ageRange) {
      ageCounts.set(ageRange.range, (ageCounts.get(ageRange.range) ?? 0) + 1);
    }
  }

  const withBirthDate = people.size - missingBirthDate - ambiguousBirthDate;
  const validAgeCount = withBirthDate - invalidBirthDate;
  return {
    population: people.size,
    withBirthDate: validAgeCount,
    missingBirthDate,
    ambiguousBirthDate,
    invalidBirthDate,
    averageAgeYears: validAgeCount
      ? Math.round((ageTotal / validAgeCount) * 10) / 10
      : null,
    byAgeRange: AGE_RANGES.map(({ range }) => ({
      range,
      count: ageCounts.get(range) ?? 0,
    })),
    referenceDate: referenceDate.toISOString().slice(0, 10),
    populationRule: `Inscriptions PENDING, CONFIRMED ou COMPLETED${period ? ` créées entre le ${period.startDate} et le ${period.endDate} inclus` : ''}; comptes liés dédupliqués par identifiant de compte, inscriptions sans compte comptées séparément. Les dates de naissance contradictoires ou invalides sont exclues de la moyenne.`,
  };
}

function safeReferralSources(
  sources: { source: string; registrations: number }[],
) {
  const counts = new Map<string, number>();
  for (const item of sources) {
    const label = SAFE_REFERRAL_LABELS.has(item.source)
      ? item.source
      : 'Autres/non catégorisés';
    counts.set(label, (counts.get(label) ?? 0) + item.registrations);
  }
  const total = Array.from(counts.values()).reduce(
    (sum, count) => sum + count,
    0,
  );
  return Array.from(counts, ([source, registrations]) => ({
    source,
    registrations,
    percentage: total ? Math.round((registrations / total) * 1000) / 10 : 0,
  })).sort(
    (first, second) =>
      second.registrations - first.registrations ||
      first.source.localeCompare(second.source, 'fr'),
  );
}

function countStatuses<T extends string>(
  statuses: readonly T[],
  rows: { status: T }[],
): { status: T; count: number }[] {
  const counts = new Map<T, number>(statuses.map((status) => [status, 0]));
  for (const row of rows) {
    counts.set(row.status, (counts.get(row.status) ?? 0) + 1);
  }
  return statuses.map((status) => ({
    status,
    count: counts.get(status) ?? 0,
  }));
}

function countValues<T extends string>(
  values: readonly T[],
  rows: { value: T }[],
): { value: T; count: number }[] {
  const counts = new Map<T, number>(values.map((value) => [value, 0]));
  for (const row of rows) {
    counts.set(row.value, (counts.get(row.value) ?? 0) + 1);
  }
  return values.map((value) => ({ value, count: counts.get(value) ?? 0 }));
}

function paymentTotalsByStatus(rows: PaymentRow[]) {
  const totals = new Map<
    PaymentStatus,
    { count: number; amounts: Map<string, number> }
  >(
    Object.values(PaymentStatus).map((status) => [
      status,
      { count: 0, amounts: new Map<string, number>() },
    ]),
  );
  for (const row of rows) {
    const total = totals.get(row.status);
    if (!total) continue;
    total.count += 1;
    total.amounts.set(
      row.currency,
      (total.amounts.get(row.currency) ?? 0) + Number(row.amount),
    );
  }

  const currencies = Array.from(new Set(rows.map((row) => row.currency))).sort(
    (first, second) => first.localeCompare(second),
  );
  const includedCurrencies = new Set(currencies.slice(0, MAX_CURRENCY_GROUPS));
  return {
    byStatus: Object.values(PaymentStatus).map((status) => {
      const total = totals.get(status)!;
      return {
        status,
        count: total.count,
        recordedAmountByCurrency: Array.from(total.amounts)
          .filter(([currency]) => includedCurrencies.has(currency))
          .map(([currency, amount]) => ({ currency, amount }))
          .sort((first, second) =>
            first.currency.localeCompare(second.currency),
          ),
      };
    }),
    omittedCurrencies: Math.max(0, currencies.length - MAX_CURRENCY_GROUPS),
  };
}

function anonymizeAggregates(
  aggregates: { sessions: number; participants: number }[],
  limit: number,
) {
  return {
    aggregates: aggregates.slice(0, limit).map((aggregate, index) => ({
      label: `Groupe ${index + 1}`,
      sessions: aggregate.sessions,
      participants: aggregate.participants,
    })),
    omittedAggregates: Math.max(0, aggregates.length - limit),
  };
}

function limitCurrencyAmounts(values: CurrencyAmount[]) {
  const sorted = [...values].sort((first, second) =>
    first.currency.localeCompare(second.currency),
  );
  return {
    amounts: sorted.slice(0, MAX_CURRENCY_GROUPS),
    omittedCurrencies: Math.max(0, sorted.length - MAX_CURRENCY_GROUPS),
  };
}

@Injectable()
export class AdminAssistantContextService {
  constructor(
    private readonly analyticsService: AnalyticsService,
    @InjectRepository(Training)
    private readonly trainingRepository: Repository<Training>,
    @InjectRepository(Registration)
    private readonly registrationRepository: Repository<Registration>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(Certificate)
    private readonly certificateRepository: Repository<Certificate>,
    @InjectRepository(ContactRequest)
    private readonly contactRequestRepository: Repository<ContactRequest>,
  ) {}

  async getContext(now = new Date()): Promise<AdminAssistantContext> {
    const [
      analytics,
      trainings,
      registrations,
      payments,
      certificates,
      contactRequests,
    ] = await Promise.all([
      this.analyticsService.getAdminAnalytics({}, now),
      this.trainingRepository.find({
        select: { lifecycleStatus: true, approvalStatus: true },
      }),
      this.registrationRepository.find({
        select: {
          id: true,
          userId: true,
          birthDate: true,
          status: true,
          createdAt: true,
        },
      }),
      this.paymentRepository.find({
        select: { status: true, amount: true, currency: true },
      }),
      this.certificateRepository.find({ select: { status: true, type: true } }),
      this.contactRequestRepository.find({ select: { status: true } }),
    ]);

    const paymentSummary = paymentTotalsByStatus(payments);
    const transactionsByMethod = new Map<PaymentMethod, number>(
      Object.values(PaymentMethod).map((method) => [method, 0]),
    );
    for (const paymentMethod of analytics.paymentMethods) {
      transactionsByMethod.set(
        paymentMethod.method,
        (transactionsByMethod.get(paymentMethod.method) ?? 0) +
          paymentMethod.transactions,
      );
    }
    const totalMethodTransactions = Array.from(
      transactionsByMethod.values(),
    ).reduce((total, transactions) => total + transactions, 0);
    const mostUsedMethodCount = Math.max(0, ...transactionsByMethod.values());
    const mostUsedMethods =
      totalMethodTransactions === 0
        ? []
        : Array.from(transactionsByMethod)
            .filter(([, transactions]) => transactions === mostUsedMethodCount)
            .map(([method]) => method);
    const paymentMethodBreakdown = Array.from(
      transactionsByMethod,
      ([method, transactions]) => ({
        method,
        transactions,
        percentage: totalMethodTransactions
          ? Math.round((transactions / totalMethodTransactions) * 1000) / 10
          : 0,
      }),
    ).sort(
      (first, second) =>
        second.transactions - first.transactions ||
        first.method.localeCompare(second.method),
    );
    const outstandingBalance = limitCurrencyAmounts(
      analytics.kpis.outstandingBalanceByCurrency,
    );
    const coachSummary = {
      aggregates: analytics.coachAnalytics.coaches
        .slice(0, MAX_COACH_AGGREGATES)
        .map(
          ({
            name,
            sessions,
            participants,
            capacity,
            seatsTaken,
            occupancyRate,
          }) => ({
            name: name || 'Coach non renseigné',
            sessions,
            participants,
            capacity,
            seatsTaken,
            occupancyRate,
          }),
        ),
      omittedAggregates: Math.max(
        0,
        analytics.coachAnalytics.coaches.length - MAX_COACH_AGGREGATES,
      ),
      identityPolicy: 'admin_name_only' as const,
      participantRule:
        'Participants uniques par coach, inscriptions CONFIRMED ou COMPLETED uniquement; dédoublonnage par userId, sinon par email normalisé.',
      occupancyRule:
        'Somme des seatsTaken plafonnés à la capacité / somme des capacités des sessions assignées; null si capacité totale nulle.',
    };
    const locationSummary = anonymizeAggregates(
      analytics.locationAnalytics.locations,
      MAX_LOCATION_AGGREGATES,
    );
    const trainingRatings = analytics.trainingRatings;
    const sessionOccupancy = analytics.sessionOccupancy;
    const totalCapacity = sessionOccupancy.reduce(
      (total, session) => total + Math.max(0, session.capacity),
      0,
    );
    const occupiedSeats = sessionOccupancy.reduce(
      (total, session) =>
        total +
        Math.min(
          Math.max(0, session.seatsTaken),
          Math.max(0, session.capacity),
        ),
      0,
    );
    const registrationStatuses = countStatuses(
      Object.values(RegistrationStatus),
      registrations,
    );

    return {
      version: 1,
      generatedAt: now.toISOString(),
      scope: 'global-current-snapshot',
      trainings: {
        total: trainings.length,
        byLifecycleStatus: countStatuses(
          Object.values(TrainingLifecycleStatus),
          trainings.map(({ lifecycleStatus }) => ({
            status: lifecycleStatus,
          })),
        ),
        published: trainings.filter(
          (training) =>
            training.lifecycleStatus === TrainingLifecycleStatus.PUBLISHED,
        ).length,
        pendingHomologation: trainings.filter(
          (training) => training.approvalStatus === ApprovalStatus.PENDING,
        ).length,
        popularity: analytics.trainingPopularity.slice(0, MAX_TRAINING_RATINGS),
      },
      sessions: {
        upcoming: analytics.kpis.upcomingSessions,
        totalCapacity,
        occupiedSeats,
        remainingSeats: Math.max(0, totalCapacity - occupiedSeats),
        occupancy: sessionOccupancy
          .slice(0, MAX_TRAINING_RATINGS)
          .map((session) => ({
            training: session.session,
            startDate: session.startDate,
            occupiedSeats: session.seatsTaken,
            capacity: session.capacity,
            occupancyPercentage: session.occupancy,
          })),
        registrationBreakdown: analytics.registrationCountsBySession
          .slice(0, MAX_TRAINING_RATINGS)
          .map((session) => ({
            training: session.training,
            startDate: session.startDate,
            capacity: session.capacity,
            seatsTaken: session.seatsTaken,
            occupancy: session.occupancy,
            registrations: session.registrations,
            byStatus: session.byStatus,
          })),
        availabilityRule:
          'Sessions dont la date de début est aujourd’hui ou ultérieure, au statut SCHEDULED, et associées à une formation disponible selon les règles métier.',
      },
      registrations: {
        byStatus: registrationStatuses,
        pending:
          registrationStatuses.find(
            ({ status }) => status === RegistrationStatus.PENDING,
          )?.count ?? 0,
        cancelled:
          registrationStatuses.find(
            ({ status }) => status === RegistrationStatus.CANCELLED,
          )?.count ?? 0,
        trend: analytics.registrationTrend,
        popularityByTraining: analytics.trainingPopularity.slice(
          0,
          MAX_TRAINING_RATINGS,
        ),
        byTraining: analytics.registrationCountsByTraining.slice(
          0,
          MAX_TRAINING_RATINGS,
        ),
        referralSources: safeReferralSources(analytics.referralSources).slice(
          0,
          MAX_TRAINING_RATINGS,
        ),
        referralSourceDetails: {
          eligibleRegistrations:
            analytics.referralSourceDetails.eligibleRegistrations,
          socialNetworkRegistrations:
            analytics.referralSourceDetails.socialNetworkRegistrations,
          unspecifiedSocialNetwork:
            analytics.referralSourceDetails.unspecifiedSocialNetwork,
          networks: analytics.referralSourceDetails.networks.slice(
            0,
            MAX_TRAINING_RATINGS,
          ),
        },
      },
      participants: participantDemographics(registrations, now),
      payments: {
        byMethod: paymentMethodBreakdown,
        totalMethodTransactions,
        mostUsedMethods,
        methodUsageRule:
          'Tous les paiements enregistrés, sans filtre de date; seules les lignes aux statuts PAID ou PARTIAL sont incluses. Les pourcentages portent sur le nombre de transactions, les devises sont réunies pour compter seulement, et aucun montant n’est additionné.',
        byStatus: paymentSummary.byStatus,
        recordedRevenueByCurrency: analytics.kpis.revenueByCurrency.slice(
          0,
          MAX_CURRENCY_GROUPS,
        ),
        revenueComparisonByCurrency:
          analytics.comparison.revenueByCurrency.slice(0, MAX_CURRENCY_GROUPS),
        outstandingBalanceByCurrency: outstandingBalance.amounts,
        source: 'application-recorded',
        independentlyConfirmedByProvider: false,
        amountInterpretation:
          'Somme des montants des lignes de paiement enregistrées, groupée par statut et devise; ce statut ne constitue pas une confirmation indépendante par un prestataire bancaire.',
        outstandingBalanceInterpretation:
          'Somme, par devise, de max(montant dû - montant payé, 0) pour les inscriptions dont le statut est différent de CANCELLED, selon le calcul analytique existant.',
        omittedCurrencies: paymentSummary.omittedCurrencies,
        omittedOutstandingCurrencies: outstandingBalance.omittedCurrencies,
      },
      ratings: {
        validTrainingReviewCount: trainingRatings.reduce(
          (total, training) => total + training.reviewCount,
          0,
        ),
        byTraining: trainingRatings
          .slice(0, MAX_TRAINING_RATINGS)
          .map(({ training, averageRating, reviewCount, distribution }) => ({
            training,
            averageRating,
            reviewCount,
            distribution,
          })),
        otherFeedbackByType: analytics.feedbackByType.filter(
          ({ type }) => type !== 'TRAINING',
        ),
        omittedTrainingBreakdowns: Math.max(
          0,
          trainingRatings.length - MAX_TRAINING_RATINGS,
        ),
        eligibilityRule:
          'Avis de type TRAINING associés à une session hors statuts DRAFT et CANCELLED; seules les notes entières de 1 à 5 sont comptées. Le calcul analytique existant ne filtre pas isPublished.',
      },
      coaches: {
        ...coachSummary,
      },
      locations: {
        ...locationSummary,
        identityPolicy: 'anonymized',
      },
      certificates: {
        byStatus: countStatuses(Object.values(CertificateStatus), certificates),
        byType: countValues(
          Object.values(CertificateType),
          certificates.map(({ type }) => ({ value: type })),
        ).map(({ value, count }) => ({ type: value, count })),
      },
      contactRequests: {
        byStatus: countStatuses(
          Object.values(ContactRequestStatus),
          contactRequests,
        ),
        total: contactRequests.length,
        processingDurationAvailable: false,
      },
      limits: {
        currencyGroups: MAX_CURRENCY_GROUPS,
        trainingRatings: MAX_TRAINING_RATINGS,
        coachAggregates: MAX_COACH_AGGREGATES,
        locationAggregates: MAX_LOCATION_AGGREGATES,
      },
    };
  }

  async getParticipantDemographics(
    period?: { startDate: string; endDate: string },
    now = new Date(),
  ) {
    const registrations = await this.registrationRepository.find({
      select: {
        id: true,
        userId: true,
        birthDate: true,
        status: true,
        createdAt: true,
      },
      ...(period
        ? {
            where: {
              createdAt: Between(
                new Date(`${period.startDate}T00:00:00.000Z`),
                new Date(`${period.endDate}T23:59:59.999Z`),
              ),
            },
          }
        : {}),
    });
    return participantDemographics(registrations, now, period);
  }

  async getTrainingCatalog(search?: string) {
    const where = search
      ? [{ title: ILike(`%${search}%`) }, { subcategory: ILike(`%${search}%`) }]
      : undefined;
    const [trainings, total] = await this.trainingRepository.findAndCount({
      select: {
        title: true,
        axisCode: true,
        subcategory: true,
        recognitionType: true,
        approvalStatus: true,
        lifecycleStatus: true,
        durationHours: true,
        durationValue: true,
        durationUnit: true,
        price: true,
        currency: true,
        rating: true,
        learners: true,
        active: true,
        tagline: true,
        description: true,
        targetAudience: true,
        prerequisites: true,
        skills: true,
        objectives: true,
        program: true,
      },
      ...(where ? { where } : {}),
      order: { title: 'ASC' },
      take: 20,
    });

    return {
      trainings: trainings.map((training) => ({
        title: training.title,
        axisCode: training.axisCode,
        subcategory: training.subcategory,
        recognitionType: training.recognitionType,
        approvalStatus: training.approvalStatus,
        lifecycleStatus: training.lifecycleStatus,
        durationHours: training.durationHours,
        durationValue: training.durationValue,
        durationUnit: training.durationUnit,
        price: training.price,
        currency: training.currency,
        rating: training.rating,
        learners: training.learners,
        active: training.active,
        tagline: training.tagline.slice(0, 300),
        description: training.description.slice(0, 1200),
        targetAudience: training.targetAudience.slice(0, 500),
        prerequisites: training.prerequisites.slice(0, 500),
        skills: training.skills
          .slice(0, 10)
          .map((skill) => skill.slice(0, 120)),
        objectives: training.objectives
          .slice(0, 10)
          .map((objective) => objective.slice(0, 120)),
        program: training.program.slice(0, 12).map((item) => ({
          title: item.title.slice(0, 120),
          detail: item.detail.slice(0, 300),
          hours: item.hours ?? null,
        })),
      })),
      returned: trainings.length,
      omitted: Math.max(0, total - trainings.length),
      searchFieldRule:
        'La recherche filtrée examine uniquement le titre et la sous-catégorie.',
    };
  }
}
