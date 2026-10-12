/**
 * Service layer. Every screen talks to these functions only — never to fetch
 * directly. Most calls can fall back to local fixtures; administrator
 * analytics requires the NestJS API so demonstration data is never presented
 * as live database statistics.
 */
import {
  ApiError,
  api,
  downloadFile,
  hasApi,
  postForm,
  tokenStore,
  withFallback,
} from "@/api/client";
import * as fx from "@/api/fixtures";
import type {
  AdminAnalytics,
  AnalyticsFilters,
  AdminAuditAction,
  AppNotification,
  AuditLogsData,
  AuthSession,
  Axis,
  Certificate,
  ContactRequest,
  Location,
  Payment,
  Registration,
  Trainer,
  Training,
  TrainingSession,
  User,
} from "@/types/domain";

export { publicAssistantService } from "./public-assistant";
export { PublicAssistantError, isPublicAssistantChatResponse } from "./public-assistant";
export type { PublicAssistantCallOptions, PublicAssistantErrorCode } from "./public-assistant";

/** Mutable in-memory copies so fixture mode reflects user actions in-session. */
const store = {
  registrations: [...fx.registrations],
  notifications: [...fx.notifications],
  contactRequests: [...fx.contactRequests],
  trainings: [...fx.trainings],
  sessions: [...fx.sessions],
  locations: [...fx.locations],
  trainers: [...fx.trainers],
  users: [...fx.users],
};

const uid = () => `tmp-${Math.random().toString(36).slice(2, 10)}`;

/* ------------------------------- auth ---------------------------------- */

const DEMO_ACCOUNTS: Record<string, User> = {
  "participant@i-motion.academy": fx.users[0]!,
  "admin@i-motion.academy": fx.users.find((u) => u.role === "ADMIN")!,
};

export const authService = {
  login: async (email: string, password: string) =>
    withFallback<AuthSession>(
      async () => {
        const response = await api.post<{
          user: User;
          accessToken?: string;
          access_token?: string;
        }>("/auth/login", { email, password });
        return { user: response.user, accessToken: response.accessToken ?? response.access_token! };
      },
      () => {
        const user = DEMO_ACCOUNTS[email.toLowerCase()] ?? fx.users[0]!;
        return { user, accessToken: `demo.${user.role.toLowerCase()}.token` };
      },
    ),
  completeGoogleLogin: async (token: string) => {
    if (!token) throw new Error("Google login token is missing.");
    tokenStore.set(token);
    const user = await api.get<User>("/auth/me");
    return { user, accessToken: token };
  },
  register: async (input: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    password: string;
  }) =>
    withFallback<AuthSession>(
      async () => {
        await api.post<User>("/auth/register", input);
        const response = await api.post<{
          user: User;
          accessToken?: string;
          access_token?: string;
        }>("/auth/login", {
          email: input.email,
          password: input.password,
        });
        return { user: response.user, accessToken: response.accessToken ?? response.access_token! };
      },
      () => ({
        user: {
          id: uid(),
          firstName: input.firstName,
          lastName: input.lastName,
          email: input.email,
          phone: input.phone,
          role: "PARTICIPANT",
          createdAt: new Date().toISOString(),
        },
        accessToken: "demo.participant.token",
      }),
    ),
  me: () =>
    withFallback<User>(
      () => api.get<User>("/auth/me"),
      () => fx.users[0]!,
      120,
    ),
  forgotPassword: (email: string) => {
    if (!hasApi) {
      throw new ApiError("Le service de réinitialisation nécessite le serveur.", 503);
    }
    return api.post<{ message: string }>("/auth/forgot-password", { email });
  },
  resetPassword: (token: string, password: string) => {
    if (!hasApi) {
      throw new ApiError("Le service de réinitialisation nécessite le serveur.", 503);
    }
    return api.post<{ reset: boolean }>("/auth/reset-password", { token, password });
  },
  logout: () => {
    tokenStore.clear();
  },
};

/* ------------------------------ catalog -------------------------------- */

