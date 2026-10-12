import {
  FeedbackType,
  type Feedback,
} from '../feedback/entities/feedback.entity';
import type { Location } from '../locations/entities/location.entity';
import {
  RegistrationStatus,
  type Registration,
} from '../registrations/entities/registration.entity';
import {
  SessionLifecycleStatus,
  type Session,
} from '../sessions/entities/session.entity';
import type { Trainer } from '../trainers/entities/trainer.entity';

export interface AnalyticsFilters {
  startDate?: string;
  endDate?: string;
  trainingId?: string;
  trainerId?: string;
  locationId?: string;
}

type AnalyticsSession = Pick<
  Session,
  | 'id'
  | 'startDate'
  | 'capacity'
  | 'seatsTaken'
  | 'lifecycleStatus'
  | 'trainingId'
  | 'trainerId'
  | 'trainerName'
  | 'locationId'
  | 'locationName'
> & {
  training?: { id: string; title: string } | null;
  trainers?: Pick<Trainer, 'id' | 'firstName' | 'lastName'>[];
  locations?: Pick<Location, 'id' | 'name'>[];
};

type AnalyticsParticipant = Pick<
  Registration,
  'sessionId' | 'status' | 'userId' | 'participantEmail' | 'referralSource'
>;

type AnalyticsRating = Pick<Feedback, 'sessionId' | 'rating' | 'feedbackType'>;

interface NamedAggregate {
  id: string | null;
  name: string;
  sessions: number;
  capacity: number;
  seatsTaken: number;
  participantIds: Set<string>;
}

const isParticipant = (status: RegistrationStatus): boolean =>
  status === RegistrationStatus.CONFIRMED ||
  status === RegistrationStatus.COMPLETED;

function registrationStatusBreakdown(registrations: AnalyticsParticipant[]) {
  return Object.values(RegistrationStatus).map((status) => ({
    status,
    count: registrations.filter(
      (registration) => registration.status === status,
    ).length,
  }));
}

const sessionTrainers = (session: AnalyticsSession) => {
  const trainers = new Map<string, { id: string | null; name: string }>();
  for (const trainer of session.trainers ?? []) {
    trainers.set(trainer.id, {
      id: trainer.id,
      name: `${trainer.firstName} ${trainer.lastName}`.trim(),
    });
  }
  if (session.trainerId || (session.trainerName ?? '').trim()) {
    const trainer = {
      id: session.trainerId,
      name: (session.trainerName ?? '').trim() || 'Coach non renseigné',
    };
    trainers.set(aggregateKey(trainer.id, trainer.name), trainer);
  }
  return Array.from(trainers.values());
};

const sessionLocations = (session: AnalyticsSession) => {
  const locations = new Map<string, { id: string | null; name: string }>();
  for (const location of session.locations ?? []) {
    locations.set(location.id, { id: location.id, name: location.name });
  }
  if (session.locationId || (session.locationName ?? '').trim()) {
    const location = {
      id: session.locationId,
      name: (session.locationName ?? '').trim() || 'Lieu non renseigné',
    };
    locations.set(aggregateKey(location.id, location.name), location);
  }
  return Array.from(locations.values());
};

const aggregateKey = (id: string | null, name: string): string =>
  id ?? `legacy:${name.toLocaleLowerCase('fr')}`;

const sortedAggregates = (aggregates: Map<string, NamedAggregate>) =>
  Array.from(aggregates.values())
    .map(({ id, name, sessions, capacity, seatsTaken, participantIds }) => ({
      id,
      name,
      sessions,
      participants: participantIds.size,
      capacity,
      seatsTaken,
      occupancyRate: capacity
        ? Math.round((seatsTaken / capacity) * 1000) / 10
        : null,
    }))
    .sort(
      (first, second) =>
        second.sessions - first.sessions ||
        second.participants - first.participants ||
        first.name.localeCompare(second.name, 'fr'),
    );

