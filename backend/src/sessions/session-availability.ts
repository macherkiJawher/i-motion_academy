import {
  Session,
  SessionLifecycleStatus,
  SessionStatus,
} from './entities/session.entity';
import { trainingAvailabilityError } from '../trainings/training-availability';

export function isSessionAvailableForRegistration(
  session: Partial<Session>,
  today = new Date().toISOString().slice(0, 10),
): boolean {
  const training = session.training;
  if (
    !training ||
    !session.trainingId ||
    session.trainingId !== training.id ||
    trainingAvailabilityError(training, today) !== null
  ) {
    return false;
  }

  const capacity = session.capacity;
  const seatsTaken = session.seatsTaken;
  const price = session.price;
  const currency = session.currency;

  return (
    session.lifecycleStatus === SessionLifecycleStatus.SCHEDULED &&
    typeof session.startDate === 'string' &&
    typeof session.endDate === 'string' &&
    session.startDate >= today &&
    session.endDate >= today &&
    typeof capacity === 'number' &&
    Number.isFinite(capacity) &&
    typeof seatsTaken === 'number' &&
    Number.isFinite(seatsTaken) &&
    capacity - seatsTaken > 0 &&
    (session.status === SessionStatus.OPEN ||
      session.status === SessionStatus.ALMOST_FULL) &&
    currency === training.currency &&
    typeof currency === 'string' &&
    /^[A-Z]{3}$/.test(currency) &&
    typeof price === 'number' &&
    Number.isFinite(price) &&
    price >= 0
  );
}