export const catalogService = {
  axes: () =>
    withFallback<Axis[]>(
      () => api.get<Axis[]>("/axes"),
      () => fx.axes,
    ),
  locations: () =>
    withFallback<Location[]>(
      () => api.get<Location[]>("/locations"),
      () => store.locations.filter((location) => location.active !== false),
    ),
  adminLocations: () =>
    withFallback<Location[]>(
      () => api.get<Location[]>("/locations/admin"),
      () => store.locations,
    ),
  createLocation: (input: Omit<Location, "id" | "createdAt" | "updatedAt">) =>
    withFallback<Location>(
      () => api.post<Location>("/locations", input),
      () => {
        const created = { ...input, id: uid() };
        store.locations = [created, ...store.locations];
        return created;
      },
    ),
  updateLocation: (id: string, input: Partial<Omit<Location, "id" | "createdAt" | "updatedAt">>) =>
    withFallback<Location>(
      () => api.patch<Location>(`/locations/${id}`, input),
      () => {
        store.locations = store.locations.map((location) =>
          location.id === id ? { ...location, ...input } : location,
        );
        return store.locations.find((location) => location.id === id)!;
      },
    ),
  archiveLocation: (id: string) =>
    withFallback<Location>(
      () => api.delete<Location>(`/locations/${id}`),
      () => {
        store.locations = store.locations.map((location) =>
          location.id === id ? { ...location, active: false } : location,
        );
        return store.locations.find((location) => location.id === id)!;
      },
    ),
  restoreLocation: (id: string) =>
    withFallback<Location>(
      () => api.post<Location>(`/locations/${id}/restore`),
      () => {
        store.locations = store.locations.map((location) =>
          location.id === id ? { ...location, active: true } : location,
        );
        return store.locations.find((location) => location.id === id)!;
      },
    ),
  trainings: () => api.get<Training[]>("/trainings"),
  adminTrainings: () => api.get<Training[]>("/trainings/admin"),
  training: (idOrSlug: string) =>
    withFallback<Training | null>(
      () => api.get<Training>(`/trainings/${idOrSlug}`),
      () => store.trainings.find((t) => t.slug === idOrSlug || t.id === idOrSlug) ?? null,
    ),
  createTraining: (input: Partial<Training>) =>
    withFallback<Training>(
      () => api.post<Training>("/trainings", input),
      () => {
        const created = { ...(store.trainings[0] as Training), ...input, id: uid() } as Training;
        store.trainings = [created, ...store.trainings];
        return created;
      },
    ),
  updateTraining: (id: string, input: Partial<Training>) =>
    withFallback<Training>(
      () => api.patch<Training>(`/trainings/${id}`, input),
      () => {
        store.trainings = store.trainings.map((t) => (t.id === id ? { ...t, ...input } : t));
        return store.trainings.find((t) => t.id === id)!;
      },
    ),
  deleteTraining: (id: string) =>
    withFallback<{ ok: true }>(
      () => api.delete<{ ok: true }>(`/trainings/${id}`),
      () => {
        store.trainings = store.trainings.filter((t) => t.id !== id);
        return { ok: true as const };
      },
    ),
};

/* ------------------------------ sessions ------------------------------- */

export const sessionService = {
  list: () =>
    withFallback<TrainingSession[]>(
      () => api.get<TrainingSession[]>("/sessions"),
      () => store.sessions,
    ),
  adminList: () => api.get<TrainingSession[]>("/sessions/admin"),
  get: (id: string) =>
    withFallback<TrainingSession | null>(
      () => api.get<TrainingSession>(`/sessions/${id}`),
      () => store.sessions.find((s) => s.id === id) ?? null,
    ),
  byTrainer: (trainerId: string) =>
    withFallback<TrainingSession[]>(
      () => api.get<TrainingSession[]>(`/trainers/${trainerId}/sessions`),
      () => store.sessions.filter((s) => s.trainerId === trainerId),
    ),
  create: (input: Partial<TrainingSession>) =>
    withFallback<TrainingSession>(
      () => api.post<TrainingSession>("/sessions", input),
      () => {
        const created = {
          ...(store.sessions[0] as TrainingSession),
          ...input,
          id: uid(),
        } as TrainingSession;
        store.sessions = [created, ...store.sessions];
        return created;
      },
    ),
  update: (id: string, input: Partial<TrainingSession>) =>
    withFallback<TrainingSession>(
      () => api.patch<TrainingSession>(`/sessions/${id}`, input),
      () => {
        store.sessions = store.sessions.map((s) => (s.id === id ? { ...s, ...input } : s));
        return store.sessions.find((s) => s.id === id)!;
      },
    ),
  remove: (id: string) =>
    withFallback<{ ok: true }>(
      () => api.delete<{ ok: true }>(`/sessions/${id}`),
      () => {
        store.sessions = store.sessions.filter((s) => s.id !== id);
        return { ok: true as const };
      },
    ),
};

/* ------------------------------ trainers ------------------------------- */