const canonicalReferralSource = (source: string | null): string => {
  const label = source?.trim();
  if (!label) return 'Non renseigné';

  const normalized = label
    .toLocaleLowerCase('fr')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (
    /facebook|instagram|tiktok|linkedin|twitter|reseaux sociaux/.test(
      normalized,
    )
  ) {
    return 'Réseaux sociaux';
  }
  if (
    /bouche.?a.?oreille|ami|famille|collegue|recommandation|parrainage/.test(
      normalized,
    )
  ) {
    return 'Bouche-à-oreille';
  }
  if (/internet|web|google|site en ligne/.test(normalized)) {
    return 'Internet';
  }
  if (
    /publicite|publicitaire|flyer|affiche|radio|television/.test(normalized)
  ) {
    return 'Publicité';
  }
  return label;
};

const SOCIAL_NETWORK_ALIASES = new Map([
  ['facebook', 'Facebook'],
  ['instagram', 'Instagram'],
  ['linkedin', 'LinkedIn'],
  ['tiktok', 'TikTok'],
  ['twitter', 'X/Twitter'],
  ['x', 'X/Twitter'],
]);

const canonicalSocialNetwork = (source: string | null): string | null => {
  const normalized = source
    ?.trim()
    .toLocaleLowerCase('fr')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  return normalized ? (SOCIAL_NETWORK_ALIASES.get(normalized) ?? null) : null;
};

