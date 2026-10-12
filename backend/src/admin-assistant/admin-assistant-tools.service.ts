import { Injectable } from '@nestjs/common';
import { AnalyticsService } from '../analytics/analytics.service';
import { AdminAssistantContextService } from '../analytics/admin-assistant-context.service';
import { AuditService } from '../audit/audit.service';
import { ComplaintsService } from '../complaints/complaints.service';

export const ADMIN_ASSISTANT_TOOL_NAMES = [
  'get_current_admin_snapshot',
  'get_period_operational_breakdowns',
  'get_admin_analytics',
] as const;

export type AdminAssistantToolName =
  (typeof ADMIN_ASSISTANT_TOOL_NAMES)[number];
export type AssistantLanguage = 'fr' | 'ar' | 'ar-TN' | 'aeb-Latn';
export type AdminAssistantAnalyticsArea =
  | 'participants'
  | 'registrations'
  | 'payments'
  | 'trainings'
  | 'sessions'
  | 'coaches'
  | 'locations'
  | 'reviews'
  | 'referral_sources'
  | 'complaints'
  | 'audit'
  | 'certificates'
  | 'contact_requests'
  | 'training_catalog'
  | 'knowledge_sources';

export interface AdminAssistantPeriod {
  type: 'current_snapshot' | 'date_range';
  startDate: string | null;
  endDate: string | null;
}

export interface AdminAssistantToolResult {
  toolName: AdminAssistantToolName;
  data: unknown;
  sources: string[];
  period: AdminAssistantPeriod;
  missingData: string[];
}

const MAX_PERIOD_DAYS = 366;
const MAX_BREAKDOWN_ITEMS = 25;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ANALYTICS_AREAS: ReadonlySet<string> = new Set([
  'participants',
  'registrations',
  'payments',
  'trainings',
  'sessions',
  'coaches',
  'locations',
  'reviews',
  'referral_sources',
  'complaints',
  'audit',
  'certificates',
  'contact_requests',
  'training_catalog',
  'knowledge_sources',
]);
const SESSION_FILTERED_AREAS = new Set<AdminAssistantAnalyticsArea>([
  'sessions',
  'coaches',
  'locations',
  'reviews',
  'referral_sources',
]);

function isAnalyticsArea(value: unknown): value is AdminAssistantAnalyticsArea {
  return typeof value === 'string' && ANALYTICS_AREAS.has(value);
}