export const trainerService = {
  list: () =>
    withFallback<Trainer[]>(
      () => api.get<Trainer[]>("/trainers"),
      () => store.trainers.filter((trainer) => trainer.active !== false),
    ),
  adminList: () =>
    withFallback<Trainer[]>(
      () => api.get<Trainer[]>("/trainers/admin"),
      () => store.trainers,
    ),
  get: (idOrSlug: string) =>
    withFallback<Trainer | null>(
      () => api.get<Trainer>(`/trainers/${idOrSlug}`),
      () => store.trainers.find((t) => t.slug === idOrSlug || t.id === idOrSlug) ?? null,
    ),
  create: (input: Omit<Trainer, "id" | "trainings" | "createdAt" | "updatedAt">) =>
    withFallback<Trainer>(
      () => api.post<Trainer>("/trainers", input),
      () => {
        const created = { ...input, id: uid() };
        store.trainers = [created, ...store.trainers];
        return created;
      },
    ),
  update: (
    id: string,
    input: Partial<Omit<Trainer, "id" | "trainings" | "createdAt" | "updatedAt">>,
  ) =>
    withFallback<Trainer>(
      () => api.patch<Trainer>(`/trainers/${id}`, input),
      () => {
        store.trainers = store.trainers.map((trainer) =>
          trainer.id === id ? { ...trainer, ...input } : trainer,
        );
        return store.trainers.find((trainer) => trainer.id === id)!;
      },
    ),
  archive: (id: string) =>
    withFallback<Trainer>(
      () => api.delete<Trainer>(`/trainers/${id}`),
      () => {
        store.trainers = store.trainers.map((trainer) =>
          trainer.id === id ? { ...trainer, active: false } : trainer,
        );
        return store.trainers.find((trainer) => trainer.id === id)!;
      },
    ),
  restore: (id: string) =>
    withFallback<Trainer>(
      () => api.post<Trainer>(`/trainers/${id}/restore`),
      () => {
        store.trainers = store.trainers.map((trainer) =>
          trainer.id === id ? { ...trainer, active: true } : trainer,
        );
        return store.trainers.find((trainer) => trainer.id === id)!;
      },
    ),
};

/* ---------------------------- registrations ---------------------------- */

export const registrationService = {
  list: () =>
    withFallback<Registration[]>(
      () => api.get<Registration[]>("/registrations"),
      () => store.registrations,
    ),
  mine: (userId: string) =>
    withFallback<Registration[]>(
      () => api.get<Registration[]>("/registrations/me"),
      () => store.registrations.filter((r) => r.userId === userId),
    ),
  get: (id: string) =>
    withFallback<Registration | null>(
      () => api.get<Registration>(`/registrations/${id}`),
      () => store.registrations.find((r) => r.id === id) ?? null,
    ),
  bySession: (sessionId: string) =>
    withFallback<Registration[]>(
      () => api.get<Registration[]>(`/registrations/session/${sessionId}`),
      () => store.registrations.filter((r) => r.sessionId === sessionId),
    ),
  create: (input: {
    userId?: string;
    sessionId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    birthDate?: string;
    address?: string;
    city?: string;
    country?: string;
    educationLevel?: string;
    workExperience?: string;
    employmentStatus?: string;
    identityDocument?: string;
    qualificationDocument?: string;
    motivation?: string;
    referralSource?: string;
    notes?: string;
  }) =>
    withFallback<Registration>(
      () => api.post<Registration>("/registrations", input),
      () => {
        const session = store.sessions.find((s) => s.id === input.sessionId)!;
        const created: Registration = {
          id: uid(),
          reference: `IMA-2026-${Math.floor(1000 + Math.random() * 8999)}`,
          userId: "u-1",
          participantName: `${input.firstName} ${input.lastName}`,
          participantEmail: input.email,
          sessionId: session.id,
          trainingTitle: session.trainingTitle,
          trainingSlug: session.trainingSlug,
          sessionStartDate: session.startDate,
          city: session.city,
          createdAt: new Date().toISOString(),
          status: "PENDING",
          paymentStatus: "PENDING",
          amountDue: session.price,
          amountPaid: 0,
          currency: session.currency,
          certificateId: null,
          timeline: (store.registrations[2] as Registration).timeline.map((t, i) => ({
            ...t,
            status: i === 0 ? "DONE" : i === 1 ? "CURRENT" : "PENDING",
            date: i === 0 ? new Date().toISOString().slice(0, 10) : null,
          })),
        };
        store.registrations = [created, ...store.registrations];
        return created;
      },
      600,
    ),
  updateStatus: (id: string, status: Registration["status"]) =>
    withFallback<Registration>(
      () => api.patch<Registration>(`/registrations/${id}`, { status }),
      () => {
        store.registrations = store.registrations.map((r) => (r.id === id ? { ...r, status } : r));
        return store.registrations.find((r) => r.id === id)!;
      },
    ),
  updateOwnDetails: (
    id: string,
    input: Partial<
      Pick<
        Registration,
        | "participantName"
        | "participantEmail"
        | "phone"
        | "birthDate"
        | "address"
        | "city"
        | "country"
        | "educationLevel"
        | "workExperience"
        | "employmentStatus"
        | "motivation"
        | "referralSource"
        | "notes"
      >
    >,
  ) =>
    withFallback<Registration>(
      () => api.patch<Registration>(`/registrations/${id}/me`, input),
      () => {
        const existing = store.registrations.find((registration) => registration.id === id);
        if (!existing) throw new Error("Registration not found");
        const updated = { ...existing, ...input };
        store.registrations = store.registrations.map((registration) =>
          registration.id === id ? updated : registration,
        );
        return updated;
      },
    ),
  uploadDocuments: (id: string, documents: FormData) =>
    postForm<Registration>(`/registrations/${id}/documents`, documents),
  cancel: (id: string) => registrationService.updateStatus(id, "CANCELLED"),
};

