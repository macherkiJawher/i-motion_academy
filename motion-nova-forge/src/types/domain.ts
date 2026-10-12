/**
 * Domain model — mirrors the PostgreSQL schema exposed by the NestJS API.
 * Do not add entities that do not exist in the backend model.
 */

export type Role = "VISITOR" | "PARTICIPANT" | "ADMIN";

export type AxisCode =
  "EMS" | "LANGUAGES" | "MANAGEMENT" | "AI" | "SPORT_COACHING" | "WELLNESS" | "BTP" | "BTS";
export type RecognitionType = "NONE" | "I_MOTION_CERTIFICATE" | "BTP_DIPLOMA" | "BTS_DIPLOMA";
export type ApprovalStatus = "NOT_APPLICABLE" | "PENDING" | "APPROVED";
export type TrainingLifecycleStatus = "DRAFT" | "IN_REVIEW" | "PUBLISHED" | "ARCHIVED";
export type TrainingDurationUnit = "HOURS" | "DAYS" | "WEEKS" | "MONTHS" | "YEARS";

export interface Axis {
  id: string;
  code: AxisCode;
  name: string;
  description: string;
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  role: Role;
  createdAt: string;
  avatarUrl?: string | null;
}

export interface Trainer {
  id: string;
  userId: string | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  speciality: string;
  expertise: string[];
  biography: string;
  photoUrl: string;
  yearsExperience: number;
  trainingIds?: string[];
  trainings?: Training[];
  slug: string;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type LocationType = "PHYSICAL" | "ONLINE";

export type TrainingLevel = "Foundation" | "Advanced" | "Master";

export interface Training {
  id: string;
  slug: string;
  title: string;
  axisCode: AxisCode;
  subcategory: string;
  recognitionType: RecognitionType;
  approvalStatus: ApprovalStatus;
  approvalReference: string | null;
  approvalAuthority: string | null;
  approvalValidUntil: string | null;
  lifecycleStatus?: TrainingLifecycleStatus;
  tagline: string;
  description: string;
  level: TrainingLevel;
  durationHours: number | null;
  durationValue?: number;
  durationUnit?: TrainingDurationUnit;
  price: number;
  currency: string;
  certification: string | null;
  credentialTitle?: string | null;
  credentialIssuer?: string | null;
  targetAudience: string;
  prerequisites: string;
  skills: string[];
  objectives?: string[];
  program: { title: string; detail: string; hours?: number | null | undefined }[];
  coverUrl: string;
  rating: number;
  learners: number;
  active: boolean;
}

export interface Location {
  id: string;
  name: string;
  type?: LocationType;
  city: string;
  country: string;
  address: string;
  latitude?: number | null;
  longitude?: number | null;
  contactName?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  instructions?: string;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type SessionStatus = "OPEN" | "ALMOST_FULL" | "FULL" | "CLOSED";
export type SessionLifecycleStatus = "DRAFT" | "SCHEDULED" | "CANCELLED" | "COMPLETED";

export interface TrainingSession {
  id: string;
  trainingId: string;
  trainingSlug: string;
  trainingTitle: string;
  axisCode: AxisCode;
  trainerId: string;
  trainerName: string;
  locationId: string;
  locationName: string;
  trainerIds?: string[];
  locationIds?: string[];
  trainers?: Pick<Trainer, "id" | "slug" | "firstName" | "lastName" | "speciality">[];
  locations?: Pick<
    Location,
    "id" | "name" | "type" | "city" | "country" | "address" | "latitude" | "longitude"
  >[];
  city: string;
  address?: string;
  latitude?: number | null;
  longitude?: number | null;
  mode: "On-site" | "Hybrid" | "Live online";
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  meetingUrl?: string | null;
  scheduleDetails?: string | null;
  capacity: number;
  seatsTaken: number;
  seatsLeft: number;
  status: SessionStatus;
  lifecycleStatus?: SessionLifecycleStatus;
  price: number;
  currency: string;
  certification: string | null;
}

export type RegistrationStatus = "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
export type PaymentStatus = "PENDING" | "PARTIAL" | "PAID" | "FAILED";

export interface Registration {
  id: string;
  reference: string;
  userId: string;
  participantName: string;
  participantEmail: string;
  phone?: string | null;
  birthDate?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  educationLevel?: string | null;
  workExperience?: string | null;
  employmentStatus?: string | null;
  identityDocument?: string | null;
  qualificationDocument?: string | null;
  identityDocumentAvailable?: boolean;
  qualificationDocumentAvailable?: boolean;
  motivation?: string | null;
  referralSource?: string | null;
  sessionId: string;
  trainingTitle: string;
  trainingSlug: string;
  sessionStartDate: string;
  sessionCity?: string;
  createdAt: string;
  status: RegistrationStatus;
  paymentStatus: PaymentStatus;
  amountDue: number;
  amountPaid: number;
  currency: string;
  certificateId: string | null;
  timeline: RegistrationEvent[];
}

export interface RegistrationEvent {
  step: "SUBMITTED" | "VALIDATED" | "PAYMENT" | "SESSION" | "COMPLETION" | "CERTIFICATE";
  label: string;
  description: string;
  status: "DONE" | "CURRENT" | "PENDING";
  date: string | null;
}

export type PaymentMethod = "CARD" | "TRANSFER" | "CASH" | "CHEQUE";

export interface Payment {
  id: string;
  reference: string;
  registrationId: string;
  userId: string;
  participantName: string;
  trainingTitle: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  status: PaymentStatus;
  paidAt: string | null;
  createdAt: string;
}

export type CertificateType = "CERTIFICATE" | "DIPLOMA";

export interface Certificate {
  id: string;
  number: string;
  userId: string;
  participantName: string;
  registrationId: string;
  trainingTitle: string;
  type: CertificateType;
  issuedAt: string;
  completedAt?: string | null;
  status: "ISSUED" | "ARCHIVED" | "REVOKED";
  fileUrl: string | null;
  revokedAt?: string | null;
  revocationReason?: string | null;
}

export type NotificationType =
  | "REGISTRATION_RECEIVED"
  | "REGISTRATION_CONFIRMED"
  | "PAYMENT"
  | "SESSION_REMINDER"
  | "CERTIFICATE_AVAILABLE"
  | "SYSTEM";

export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  link?: string | null;
}

export type ContactStatus = "NEW" | "IN_PROGRESS" | "RESOLVED";

export interface ContactRequest {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  status: ContactStatus;
  createdAt: string;
}

export type ComplaintCategory =
  "REGISTRATION" | "PAYMENT" | "SESSION" | "TRAINING" | "TRAINER" | "CERTIFICATE" | "OTHER";
export type ComplaintStatus =
  "NEW" | "IN_PROGRESS" | "WAITING_FOR_PARTICIPANT" | "RESOLVED" | "CLOSED" | "REJECTED";
export type ComplaintPriority = "LOW" | "NORMAL" | "HIGH" | "CRITICAL";

export interface ComplaintMessage {
  id: string;
  complaintId: string;
  authorId: string;
  content: string;
  visibility: "PARTICIPANT" | "INTERNAL";
  createdAt: string;
  author?: Pick<User, "id" | "firstName" | "lastName" | "role">;
}

export interface ComplaintEvent {
  id: string;
  complaintId: string;
  actorId: string | null;
  type: string;
  details: string | null;
  createdAt: string;
  actor?: Pick<User, "id" | "firstName" | "lastName"> | null;
}

export interface Complaint {
  id: string;
  reference: string;
  userId: string;
  category: ComplaintCategory;
  subject: string;
  description: string;
  concernedName: string | null;
  status: ComplaintStatus;
  priority: ComplaintPriority;
  assignedToUserId: string | null;
  registrationId: string | null;
  paymentId: string | null;
  sessionId: string | null;
  certificateId: string | null;
  resolution: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
  user?: Pick<User, "id" | "firstName" | "lastName" | "email">;
  assignedTo?: Pick<User, "id" | "firstName" | "lastName"> | null;
  messages?: ComplaintMessage[];
  events?: ComplaintEvent[];
  attachments?: {
    id: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    createdAt: string;
  }[];
}

export type AuthUser = User;

export interface AuthSession {
  user: AuthUser;
  /** Access token is kept in memory/storage by the auth layer, never rendered. */
  accessToken: string;
}

export interface AdminAuditAction {
  id: string;
  actorName: string;
  actorRole: Role;
  action: string;
  entity: string;
  entityId: string;
  details: string;
  createdAt: string;
  status: "SUCCESS" | "WARNING" | "FAILED";
}

export interface UserSessionAudit {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  ipAddress: string;
  device: string;
  browser: string;
  location: string;
  lastSeenAt: string;
  startedAt: string;
  status: "ACTIVE" | "IDLE" | "EXPIRED";
}

export interface AuditLogsData {
  summary: {
    totalActions: number;
    activeSessions: number;
    riskySessions: number;
    lastSyncAt: string;
  };
  actions: AdminAuditAction[];
  userSessions: UserSessionAudit[];
}

export interface Kpi {
  label: string;
  value: number;
  unit?: string;
  delta?: number;
}

export interface AnalyticsFilters {
  startDate?: string;
  endDate?: string;
  trainingId?: string;
  trainerId?: string;
  locationId?: string;
}

export interface AdminAnalytics {
  kpis: {
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
    revenueByCurrency: { currency: string; amount: number }[];
    outstandingBalance: number | null;
    outstandingBalanceByCurrency: { currency: string; amount: number }[];
    averageDueByCurrency: { currency: string; amount: number }[];
  };
  registrationTrend: { month: string; registrations: number }[];
  revenueByAxis: { axis: string; currency: string; amount: number }[];
  paymentMethods: {
    method: PaymentMethod;
    currency: string;
    amount: number;
    transactions: number;
  }[];
  trainingPopularity: { training: string; registrations: number }[];
  sessionOccupancy: {
    session: string;
    startDate: string;
    seatsTaken: number;
    capacity: number;
    occupancy: number;
  }[];
  referralSources: { source: string; registrations: number; percentage: number }[];
  coachAnalytics: {
    coaches: { id: string | null; name: string; sessions: number; participants: number }[];
  };
  locationAnalytics: {
    locations: { id: string | null; name: string; sessions: number; participants: number }[];
  };
  trainingRatings: {
    trainingId: string;
    training: string;
    averageRating: number | null;
    reviewCount: number;
    distribution: { rating: number; count: number }[];
  }[];
  filterOptions: {
    trainings: { id: string; name: string }[];
    coaches: { id: string; name: string }[];
    locations: { id: string; name: string }[];
  };
  comparison: {
    currentPeriod: string;
    previousPeriod: string;
    registrations: {
      current: number;
      previous: number;
      changePercent: number | null;
    };
    revenueByCurrency: {
      currency: string;
      current: number;
      previous: number;
      changePercent: number | null;
    }[];
  };
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