function validDate(value: unknown): value is string {
  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return (
    Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

function periodArguments(
  args: unknown,
): { startDate: string; endDate: string } | null {
  if (
    typeof args !== 'object' ||
    args === null ||
    Array.isArray(args) ||
    Object.keys(args).length !== 2 ||
    !Object.hasOwn(args, 'startDate') ||
    !Object.hasOwn(args, 'endDate') ||
    !validDate(Reflect.get(args, 'startDate')) ||
    !validDate(Reflect.get(args, 'endDate'))
  ) {
    return null;
  }

  const startDate = Reflect.get(args, 'startDate') as string;
  const endDate = Reflect.get(args, 'endDate') as string;
  const start = Date.parse(`${startDate}T00:00:00.000Z`);
  const end = Date.parse(`${endDate}T00:00:00.000Z`);
  const inclusiveDays = Math.floor((end - start) / 86_400_000) + 1;
  if (inclusiveDays < 1 || inclusiveDays > MAX_PERIOD_DAYS) return null;
  return { startDate, endDate };
}

interface AdminAnalyticsArguments {
  area: AdminAssistantAnalyticsArea;
  startDate?: string;
  endDate?: string;
  trainingId?: string;
  trainerId?: string;
  locationId?: string;
  search?: string;
  coachSortBy?: 'sessions' | 'participants' | 'occupancy';
}

function adminAnalyticsArguments(
  args: unknown,
): AdminAnalyticsArguments | null {
  if (typeof args !== 'object' || args === null || Array.isArray(args)) {
    return null;
  }
  const input = args as Record<string, unknown>;
  if (!Object.hasOwn(input, 'area') || !isAnalyticsArea(input.area)) {
    return null;
  }
  const allowedKeys = new Set([
    'area',
    'startDate',
    'endDate',
    'trainingId',
    'trainerId',
    'locationId',
    'search',
    'coachSortBy',
  ]);
  if (Object.keys(input).some((key) => !allowedKeys.has(key))) return null;

  const area = input.area;
  const startDate = input.startDate;
  const endDate = input.endDate;
  const trainingId = input.trainingId;
  const trainerId = input.trainerId;
  const locationId = input.locationId;
  const search = input.search;
  const coachSortBy = input.coachSortBy;
  const hasDateFilter = startDate !== undefined || endDate !== undefined;
  const hasIdFilter =
    trainingId !== undefined ||
    trainerId !== undefined ||
    locationId !== undefined;
  if (
    (hasDateFilter &&
      area !== 'participants' &&
      !SESSION_FILTERED_AREAS.has(area)) ||
    (hasIdFilter && !SESSION_FILTERED_AREAS.has(area)) ||
    (search !== undefined && area !== 'training_catalog') ||
    (coachSortBy !== undefined &&
      (area !== 'coaches' ||
        typeof coachSortBy !== 'string' ||
        !['sessions', 'participants', 'occupancy'].includes(coachSortBy)))
  ) {
    return null;
  }

  if (
    (startDate !== undefined && !validDate(startDate)) ||
    (endDate !== undefined && !validDate(endDate)) ||
    (startDate === undefined) !== (endDate === undefined) ||
    (trainingId !== undefined &&
      (typeof trainingId !== 'string' || !UUID_PATTERN.test(trainingId))) ||
    (trainerId !== undefined &&
      (typeof trainerId !== 'string' || !UUID_PATTERN.test(trainerId))) ||
    (locationId !== undefined &&
      (typeof locationId !== 'string' || !UUID_PATTERN.test(locationId))) ||
    (search !== undefined &&
      (typeof search !== 'string' ||
        search.trim().length < 2 ||
        search.trim().length > 100 ||
        /[%_]/.test(search)))
  ) {
    return null;
  }
  if (startDate !== undefined && endDate !== undefined) {
    const inclusiveDays =
      Math.floor(
        (Date.parse(`${endDate}T00:00:00.000Z`) -
          Date.parse(`${startDate}T00:00:00.000Z`)) /
          86_400_000,
      ) + 1;
    if (inclusiveDays < 1 || inclusiveDays > MAX_PERIOD_DAYS) return null;
  }
  return {
    area,
    ...(typeof startDate === 'string' ? { startDate } : {}),
    ...(typeof endDate === 'string' ? { endDate } : {}),
    ...(typeof trainingId === 'string' ? { trainingId } : {}),
    ...(typeof trainerId === 'string' ? { trainerId } : {}),
    ...(typeof locationId === 'string' ? { locationId } : {}),
    ...(typeof search === 'string' ? { search: search.trim() } : {}),
    ...(coachSortBy === 'sessions' ||
    coachSortBy === 'participants' ||
    coachSortBy === 'occupancy'
      ? { coachSortBy }
      : {}),
  };
}

function snapshotMissingData(
  context: Awaited<ReturnType<AdminAssistantContextService['getContext']>>,
): string[] {
  const missing: string[] = [
    'Les remboursements ne sont pas distingués ni disponibles dans les sources analytiques.',
    'Le statut de paiement est enregistré dans l’application et ne prouve pas une confirmation indépendante du prestataire.',
  ];
  if (context.payments.omittedCurrencies > 0) {
    missing.push(
      `${context.payments.omittedCurrencies} devises de paiement omises par la limite de résultat.`,
    );
  }
  if (context.payments.omittedOutstandingCurrencies > 0) {
    missing.push(
      `${context.payments.omittedOutstandingCurrencies} devises de solde restant dû omises par la limite de résultat.`,
    );
  }
  if (context.ratings.omittedTrainingBreakdowns > 0) {
    missing.push(
      `${context.ratings.omittedTrainingBreakdowns} ventilations de notes par formation omises par la limite de résultat.`,
    );
  }
  if (context.coaches.omittedAggregates > 0) {
    missing.push(
      `${context.coaches.omittedAggregates} coachs omis par la limite de résultat.`,
    );
  }
  if (context.locations.omittedAggregates > 0) {
    missing.push(
      `${context.locations.omittedAggregates} groupes de lieux omis par la limite de résultat.`,
    );
  }
  return missing;
}

function safeReferralSources(
  sources: { source: string; registrations: number }[],
): { source: string; registrations: number; percentage: number }[] {
  const allowedLabels = new Set([
    'Réseaux sociaux',
    'Bouche-à-oreille',
    'Internet',
    'Publicité',
    'Non renseigné',
  ]);
  const totals = new Map<string, number>();
  for (const item of sources) {
    const label = allowedLabels.has(item.source)
      ? item.source
      : 'Autres/non catégorisés';
    totals.set(label, (totals.get(label) ?? 0) + item.registrations);
  }
  const total = Array.from(totals.values()).reduce(
    (sum, count) => sum + count,
    0,
  );
  return Array.from(totals, ([source, registrations]) => ({
    source,
    registrations,
    percentage: total ? Math.round((registrations / total) * 1000) / 10 : 0,
  })).sort(
    (first, second) =>
      second.registrations - first.registrations ||
      first.source.localeCompare(second.source, 'fr'),
  );
}

@Injectable()
export class AdminAssistantToolsService {
  constructor(
    private readonly contextService: AdminAssistantContextService,
    private readonly analyticsService: AnalyticsService,
    private readonly complaintsService: ComplaintsService,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    name: string,
    args: unknown,
  ): Promise<AdminAssistantToolResult | null> {
    if (name === 'get_admin_analytics') {
      const request = adminAnalyticsArguments(args);
      if (!request) return null;
      return this.executeAnalyticsArea(request);
    }

    if (name === 'get_current_admin_snapshot') {
      if (
        typeof args !== 'object' ||
        args === null ||
        Array.isArray(args) ||
        Object.keys(args).length !== 0
      ) {
        return null;
      }
      const [context, complaints, audit] = await Promise.all([
        this.contextService.getContext(),
        this.complaintsService.getAdminAssistantAggregates(),
        this.auditService.getAdminAssistantAggregates(),
      ]);
      const missingData = snapshotMissingData(context);
      missingData.push(
        'Les agrégats de réclamations couvrent tous les dossiers et ne contiennent ni texte, ni identifiant.',
        'Les agrégats d’audit couvrent les 30 derniers jours; aucun acteur, détail, IP ou agent utilisateur n’est inclus.',
      );
      return {
        toolName: name,
        data: {
          ...context,
          complaints,
          audit,
        },
        sources: ['admin_snapshot', 'complaints', 'audit'],
        period: {
          type: 'current_snapshot',
          startDate: null,
          endDate: null,
        },
        missingData,
      };
    }

    if (name === 'get_period_operational_breakdowns') {
      const period = periodArguments(args);
      if (!period) return null;

      const analytics = await this.analyticsService.getAdminAnalytics(period);
      const ratings = analytics.trainingRatings.slice(0, MAX_BREAKDOWN_ITEMS);
      const coaches = analytics.coachAnalytics.coaches.slice(
        0,
        MAX_BREAKDOWN_ITEMS,
      );
      const locations = analytics.locationAnalytics.locations.slice(
        0,
        MAX_BREAKDOWN_ITEMS,
      );
      const referralSources = safeReferralSources(analytics.referralSources);
      const missingData = [
        'La période filtre les ventilations selon la date des sessions; elle ne représente pas la date de création des inscriptions ou la date de paiement.',
        'Les remboursements et la confirmation indépendante des paiements par un prestataire ne sont pas disponibles.',
        'Les libellés de sources de recommandation non standard sont regroupés afin de ne pas transmettre de texte libre potentiellement identifiable.',
      ];
      if (analytics.trainingRatings.length > ratings.length) {
        missingData.push(
          `${analytics.trainingRatings.length - ratings.length} ventilations de notes omises par la limite de résultat.`,
        );
      }
      if (analytics.coachAnalytics.coaches.length > coaches.length) {
        missingData.push(
          `${analytics.coachAnalytics.coaches.length - coaches.length} coachs omis par la limite de résultat.`,
        );
      }
      if (analytics.locationAnalytics.locations.length > locations.length) {
        missingData.push(
          `${analytics.locationAnalytics.locations.length - locations.length} groupes de lieux omis par la limite de résultat.`,
        );
      }
      if (referralSources.length > MAX_BREAKDOWN_ITEMS) {
        missingData.push(
          `${referralSources.length - MAX_BREAKDOWN_ITEMS} catégories de recommandation omises par la limite de résultat.`,
        );
      }
      if (analytics.referralSourceDetails.unspecifiedSocialNetwork > 0) {
        missingData.push(
          'Certaines inscriptions indiquent seulement la catégorie Réseaux sociaux; aucune plateforme précise n’est enregistrée pour elles.',
        );
      }

      return {
        toolName: name,
        data: {
          trainingRatings: ratings.map(
            ({ training, averageRating, reviewCount, distribution }) => ({
              training,
              averageRating,
              reviewCount,
              distribution,
            }),
          ),
          referralSources: {
            categories: referralSources.slice(0, MAX_BREAKDOWN_ITEMS),
            eligibleRegistrations:
              analytics.referralSourceDetails.eligibleRegistrations,
            socialNetworkRegistrations:
              analytics.referralSourceDetails.socialNetworkRegistrations,
            unspecifiedSocialNetwork:
              analytics.referralSourceDetails.unspecifiedSocialNetwork,
            networks: analytics.referralSourceDetails.networks.slice(
              0,
              MAX_BREAKDOWN_ITEMS,
            ),
            denominatorRules: {
              overall:
                'Inscriptions non annulées dans les sessions retenues; chaque inscription est comptée une fois.',
              socialNetworks:
                'Parmi les inscriptions classées Réseaux sociaux pour lesquelles une plateforme explicite a été enregistrée.',
            },
          },
          coaches: {
            ranking: 'sessions',
            participantRule:
              'Participants uniques par coach, inscriptions CONFIRMED ou COMPLETED uniquement; dédoublonnage par userId, sinon par email normalisé.',
            occupancyRule:
              'Places occupées agrégées depuis seatsTaken / capacité agrégée; null si capacité totale nulle.',
            coaches: coaches.map(
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
          },
          locations: locations.map((aggregate, index) => ({
            label: `Groupe ${index + 1}`,
            sessions: aggregate.sessions,
            participants: aggregate.participants,
          })),
        },
        sources: ['period_breakdowns'],
        period: {
          type: 'date_range',
          startDate: period.startDate,
          endDate: period.endDate,
        },
        missingData,
      };
    }

    return null;
  }

  private async executeAnalyticsArea(
    request: AdminAnalyticsArguments,
  ): Promise<AdminAssistantToolResult> {
    const { area } = request;
    const filters = {
      ...(request.startDate ? { startDate: request.startDate } : {}),
      ...(request.endDate ? { endDate: request.endDate } : {}),
      ...(request.trainingId ? { trainingId: request.trainingId } : {}),
      ...(request.trainerId ? { trainerId: request.trainerId } : {}),
      ...(request.locationId ? { locationId: request.locationId } : {}),
    };
    const period: AdminAssistantPeriod = {
      type: request.startDate ? 'date_range' : 'current_snapshot',
      startDate: request.startDate ?? null,
      endDate: request.endDate ?? null,
    };

    if (area === 'participants') {
      const data = await this.contextService.getParticipantDemographics(
        request.startDate && request.endDate
          ? { startDate: request.startDate, endDate: request.endDate }
          : undefined,
      );
      return {
        toolName: 'get_admin_analytics',
        data,
        sources: ['participant_demographics'],
        period,
        missingData: [],
      };
    }

    if (area === 'training_catalog') {
      const data = await this.contextService.getTrainingCatalog(request.search);
      return {
        toolName: 'get_admin_analytics',
        data,
        sources: ['training_catalog'],
        period: { type: 'current_snapshot', startDate: null, endDate: null },
        missingData: [],
      };
    }
    if (area === 'knowledge_sources') {
      return {
        toolName: 'get_admin_analytics',
        data: {
          dedicatedKnowledgeBaseAvailable: false,
          relatedStructuredData: [
            'Catalogue des formations',
            'Sessions et disponibilités',
          ],
        },
        sources: ['knowledge_sources_inventory'],
        period: { type: 'current_snapshot', startDate: null, endDate: null },
        missingData: [
          'Aucune entité ou source documentaire dédiée à une base de connaissances n’existe dans le backend inspecté.',
        ],
      };
    }

    if (area === 'complaints') {
      const data = await this.complaintsService.getAdminAssistantAggregates();
      return {
        toolName: 'get_admin_analytics',
        data,
        sources: ['complaints'],
        period: { type: 'current_snapshot', startDate: null, endDate: null },
        missingData: [
          'Les textes, messages privés, pièces jointes, identifiants et délais de traitement détaillés ne sont pas transmis.',
        ],
      };
    }
    if (area === 'audit') {
      const data = await this.auditService.getAdminAssistantAggregates();
      return {
        toolName: 'get_admin_analytics',
        data,
        sources: ['audit'],
        period: { type: 'current_snapshot', startDate: null, endDate: null },
        missingData: [
          'Les agrégats d’audit couvrent les 30 derniers jours; aucun acteur, détail, IP ou agent utilisateur n’est inclus.',
        ],
      };
    }

    if (SESSION_FILTERED_AREAS.has(area)) {
      const analytics = await this.analyticsService.getAdminAnalytics(filters);
      let data: unknown;
      const missingData: string[] = [
        'La période et les filtres portent sur la date de début des sessions; ils ne filtrent pas la date de création des inscriptions ni la date des paiements.',
      ];
      if (area === 'sessions') {
        data = analytics.registrationCountsBySession.slice(
          0,
          MAX_BREAKDOWN_ITEMS,
        );
        if (
          analytics.registrationCountsBySession.length > MAX_BREAKDOWN_ITEMS
        ) {
          missingData.push(
            `${analytics.registrationCountsBySession.length - MAX_BREAKDOWN_ITEMS} sessions omises par la limite de résultat.`,
          );
        }
      } else if (area === 'coaches') {
        const sortBy = request.coachSortBy ?? 'sessions';
        const coaches = [...analytics.coachAnalytics.coaches].sort((a, b) => {
          const value = (coach: typeof a) =>
            sortBy === 'participants'
              ? coach.participants
              : sortBy === 'occupancy'
                ? (coach.occupancyRate ?? -1)
                : coach.sessions;
          return (
            value(b) - value(a) ||
            b.sessions - a.sessions ||
            b.participants - a.participants ||
            a.name.localeCompare(b.name, 'fr')
          );
        });
        data = {
          ranking: sortBy,
          rankingRule:
            'Tri décroissant selon le critère demandé; égalités départagées par sessions, participants puis nom.',
          participantRule:
            'Participants uniques par coach, inscriptions CONFIRMED ou COMPLETED uniquement; dédoublonnage par userId, sinon par email normalisé.',
          sessionRule:
            'Sans période, toutes les sessions sont incluses; avec une période, elle filtre la date de début. Seuls les statuts autres que DRAFT et CANCELLED sont retenus; une session avec plusieurs coachs compte pour chacun.',
          occupancyRule:
            'Places occupées agrégées depuis seatsTaken et capacité depuis capacity sur les sessions attribuées; le taux est places occupées / capacité totale. Le taux vaut null si la capacité totale est nulle.',
          coaches: coaches
            .slice(0, MAX_BREAKDOWN_ITEMS)
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
          omitted: Math.max(
            0,
            analytics.coachAnalytics.coaches.length - MAX_BREAKDOWN_ITEMS,
          ),
        };
        if (coaches.length === 0) {
          missingData.push(
            'Aucune relation de coach ni aucun ancien coach renseigné n’a été trouvé sur les sessions correspondantes.',
          );
        } else if (coaches.every(({ capacity }) => capacity === 0)) {
          missingData.push(
            'La capacité est absente ou nulle pour toutes les sessions correspondantes; aucun taux de remplissage ne peut être calculé.',
          );
        }
      } else if (area === 'locations') {
        data = analytics.locationAnalytics.locations
          .slice(0, MAX_BREAKDOWN_ITEMS)
          .map((aggregate, index) => ({
            label: `Groupe ${index + 1}`,
            sessions: aggregate.sessions,
            participants: aggregate.participants,
          }));
        missingData.push(
          'Les lieux sont volontairement anonymisés; une session peut être comptée pour plusieurs lieux.',
        );
      } else if (area === 'reviews') {
        data = {
          trainingRatings: analytics.trainingRatings
            .slice(0, MAX_BREAKDOWN_ITEMS)
            .map(({ training, averageRating, reviewCount, distribution }) => ({
              training,
              averageRating,
              reviewCount,
              distribution,
            })),
          otherFeedbackByType: analytics.feedbackByType.filter(
            ({ type }) => type !== 'TRAINING',
          ),
        };
        missingData.push(
          'Les commentaires de feedback ne sont pas transmis. Les notes incluent les avis publiés et non publiés selon la règle analytique existante.',
        );
      } else {
        data = {
          eligibleRegistrations:
            analytics.referralSourceDetails.eligibleRegistrations,
          socialNetworkRegistrations:
            analytics.referralSourceDetails.socialNetworkRegistrations,
          unspecifiedSocialNetwork:
            analytics.referralSourceDetails.unspecifiedSocialNetwork,
          networks: analytics.referralSourceDetails.networks.slice(
            0,
            MAX_BREAKDOWN_ITEMS,
          ),
          categories: safeReferralSources(analytics.referralSources).slice(
            0,
            MAX_BREAKDOWN_ITEMS,
          ),
          denominatorRules: {
            period:
              'Sans période, toutes les sessions sont incluses; avec une période, elle filtre la date de début de la session.',
            overall:
              'Pourcentage des catégories: inscriptions non annulées dans les sessions retenues; chaque inscription est comptée une fois.',
            socialNetworks:
              'Pourcentage des réseaux: parmi les inscriptions classées Réseaux sociaux pour lesquelles une plateforme explicite a été enregistrée.',
          },
        };
        if (analytics.referralSourceDetails.eligibleRegistrations === 0) {
          missingData.push(
            'Aucune inscription non annulée dans les sessions retenues; il ne s’agit pas d’un taux nul calculé sur un échantillon.',
          );
        }
        if (analytics.referralSourceDetails.unspecifiedSocialNetwork > 0) {
          missingData.push(
            'Certaines inscriptions indiquent seulement la catégorie Réseaux sociaux; aucune plateforme précise n’est enregistrée pour elles.',
          );
        }
        missingData.push(
          'Les sources libres non standard sont regroupées pour éviter la transmission de texte potentiellement identifiant.',
        );
      }
      return {
        toolName: 'get_admin_analytics',
        data,
        sources: ['period_breakdowns'],
        period,
        missingData,
      };
    }

    const context = await this.contextService.getContext();
    const areaData = this.areaData(context, area);
    const missingData =
      area === 'payments'
        ? [
            'Les remboursements et la confirmation indépendante des paiements par un prestataire ne sont pas disponibles.',
          ]
        : area === 'reviews'
          ? [
              'Les commentaires ne sont pas transmis; les agrégats de notes suivent les critères indiqués dans le contexte analytique.',
            ]
          : area === 'contact_requests'
            ? [
                'Le contenu des demandes et les coordonnées ne sont pas transmis; aucune date de résolution ne permet de calculer un délai de traitement fiable.',
              ]
            : [];
    return {
      toolName: 'get_admin_analytics',
      data: areaData,
      sources: [area],
      period,
      missingData,
    };
  }

  private areaData(
    context: Awaited<ReturnType<AdminAssistantContextService['getContext']>>,
    area: AdminAssistantAnalyticsArea,
  ): unknown {
    switch (area) {
      case 'registrations':
        return context.registrations;
      case 'payments':
        return context.payments;
      case 'trainings':
        return {
          ...context.trainings,
          ratings: context.ratings.byTraining.slice(0, MAX_BREAKDOWN_ITEMS),
        };
      case 'certificates':
        return context.certificates;
      case 'contact_requests':
        return context.contactRequests;
      case 'training_catalog':
      case 'knowledge_sources':
      case 'participants':
      case 'sessions':
      case 'coaches':
      case 'locations':
      case 'reviews':
      case 'referral_sources':
      case 'complaints':
      case 'audit':
        throw new Error('Unsupported analytics area');
    }
  }
}