/* ------------------------------ payments ------------------------------- */

export const paymentService = {
  list: () =>
    withFallback<Payment[]>(
      () => api.get<Payment[]>("/payments"),
      () => fx.payments,
    ),
  mine: (userId: string) =>
    withFallback<Payment[]>(
      () => api.get<Payment[]>("/payments/me"),
      () => fx.payments.filter((p) => p.userId === userId),
    ),
  create: (input: { registrationId: string; amount: number; method: Payment["method"] }) =>
    withFallback<Payment>(
      () => api.post<Payment>("/payments", input),
      () => {
        const registration = store.registrations.find((item) => item.id === input.registrationId);
        const payment: Payment = {
          id: uid(),
          reference: `PAY-2026-${Math.floor(1000 + Math.random() * 9000)}`,
          registrationId: input.registrationId,
          userId: registration?.userId ?? "u-1",
          participantName: registration?.participantName ?? "",
          trainingTitle: registration?.trainingTitle ?? "",
          amount: input.amount,
          currency: registration?.currency ?? "EUR",
          method: input.method,
          status: "PAID",
          paidAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        };
        store.registrations = store.registrations.map((item) =>
          item.id === input.registrationId
            ? {
                ...item,
                amountPaid: item.amountPaid + input.amount,
                paymentStatus: "PAID",
                status: item.status === "PENDING" ? "CONFIRMED" : item.status,
              }
            : item,
        );
        return payment;
      },
    ),
  downloadReceipt: (id: string) => downloadFile(`/payments/${id}/receipt`),
};

/* ---------------------------- certificates ----------------------------- */

export const certificateService = {
  list: () =>
    withFallback<Certificate[]>(
      () => api.get<Certificate[]>("/certificates"),
      () => fx.certificates,
    ),
  mine: (userId: string) =>
    withFallback<Certificate[]>(
      () => api.get<Certificate[]>("/certificates/me"),
      () => fx.certificates.filter((c) => c.userId === userId),
    ),
  create: (input: { registrationId: string; type: Certificate["type"]; fileUrl?: string }) =>
    withFallback<Certificate>(
      () => api.post<Certificate>("/certificates", input),
      () => {
        const registration = store.registrations.find((item) => item.id === input.registrationId)!;
        const created: Certificate = {
          id: uid(),
          number: `IMA-CERT-2026-${Math.floor(1000 + Math.random() * 9000)}`,
          userId: registration.userId,
          participantName: registration.participantName,
          registrationId: registration.id,
          trainingTitle: registration.trainingTitle,
          type: input.type,
          issuedAt: new Date().toISOString(),
          status: "ISSUED",
          fileUrl: input.fileUrl ?? null,
        };
        store.registrations = store.registrations.map((item) =>
          item.id === registration.id ? { ...item, certificateId: created.id } : item,
        );
        return created;
      },
    ),
  download: (id: string) => downloadFile(`/certificates/${id}/download`),
};

/* --------------------------- notifications ----------------------------- */