export function calculateAnalyticsBreakdowns(
  allSessions: AnalyticsSession[],
  registrations: AnalyticsParticipant[],
  feedback: AnalyticsRating[],
  filters: AnalyticsFilters,
  trainings: { id: string; title: string }[],
) {
  const eligibleSessions = allSessions.filter((session) => {
    if (
      session.lifecycleStatus === SessionLifecycleStatus.CANCELLED ||
      session.lifecycleStatus === SessionLifecycleStatus.DRAFT
    ) {
      return false;
    }
    if (filters.startDate && session.startDate < filters.startDate)
      return false;
    if (filters.endDate && session.startDate > filters.endDate) return false;
    if (
      filters.trainingId &&
      session.trainingId !== filters.trainingId &&
      session.training?.id !== filters.trainingId
    ) {
      return false;
    }
    if (
      filters.trainerId &&
      !sessionTrainers(session).some(
        (trainer) => trainer.id === filters.trainerId,
      )
    ) {
      return false;
    }
    if (
      filters.locationId &&
      !sessionLocations(session).some(
        (location) => location.id === filters.locationId,
      )
    ) {
      return false;
    }
    return true;
  });
  const sessionsById = new Map(
    eligibleSessions.map((session) => [session.id, session]),
  );
  const participantsBySession = new Map<string, AnalyticsParticipant[]>();
  for (const registration of registrations) {
    if (!sessionsById.has(registration.sessionId)) continue;
    const participants =
      participantsBySession.get(registration.sessionId) ?? [];
    participants.push(registration);
    participantsBySession.set(registration.sessionId, participants);
  }

  const coaches = new Map<string, NamedAggregate>();
  const locations = new Map<string, NamedAggregate>();
  for (const session of eligibleSessions) {
    const participants = (participantsBySession.get(session.id) ?? []).filter(
      (registration) => isParticipant(registration.status),
    );
    for (const coach of sessionTrainers(session)) {
      if (filters.trainerId && coach.id !== filters.trainerId) continue;
      const key = aggregateKey(coach.id, coach.name);
      const aggregate = coaches.get(key) ?? {
        id: coach.id,
        name: coach.name,
        sessions: 0,
        capacity: 0,
        seatsTaken: 0,
        participantIds: new Set<string>(),
      };
      aggregate.sessions += 1;
      aggregate.capacity += Math.max(0, session.capacity);
      aggregate.seatsTaken += Math.min(
        Math.max(0, session.seatsTaken),
        Math.max(0, session.capacity),
      );
      for (const participant of participants) {
        aggregate.participantIds.add(
          participant.userId ??
            participant.participantEmail.trim().toLocaleLowerCase('fr'),
        );
      }
      coaches.set(key, aggregate);
    }
    for (const location of sessionLocations(session)) {
      if (filters.locationId && location.id !== filters.locationId) continue;
      const key = aggregateKey(location.id, location.name);
      const aggregate = locations.get(key) ?? {
        id: location.id,
        name: location.name,
        sessions: 0,
        capacity: 0,
        seatsTaken: 0,
        participantIds: new Set<string>(),
      };
      aggregate.sessions += 1;
      aggregate.capacity += Math.max(0, session.capacity);
      aggregate.seatsTaken += Math.min(
        Math.max(0, session.seatsTaken),
        Math.max(0, session.capacity),
      );
      for (const participant of participants) {
        aggregate.participantIds.add(
          participant.userId ??
            participant.participantEmail.trim().toLocaleLowerCase('fr'),
        );
      }
      locations.set(key, aggregate);
    }
  }

  const sourceCounts = new Map<string, number>();
  const socialNetworkCounts = new Map<string, number>();
  let socialNetworkRegistrations = 0;
  for (const sessionRegistrations of participantsBySession.values()) {
    for (const registration of sessionRegistrations) {
      if (registration.status === RegistrationStatus.CANCELLED) continue;
      const source = canonicalReferralSource(registration.referralSource);
      sourceCounts.set(source, (sourceCounts.get(source) ?? 0) + 1);
      if (source === 'Réseaux sociaux') {
        socialNetworkRegistrations += 1;
        const network = canonicalSocialNetwork(registration.referralSource);
        if (network) {
          socialNetworkCounts.set(
            network,
            (socialNetworkCounts.get(network) ?? 0) + 1,
          );
        }
      }
    }
  }
  const sourceTotal = Array.from(sourceCounts.values()).reduce(
    (total, count) => total + count,
    0,
  );
  const registrationsByTraining = new Map<
    string,
    { training: string; registrations: AnalyticsParticipant[] }
  >();
  const registrationsBySession = eligibleSessions.map((session) => {
    const trainingName =
      session.training?.title ??
      trainings.find(({ id }) => id === session.trainingId)?.title ??
      'Formation non renseignée';
    const registrationsForSession = participantsBySession.get(session.id) ?? [];
    const trainingSummary = registrationsByTraining.get(session.trainingId) ?? {
      training: trainingName,
      registrations: [],
    };
    trainingSummary.registrations.push(...registrationsForSession);
    registrationsByTraining.set(session.trainingId, trainingSummary);
    const capacity = Math.max(0, session.capacity);
    const seatsTaken = Math.min(Math.max(0, session.seatsTaken), capacity);
    return {
      training: trainingName,
      startDate: session.startDate,
      capacity,
      seatsTaken,
      occupancy: capacity ? Math.round((seatsTaken / capacity) * 100) : 0,
      registrations: registrationsForSession.length,
      byStatus: registrationStatusBreakdown(registrationsForSession),
    };
  });
  const registrationCountsByTraining = Array.from(
    registrationsByTraining.values(),
  )
    .map(({ training, registrations }) => ({
      training,
      registrations: registrations.length,
      byStatus: registrationStatusBreakdown(registrations),
    }))
    .sort(
      (first, second) =>
        second.registrations - first.registrations ||
        first.training.localeCompare(second.training, 'fr'),
    );

  const referralSources = Array.from(
    sourceCounts,
    ([source, registrations]) => ({
      source,
      registrations,
      percentage: sourceTotal
        ? Math.round((registrations / sourceTotal) * 1000) / 10
        : 0,
    }),
  ).sort(
    (first, second) =>
      second.registrations - first.registrations ||
      first.source.localeCompare(second.source, 'fr'),
  );
  const referralSourceDetails = {
    eligibleRegistrations: sourceTotal,
    socialNetworkRegistrations,
    unspecifiedSocialNetwork:
      socialNetworkRegistrations -
      Array.from(socialNetworkCounts.values()).reduce(
        (total, count) => total + count,
        0,
      ),
    networks: Array.from(socialNetworkCounts, ([network, registrations]) => ({
      network,
      registrations,
      percentageOfSocialRegistrations: socialNetworkRegistrations
        ? Math.round((registrations / socialNetworkRegistrations) * 1000) / 10
        : 0,
      percentageOfEligibleRegistrations: sourceTotal
        ? Math.round((registrations / sourceTotal) * 1000) / 10
        : 0,
    })).sort(
      (first, second) =>
        second.registrations - first.registrations ||
        first.network.localeCompare(second.network, 'fr'),
    ),
  };

  const ratingAggregates = new Map<
    string,
    { trainingId: string; training: string; ratings: number[] }
  >();
  for (const training of trainings) {
    if (filters.trainingId && training.id !== filters.trainingId) continue;
    ratingAggregates.set(training.id, {
      trainingId: training.id,
      training: training.title,
      ratings: [],
    });
  }
  for (const session of eligibleSessions) {
    const trainingId = session.training?.id ?? session.trainingId;
    const trainingName =
      session.training?.title ??
      trainings.find((training) => training.id === trainingId)?.title ??
      'Formation non renseignée';
    if (!ratingAggregates.has(trainingId)) {
      if (filters.trainingId && filters.trainingId !== trainingId) continue;
      ratingAggregates.set(trainingId, {
        trainingId,
        training: trainingName,
        ratings: [],
      });
    }
  }
  if (filters.trainingId && !ratingAggregates.has(filters.trainingId)) {
    const training = trainings.find(({ id }) => id === filters.trainingId);
    if (training) {
      ratingAggregates.set(training.id, {
        trainingId: training.id,
        training: training.title,
        ratings: [],
      });
    }
  }
  for (const rating of feedback) {
    const session = sessionsById.get(rating.sessionId);
    if (!session || rating.feedbackType !== FeedbackType.TRAINING) continue;
    if (
      !Number.isInteger(rating.rating) ||
      rating.rating < 1 ||
      rating.rating > 5
    ) {
      continue;
    }
    const trainingId = session.training?.id ?? session.trainingId;
    ratingAggregates.get(trainingId)?.ratings.push(rating.rating);
  }
  const trainingRatings = Array.from(ratingAggregates.values())
    .map(({ trainingId, training, ratings }) => ({
      trainingId,
      training,
      averageRating: ratings.length
        ? Math.round(
            (ratings.reduce((total, rating) => total + rating, 0) /
              ratings.length) *
              100,
          ) / 100
        : null,
      reviewCount: ratings.length,
      distribution: [1, 2, 3, 4, 5].map((rating) => ({
        rating,
        count: ratings.filter((value) => value === rating).length,
      })),
    }))
    .sort(
      (first, second) =>
        (second.averageRating ?? -1) - (first.averageRating ?? -1) ||
        second.reviewCount - first.reviewCount ||
        first.training.localeCompare(second.training, 'fr'),
    );

  const feedbackRatings = new Map<FeedbackType, number[]>(
    Object.values(FeedbackType).map((type) => [type, []]),
  );
  for (const rating of feedback) {
    if (
      !sessionsById.has(rating.sessionId) ||
      !Number.isInteger(rating.rating) ||
      rating.rating < 1 ||
      rating.rating > 5
    ) {
      continue;
    }
    feedbackRatings.get(rating.feedbackType)?.push(rating.rating);
  }

  return {
    coaches: sortedAggregates(coaches),
    locations: sortedAggregates(locations),
    referralSources,
    referralSourceDetails,
    trainingRatings,
    feedbackByType: Array.from(feedbackRatings, ([type, ratings]) => ({
      type,
      averageRating: ratings.length
        ? Math.round(
            (ratings.reduce((total, rating) => total + rating, 0) /
              ratings.length) *
              100,
          ) / 100
        : 0,
      count: ratings.length,
    })),
    registrationCountsByTraining,
    registrationCountsBySession: registrationsBySession.sort(
      (first, second) =>
        second.registrations - first.registrations ||
        first.startDate.localeCompare(second.startDate),
    ),
  };
}