export const notificationService = {
  list: () =>
    withFallback<AppNotification[]>(
      () => api.get<AppNotification[]>("/notifications"),
      () => store.notifications,
    ),
  mine: (userId: string) =>
    withFallback<AppNotification[]>(
      () => api.get<AppNotification[]>("/notifications/me"),
      () => store.notifications.filter((n) => n.userId === userId),
      160,
    ),
  markRead: (id: string) =>
    withFallback<{ ok: true }>(
      () => api.patch<{ ok: true }>(`/notifications/${id}/read`),
      () => {
        store.notifications = store.notifications.map((n) =>
          n.id === id ? { ...n, read: true } : n,
        );
        return { ok: true as const };
      },
      120,
    ),
  markAllRead: (userId: string) =>
    withFallback<{ ok: true }>(
      () => api.patch<{ ok: true }>("/notifications/read-all"),
      () => {
        store.notifications = store.notifications.map((n) =>
          n.userId === userId ? { ...n, read: true } : n,
        );
        return { ok: true as const };
      },
      120,
    ),
};

/* ------------------------------- users --------------------------------- */

export const userService = {
  list: () =>
    withFallback<User[]>(
      () => api.get<User[]>("/users"),
      () => store.users,
    ),
  get: (id: string) =>
    withFallback<User | null>(
      () => api.get<User>(`/users/${id}`),
      () => store.users.find((u) => u.id === id) ?? null,
    ),
  update: (id: string, input: Partial<User>) =>
    withFallback<User>(
      () => api.patch<User>(`/users/${id}`, input),
      () => {
        store.users = store.users.map((u) => (u.id === id ? { ...u, ...input } : u));
        return store.users.find((u) => u.id === id)!;
      },
    ),
  getProfile: (id: string) =>
    withFallback<User | null>(
      () => api.get<User>("/users/me"),
      () => store.users.find((u) => u.id === id) ?? null,
    ),
  updateProfile: (id: string, input: Pick<User, "firstName" | "lastName" | "email" | "phone">) =>
    withFallback<User>(
      () => api.patch<User>("/users/me", input),
      () => {
        store.users = store.users.map((u) => (u.id === id ? { ...u, ...input } : u));
        const user = store.users.find((u) => u.id === id);
        if (!user) throw new Error("Profile not found");
        return user;
      },
    ),
};

/* ------------------------------ contact -------------------------------- */

export const contactService = {
  list: () =>
    withFallback<ContactRequest[]>(
      () => api.get<ContactRequest[]>("/contact-requests"),
      () => store.contactRequests,
    ),
  create: (input: Omit<ContactRequest, "id" | "status" | "createdAt">) =>
    withFallback<ContactRequest>(
      () => api.post<ContactRequest>("/contact-requests", input),
      () => {
        const created: ContactRequest = {
          ...input,
          id: uid(),
          status: "NEW",
          createdAt: new Date().toISOString(),
        };
        store.contactRequests = [created, ...store.contactRequests];
        return created;
      },
      600,
    ),
  updateStatus: (id: string, status: ContactRequest["status"]) =>
    withFallback<ContactRequest>(
      () => api.patch<ContactRequest>(`/contact-requests/${id}`, { status }),
      () => {
        store.contactRequests = store.contactRequests.map((c) =>
          c.id === id ? { ...c, status } : c,
        );
        return store.contactRequests.find((c) => c.id === id)!;
      },
    ),
};

/* ------------------------------ analytics ------------------------------ */

export const analyticsService = {
  admin: (filters: AnalyticsFilters = {}) => {
    if (!hasApi) {
      return Promise.reject(
        new ApiError("Les analyses nécessitent une connexion à l’API en direct.", 503),
      );
    }
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value) params.set(key, value);
    }
    const query = params.toString();
    return api.get<AdminAnalytics>(`/analytics${query ? `?${query}` : ""}`);
  },
};

export const auditService = {
  list: (queryParams?: string) =>
    withFallback<AuditLogsData>(
      () => api.get<AuditLogsData>(`/admin/audit-logs${queryParams ? `?${queryParams}` : ""}`),
      () => ({
        summary: {
          totalActions: fx.auditLogs.summary.totalActions,
          activeSessions: fx.auditLogs.summary.activeSessions,
          riskySessions: fx.auditLogs.summary.riskySessions,
          lastSyncAt: fx.auditLogs.summary.lastSyncAt,
        },
        actions: fx.auditLogs.actions,
        userSessions: fx.auditLogs.userSessions,
      }),
      180,
    ),
};
