/**
 * Local development fixtures.
 *
 * These objects mirror the exact shapes the NestJS API will return. They are
 * only used while `VITE_API_URL` is not configured, so that every screen can be
 * built and reviewed against the real typed contracts. No business logic lives
 * here — seat math, payments and certificate generation belong to the backend.
 */
import { media } from "@/data/media";
import type {
  AppNotification,
  AuditLogsData,
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

export const axes: Axis[] = [
  {
    id: "ax-ems",
    code: "EMS",
    name: "Sport & EMS",
    description: "Electro-muscular stimulation, coaching and human performance.",
  },
  {
    id: "ax-lang",
    code: "LANGUAGES",
    name: "Languages",
    description: "Professional language skills for international studios.",
  },
  {
    id: "ax-mgmt",
    code: "MANAGEMENT",
    name: "Commerce & Management",
    description: "Studio economics, sales and team leadership.",
  },
  {
    id: "ax-ai",
    code: "AI",
    name: "Artificial Intelligence",
    description: "Motion analytics, data literacy and AI-assisted coaching.",
  },
  {
    id: "ax-sport",
    code: "SPORT_COACHING",
    name: "Sport & Coaching",
    description: "EMS, Pilates, personal training and physical preparation.",
  },
  {
    id: "ax-wellness",
    code: "WELLNESS",
    name: "Bien-être",
    description: "Yoga, mobility and sports nutrition.",
  },
  { id: "ax-btp", code: "BTP", name: "BTP", description: "Professional technical programmes." },
  { id: "ax-bts", code: "BTS", name: "BTS", description: "Higher technician programmes." },
];

export const locations: Location[] = [
  {
    id: "loc-ennasr",
    name: "i-Motion Ennasr",
    city: "Ennasr",
    country: "Tunisia",
    address: "Rue du Lac, Ennasr II",
  },
  {
    id: "loc-lac",
    name: "i-Motion Lac 2",
    city: "Tunis",
    country: "Tunisia",
    address: "Les Berges du Lac 2",
  },
  {
    id: "loc-sousse",
    name: "i-Motion Sousse",
    city: "Sousse",
    country: "Tunisia",
    address: "Avenue Habib Bourguiba",
  },
  {
    id: "loc-remote",
    name: "Live online",
    city: "Remote",
    country: "—",
    address: "Streamed classroom",
  },
];

export const trainings: Training[] = [
  {
    id: "tr-1",
    slug: "ems-master-certification",
    title: "EMS Master Certification",
    axisCode: "EMS",
    subcategory: "EMS",
    recognitionType: "I_MOTION_CERTIFICATE",
    approvalStatus: "NOT_APPLICABLE",
    approvalReference: null,
    approvalAuthority: null,
    approvalValidUntil: null,
    tagline: "Electro-muscular stimulation, engineered to perfection.",
    description:
      "The flagship i-Motion program. Master impulse physiology, suit calibration and full 20-minute protocol design for elite and rehab clients.",
    level: "Master",
    durationHours: 48,
    price: 1490,
    currency: "TND",
    certification: "EMS Master Certificate",
    targetAudience: "Certified coaches and EMS Foundation graduates",
    prerequisites: "EMS Foundation or 1 year of studio practice",
    skills: [
      "Impulse physiology",
      "Suit calibration",
      "Protocol design",
      "Client screening",
      "Recovery cycles",
    ],
    program: [
      {
        title: "Signal & Muscle",
        detail: "How frequency, width and ramp shape recruitment.",
        hours: 8,
      },
      {
        title: "Suit Calibration Lab",
        detail: "Hands-on channel mapping across body types.",
        hours: 12,
      },
      {
        title: "Protocol Architecture",
        detail: "Build 20-minute sessions for 6 client profiles.",
        hours: 14,
      },
      {
        title: "Safety & Contraindications",
        detail: "Screening, medical flags, emergency handling.",
        hours: 6,
      },
      { title: "Certification Studio", detail: "Live assessment with a real client.", hours: 8 },
    ],
    coverUrl: media.emsHero,
    rating: 4.9,
    learners: 2840,
    active: true,
  },
  {
    id: "tr-2",
    slug: "ems-foundation",
    title: "EMS Foundation",
    axisCode: "EMS",
    subcategory: "EMS",
    recognitionType: "I_MOTION_CERTIFICATE",
    approvalStatus: "NOT_APPLICABLE",
    approvalReference: null,
    approvalAuthority: null,
    approvalValidUntil: null,
    tagline: "Your entry into the impulse era.",
    description:
      "The essential first certification: safe suit handling, basic protocols and confident client onboarding.",
    level: "Foundation",
    durationHours: 16,
    price: 390,
    currency: "TND",
    certification: "EMS Foundation Certificate",
    targetAudience: "Coaches and studio staff starting with EMS",
    prerequisites: "None",
    skills: ["Suit handling", "Basic protocols", "Onboarding", "Hygiene", "Safety"],
    program: [
      { title: "Suit Anatomy", detail: "Every channel, strap and failure mode.", hours: 4 },
      { title: "First Sessions", detail: "Running a safe intro protocol.", hours: 6 },
      { title: "Client Onboarding", detail: "Screening and expectation setting.", hours: 6 },
    ],
    coverUrl: media.emsGroup,
    rating: 4.8,
    learners: 4310,
    active: true,
  },
  {
    id: "tr-3",
    slug: "performance-coaching-lab",
    title: "Performance Coaching Lab",
    axisCode: "EMS",
    subcategory: "Personal Trainer",
    recognitionType: "I_MOTION_CERTIFICATE",
    approvalStatus: "NOT_APPLICABLE",
    approvalReference: null,
    approvalAuthority: null,
    approvalValidUntil: null,
    tagline: "Turn data into human progress.",
    description:
      "A coaching system built on load management, behavioural design and measurable athlete outcomes across 12-week blocks.",
    level: "Advanced",
    durationHours: 36,
    price: 990,
    currency: "TND",
    certification: "Performance Coach Certificate",
    targetAudience: "Personal trainers and EMS coaches",
    prerequisites: "Coaching experience recommended",
    skills: ["Periodization", "Load metrics", "Behaviour design", "Retention", "Session craft"],
    program: [
      { title: "Athlete Diagnostics", detail: "Movement screens and baseline capture.", hours: 8 },
      {
        title: "Block Periodization",
        detail: "12-week architecture with autoregulation.",
        hours: 10,
      },
      { title: "Coaching Language", detail: "Cueing, framing, adherence psychology.", hours: 10 },
      { title: "Outcome Reporting", detail: "Dashboards clients actually read.", hours: 8 },
    ],
    coverUrl: media.emsCoach,
    rating: 4.8,
    learners: 1930,
    active: true,
  },
  {
    id: "tr-4",
    slug: "studio-business-accelerator",
    title: "Studio Business Accelerator",
    axisCode: "MANAGEMENT",
    subcategory: "Gestion / Management",
    recognitionType: "NONE",
    approvalStatus: "NOT_APPLICABLE",
    approvalReference: null,
    approvalAuthority: null,
    approvalValidUntil: null,
    tagline: "From one suit to a full studio.",
    description:
      "Pricing, funnels, retention and operations for EMS and boutique studios that want predictable growth.",
    level: "Foundation",
    durationHours: 24,
    price: 620,
    currency: "TND",
    certification: null,
    targetAudience: "Studio owners and managers",
    prerequisites: "None",
    skills: ["Pricing", "Acquisition", "Retention", "Ops systems", "Unit economics"],
    program: [
      { title: "Unit Economics", detail: "Know your per-session margin cold.", hours: 6 },
      { title: "Acquisition Engine", detail: "Local funnels that convert.", hours: 6 },
      { title: "Retention Loops", detail: "Membership design and churn control.", hours: 6 },
      { title: "Studio Ops", detail: "Scheduling, staffing, equipment cycles.", hours: 6 },
    ],
    coverUrl: media.emsStudio,
    rating: 4.6,
    learners: 1105,
    active: true,
  },
  {
    id: "tr-5",
    slug: "ai-motion-analytics",
    title: "AI Motion Analytics",
    axisCode: "AI",
    subcategory: "Informatique",
    recognitionType: "I_MOTION_CERTIFICATE",
    approvalStatus: "NOT_APPLICABLE",
    approvalReference: null,
    approvalAuthority: null,
    approvalValidUntil: null,
    tagline: "Read movement like a machine does.",
    description:
      "Use pose estimation, sensor data and AI dashboards to quantify technique and progression for every client.",
    level: "Master",
    durationHours: 32,
    price: 1180,
    currency: "TND",
    certification: "AI Motion Analyst Certificate",
    targetAudience: "Coaches, analysts and studio tech leads",
    prerequisites: "Comfort with basic data tools",
    skills: ["Pose estimation", "Sensor fusion", "Data hygiene", "AI reporting", "Ethics"],
    program: [
      { title: "Capture Stack", detail: "Cameras, IMUs and what each one lies about.", hours: 8 },
      {
        title: "Model Literacy",
        detail: "Interpreting AI output without over-trusting it.",
        hours: 8,
      },
      { title: "Dashboards", detail: "Turning signals into coaching decisions.", hours: 8 },
      { title: "Ethics & Consent", detail: "Data ownership in a body-tracking world.", hours: 8 },
    ],
    coverUrl: media.emsEquipment,
    rating: 4.9,
    learners: 860,
    active: true,
  },
  {
    id: "tr-6",
    slug: "professional-english-for-coaches",
    title: "Professional English for Coaches",
    axisCode: "LANGUAGES",
    subcategory: "Anglais",
    recognitionType: "I_MOTION_CERTIFICATE",
    approvalStatus: "NOT_APPLICABLE",
    approvalReference: null,
    approvalAuthority: null,
    approvalValidUntil: null,
    tagline: "Coach an international floor with confidence.",
    description:
      "Studio-specific English: onboarding scripts, safety briefings, client dialogue and commercial conversations.",
    level: "Foundation",
    durationHours: 30,
    price: 480,
    currency: "TND",
    certification: "Professional English Certificate",
    targetAudience: "Coaches and front-desk teams",
    prerequisites: "A2 English level",
    skills: [
      "Session vocabulary",
      "Safety briefing",
      "Client dialogue",
      "Sales English",
      "Written follow-up",
    ],
    program: [
      { title: "Studio Vocabulary", detail: "Equipment, anatomy and protocol language.", hours: 8 },
      {
        title: "Live Coaching Scripts",
        detail: "Briefing, cueing and correcting in English.",
        hours: 10,
      },
      {
        title: "Commercial Conversations",
        detail: "Offers, objections and memberships.",
        hours: 6,
      },
      { title: "Written Follow-up", detail: "Emails, reports and client plans.", hours: 6 },
    ],
    coverUrl: media.emsStudio,
    rating: 4.7,
    learners: 640,
    active: true,
  },
];

export const trainers: Trainer[] = [
  {
    id: "trn-1",
    userId: "u-trn-1",
    slug: "lea-farhat",
    firstName: "Léa",
    lastName: "Farhat",
    email: "lea.farhat@i-motion.academy",
    phone: "+216 20 114 220",
    speciality: "EMS Physiology",
    expertise: ["Impulse physiology", "Suit calibration", "Safety screening"],
    biography:
      "Leads the EMS Master Certification. Fifteen years mapping impulse parameters to real muscular response in studio conditions, with a research background in applied physiology.",
    photoUrl: media.trainer1,
    yearsExperience: 15,
    trainingIds: ["tr-1", "tr-2"],
  },
  {
    id: "trn-2",
    userId: "u-trn-2",
    slug: "marc-devries",
    firstName: "Marc",
    lastName: "Devries",
    email: "marc.devries@i-motion.academy",
    phone: "+216 20 114 221",
    speciality: "Performance Coaching",
    expertise: ["Periodization", "Coaching language", "Client retention"],
    biography:
      "Builds the coaching layer of the curriculum: cueing, adherence and 12-week progression blocks for EMS clients across the partner studio network.",
    photoUrl: media.trainer2,
    yearsExperience: 12,
    trainingIds: ["tr-3", "tr-4"],
  },
  {
    id: "trn-3",
    userId: "u-trn-3",
    slug: "sofia-lindqvist",
    firstName: "Sofia",
    lastName: "Lindqvist",
    email: "sofia.lindqvist@i-motion.academy",
    phone: "+216 20 114 222",
    speciality: "Movement Data",
    expertise: ["Pose estimation", "Sensor fusion", "Reporting"],
    biography:
      "Runs the analytics track — turning sensor and pose data into coaching decisions coaches can actually defend in front of a client.",
    photoUrl: media.trainer3,
    yearsExperience: 9,
    trainingIds: ["tr-5", "tr-6"],
  },
];

function seatStatus(capacity: number, taken: number): TrainingSession["status"] {
  const left = capacity - taken;
  if (left <= 0) return "FULL";
  if (left <= Math.max(2, Math.round(capacity * 0.2))) return "ALMOST_FULL";
  return "OPEN";
}

function makeSession(
  id: string,
  trainingId: string,
  trainerId: string,
  locationId: string,
  startDate: string,
  endDate: string,
  capacity: number,
  taken: number,
  mode: TrainingSession["mode"],
  status?: TrainingSession["status"],
): TrainingSession {
  const training = trainings.find((t) => t.id === trainingId)!;
  const trainer = trainers.find((t) => t.id === trainerId)!;
  const location = locations.find((l) => l.id === locationId)!;
  return {
    id,
    trainingId,
    trainingSlug: training.slug,
    trainingTitle: training.title,
    axisCode: training.axisCode,
    trainerId,
    trainerName: `${trainer.firstName} ${trainer.lastName}`,
    locationId,
    locationName: location.name,
    city: location.city,
    mode,
    startDate,
    endDate,
    startTime: "09:00",
    endTime: "17:00",
    capacity,
    seatsTaken: taken,
    seatsLeft: Math.max(0, capacity - taken),
    status: status ?? seatStatus(capacity, taken),
    price: training.price,
    currency: training.currency,
    certification: training.certification,
  };
}

export const sessions: TrainingSession[] = [
  makeSession(
    "ses-1",
    "tr-1",
    "trn-1",
    "loc-ennasr",
    "2026-09-18",
    "2026-09-22",
    16,
    13,
    "On-site",
  ),
  makeSession("ses-2", "tr-2", "trn-1", "loc-lac", "2026-09-02", "2026-09-03", 20, 8, "On-site"),
  makeSession(
    "ses-3",
    "tr-5",
    "trn-3",
    "loc-remote",
    "2026-08-25",
    "2026-08-27",
    40,
    22,
    "Live online",
  ),
  makeSession("ses-4", "tr-3", "trn-2", "loc-sousse", "2026-10-06", "2026-10-09", 24, 17, "Hybrid"),
  makeSession(
    "ses-5",
    "tr-6",
    "trn-3",
    "loc-remote",
    "2026-09-21",
    "2026-09-25",
    30,
    12,
    "Live online",
  ),
  makeSession("ses-6", "tr-4", "trn-2", "loc-lac", "2026-11-03", "2026-11-05", 18, 18, "On-site"),
  makeSession(
    "ses-7",
    "tr-2",
    "trn-1",
    "loc-sousse",
    "2026-10-14",
    "2026-10-15",
    20,
    20,
    "On-site",
    "CLOSED",
  ),
  makeSession("ses-8", "tr-1", "trn-1", "loc-lac", "2026-12-07", "2026-12-11", 16, 4, "On-site"),
];

export const users: User[] = [
  {
    id: "u-1",
    firstName: "Amine",
    lastName: "Bouzid",
    email: "amine.bouzid@example.com",
    phone: "+216 22 448 190",
    role: "PARTICIPANT",
    createdAt: "2025-11-04T09:12:00.000Z",
  },
  {
    id: "u-2",
    firstName: "Nour",
    lastName: "Chaabane",
    email: "nour.chaabane@example.com",
    phone: "+216 25 771 004",
    role: "PARTICIPANT",
    createdAt: "2026-01-19T14:40:00.000Z",
  },
  {
    id: "u-3",
    firstName: "Karim",
    lastName: "Mansour",
    email: "karim.mansour@example.com",
    phone: "+216 98 220 118",
    role: "PARTICIPANT",
    createdAt: "2026-03-02T08:05:00.000Z",
  },
  {
    id: "u-4",
    firstName: "Selma",
    lastName: "Trabelsi",
    email: "selma.trabelsi@example.com",
    phone: "+216 55 300 771",
    role: "PARTICIPANT",
    createdAt: "2026-04-27T16:22:00.000Z",
  },
  {
    id: "u-adm",
    firstName: "Yasmine",
    lastName: "Riahi",
    email: "admin@i-motion.academy",
    phone: "+216 20 114 200",
    role: "ADMIN",
    createdAt: "2024-01-05T10:00:00.000Z",
  },
];

function timeline(stage: number, dates: (string | null)[]): Registration["timeline"] {
  const steps: {
    step: Registration["timeline"][number]["step"];
    label: string;
    description: string;
  }[] = [
    {
      step: "SUBMITTED",
      label: "Registration submitted",
      description: "Your request reached the academy.",
    },
    {
      step: "VALIDATED",
      label: "Administrative validation",
      description: "The admin team reviews your file.",
    },
    { step: "PAYMENT", label: "Payment", description: "Full or installment payment recorded." },
    { step: "SESSION", label: "Session", description: "Attend the in-person session." },
    {
      step: "COMPLETION",
      label: "Completion",
      description: "Assessment validated by your trainer.",
    },
    { step: "CERTIFICATE", label: "Certificate", description: "Certificate issued and available." },
  ];
  return steps.map((s, i) => ({
    ...s,
    status: i < stage ? "DONE" : i === stage ? "CURRENT" : "PENDING",
    date: dates[i] ?? null,
  }));
}

export const registrations: Registration[] = [
  {
    id: "reg-1",
    reference: "IMA-2026-0041",
    userId: "u-1",
    participantName: "Amine Bouzid",
    participantEmail: "amine.bouzid@example.com",
    sessionId: "ses-1",
    trainingTitle: "EMS Master Certification",
    trainingSlug: "ems-master-certification",
    sessionStartDate: "2026-09-18",
    city: "Ennasr",
    createdAt: "2026-06-12T10:24:00.000Z",
    status: "CONFIRMED",
    paymentStatus: "PARTIAL",
    amountDue: 1490,
    amountPaid: 745,
    currency: "TND",
    certificateId: null,
    timeline: timeline(2, ["2026-06-12", "2026-06-14", "2026-06-20", null, null, null]),
  },
  {
    id: "reg-2",
    reference: "IMA-2026-0012",
    userId: "u-1",
    participantName: "Amine Bouzid",
    participantEmail: "amine.bouzid@example.com",
    sessionId: "ses-2",
    trainingTitle: "EMS Foundation",
    trainingSlug: "ems-foundation",
    sessionStartDate: "2026-02-10",
    city: "Tunis",
    createdAt: "2026-01-08T09:00:00.000Z",
    status: "COMPLETED",
    paymentStatus: "PAID",
    amountDue: 390,
    amountPaid: 390,
    currency: "TND",
    certificateId: "cert-1",
    timeline: timeline(6, [
      "2026-01-08",
      "2026-01-09",
      "2026-01-15",
      "2026-02-10",
      "2026-02-11",
      "2026-02-14",
    ]),
  },
  {
    id: "reg-3",
    reference: "IMA-2026-0058",
    userId: "u-2",
    participantName: "Nour Chaabane",
    participantEmail: "nour.chaabane@example.com",
    sessionId: "ses-3",
    trainingTitle: "AI Motion Analytics",
    trainingSlug: "ai-motion-analytics",
    sessionStartDate: "2026-08-25",
    city: "Remote",
    createdAt: "2026-07-01T12:10:00.000Z",
    status: "PENDING",
    paymentStatus: "PENDING",
    amountDue: 1180,
    amountPaid: 0,
    currency: "TND",
    certificateId: null,
    timeline: timeline(1, ["2026-07-01", null, null, null, null, null]),
  },
  {
    id: "reg-4",
    reference: "IMA-2026-0060",
    userId: "u-3",
    participantName: "Karim Mansour",
    participantEmail: "karim.mansour@example.com",
    sessionId: "ses-4",
    trainingTitle: "Performance Coaching Lab",
    trainingSlug: "performance-coaching-lab",
    sessionStartDate: "2026-10-06",
    city: "Sousse",
    createdAt: "2026-07-04T08:45:00.000Z",
    status: "CONFIRMED",
    paymentStatus: "PAID",
    amountDue: 990,
    amountPaid: 990,
    currency: "TND",
    certificateId: null,
    timeline: timeline(3, ["2026-07-04", "2026-07-05", "2026-07-09", null, null, null]),
  },
  {
    id: "reg-5",
    reference: "IMA-2026-0063",
    userId: "u-4",
    participantName: "Selma Trabelsi",
    participantEmail: "selma.trabelsi@example.com",
    sessionId: "ses-1",
    trainingTitle: "EMS Master Certification",
    trainingSlug: "ems-master-certification",
    sessionStartDate: "2026-09-18",
    city: "Ennasr",
    createdAt: "2026-07-06T17:30:00.000Z",
    status: "CANCELLED",
    paymentStatus: "FAILED",
    amountDue: 1490,
    amountPaid: 0,
    currency: "TND",
    certificateId: null,
    timeline: timeline(1, ["2026-07-06", null, null, null, null, null]),
  },
];

export const payments: Payment[] = [
  {
    id: "pay-1",
    reference: "PMT-2026-0091",
    registrationId: "reg-1",
    userId: "u-1",
    participantName: "Amine Bouzid",
    trainingTitle: "EMS Master Certification",
    amount: 745,
    currency: "TND",
    method: "TRANSFER",
    status: "PARTIAL",
    paidAt: "2026-06-20T11:02:00.000Z",
    createdAt: "2026-06-20T11:02:00.000Z",
  },
  {
    id: "pay-2",
    reference: "PMT-2026-0022",
    registrationId: "reg-2",
    userId: "u-1",
    participantName: "Amine Bouzid",
    trainingTitle: "EMS Foundation",
    amount: 390,
    currency: "TND",
    method: "CARD",
    status: "PAID",
    paidAt: "2026-01-15T09:31:00.000Z",
    createdAt: "2026-01-15T09:31:00.000Z",
  },
  {
    id: "pay-3",
    reference: "PMT-2026-0104",
    registrationId: "reg-4",
    userId: "u-3",
    participantName: "Karim Mansour",
    trainingTitle: "Performance Coaching Lab",
    amount: 990,
    currency: "TND",
    method: "CARD",
    status: "PAID",
    paidAt: "2026-07-09T15:12:00.000Z",
    createdAt: "2026-07-09T15:12:00.000Z",
  },
  {
    id: "pay-4",
    reference: "PMT-2026-0110",
    registrationId: "reg-5",
    userId: "u-4",
    participantName: "Selma Trabelsi",
    trainingTitle: "EMS Master Certification",
    amount: 1490,
    currency: "TND",
    method: "CARD",
    status: "FAILED",
    paidAt: null,
    createdAt: "2026-07-06T17:41:00.000Z",
  },
];

export const certificates: Certificate[] = [
  {
    id: "cert-1",
    number: "IMA-CERT-2026-0007",
    userId: "u-1",
    participantName: "Amine Bouzid",
    registrationId: "reg-2",
    trainingTitle: "EMS Foundation",
    type: "CERTIFICATE",
    issuedAt: "2026-02-14T10:00:00.000Z",
    status: "ISSUED",
    fileUrl: null,
  },
  {
    id: "cert-2",
    number: "IMA-DIP-2025-0031",
    userId: "u-1",
    participantName: "Amine Bouzid",
    registrationId: "reg-2",
    trainingTitle: "Studio Business Accelerator",
    type: "DIPLOMA",
    issuedAt: "2025-12-02T10:00:00.000Z",
    status: "ISSUED",
    fileUrl: null,
  },
  {
    id: "cert-3",
    number: "IMA-CERT-2026-0011",
    userId: "u-3",
    participantName: "Karim Mansour",
    registrationId: "reg-4",
    trainingTitle: "EMS Foundation",
    type: "CERTIFICATE",
    issuedAt: "2026-03-21T10:00:00.000Z",
    status: "ISSUED",
    fileUrl: null,
  },
];

export const notifications: AppNotification[] = [
  {
    id: "ntf-1",
    userId: "u-1",
    type: "SESSION_REMINDER",
    title: "Session starts in 12 days",
    message: "EMS Master Certification · 18 September 2026 · Ennasr, 09:00.",
    read: false,
    createdAt: "2026-08-06T08:00:00.000Z",
  },
  {
    id: "ntf-2",
    userId: "u-1",
    type: "PAYMENT",
    title: "Installment received",
    message: "We recorded 745 EUR for registration IMA-2026-0041.",
    read: false,
    createdAt: "2026-06-20T11:05:00.000Z",
  },
  {
    id: "ntf-3",
    userId: "u-1",
    type: "CERTIFICATE_AVAILABLE",
    title: "Certificate available",
    message: "Your EMS Foundation certificate is ready to download.",
    read: true,
    createdAt: "2026-02-14T10:05:00.000Z",
  },
  {
    id: "ntf-4",
    userId: "u-trn-1",
    type: "REGISTRATION_RECEIVED",
    title: "New participant assigned",
    message: "Selma Trabelsi joined EMS Master Certification · Ennasr.",
    read: false,
    createdAt: "2026-07-06T17:35:00.000Z",
  },
  {
    id: "ntf-5",
    userId: "u-trn-1",
    type: "SESSION_REMINDER",
    title: "Session tomorrow",
    message: "EMS Foundation · Lac 2 · 09:00 — 17:00.",
    read: true,
    createdAt: "2026-08-05T18:00:00.000Z",
  },
  {
    id: "ntf-6",
    userId: "u-adm",
    type: "REGISTRATION_RECEIVED",
    title: "3 registrations awaiting validation",
    message: "Pending files for AI Motion Analytics and EMS Master.",
    read: false,
    createdAt: "2026-08-07T07:30:00.000Z",
  },
];

export const contactRequests: ContactRequest[] = [
  {
    id: "ct-1",
    firstName: "Rania",
    lastName: "Haddad",
    email: "rania.haddad@example.com",
    phone: "+216 21 556 900",
    subject: "Group booking for our studio team",
    message:
      "We would like to certify six coaches on EMS Foundation before December. Can you host a private session?",
    status: "NEW",
    createdAt: "2026-08-06T09:12:00.000Z",
  },
  {
    id: "ct-2",
    firstName: "Hedi",
    lastName: "Ben Salah",
    email: "hedi.bensalah@example.com",
    phone: null,
    subject: "Prerequisites for AI Motion Analytics",
    message:
      "I am a physiotherapist with no data background. Is the analytics track accessible to me?",
    status: "IN_PROGRESS",
    createdAt: "2026-08-04T15:40:00.000Z",
  },
  {
    id: "ct-3",
    firstName: "Claire",
    lastName: "Dubois",
    email: "claire.dubois@example.com",
    phone: "+33 6 12 44 90 11",
    subject: "Certificate verification",
    message:
      "Could you confirm the validity of certificate IMA-CERT-2026-0007 for a recruitment file?",
    status: "RESOLVED",
    createdAt: "2026-07-28T11:05:00.000Z",
  },
];

const fixtureToday = new Date().toISOString().slice(0, 10);
const fixtureUpcomingSessions = sessions.filter((session) => session.startDate >= fixtureToday);
const fixtureCapacity = fixtureUpcomingSessions.reduce((sum, session) => sum + session.capacity, 0);
const fixtureConvertedRegistrations = registrations.filter((registration) =>
  ["CONFIRMED", "COMPLETED"].includes(registration.status),
);
const fixtureCollectedPayments = payments.filter((payment) =>
  ["PAID", "PARTIAL"].includes(payment.status),
);
const aggregateCurrency = <T>(
  items: T[],
  currencyOf: (item: T) => string,
  amountOf: (item: T) => number,
) => {
  const amounts = new Map<string, number>();
  for (const item of items) {
    const currency = currencyOf(item);
    amounts.set(currency, (amounts.get(currency) ?? 0) + amountOf(item));
  }
  return Array.from(amounts, ([currency, amount]) => ({ currency, amount })).sort((first, second) =>
    first.currency.localeCompare(second.currency),
  );
};
const fixtureRevenueByCurrency = aggregateCurrency(
  fixtureCollectedPayments,
  (payment) => payment.currency,
  (payment) => payment.amount,
);
const fixtureOutstandingByCurrency = aggregateCurrency(
  registrations.filter((registration) => registration.status !== "CANCELLED"),
  (registration) => registration.currency,
  (registration) => Math.max(0, registration.amountDue - registration.amountPaid),
);
const fixtureCurrentDate = new Date();
const fixtureMonthStart = (year: number, month: number) => Date.UTC(year, month, 1);
const fixtureCurrentMonthStart = fixtureMonthStart(
  fixtureCurrentDate.getUTCFullYear(),
  fixtureCurrentDate.getUTCMonth(),
);
const fixtureCurrentMonthPreviousStart = fixtureMonthStart(
  fixtureCurrentDate.getUTCFullYear(),
  fixtureCurrentDate.getUTCMonth() - 1,
);
const fixtureTwoMonthsAgoStart = fixtureMonthStart(
  fixtureCurrentDate.getUTCFullYear(),
  fixtureCurrentDate.getUTCMonth() - 2,
);
const fixtureMonthName = (timestamp: number) =>
  new Date(timestamp).toLocaleDateString("fr-TN", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
const fixtureComparisonPeriods = (dateValue: string | null | undefined) => {
  const timestamp = dateValue ? new Date(dateValue).getTime() : Number.NaN;
  return Number.isFinite(timestamp) &&
    timestamp >= fixtureTwoMonthsAgoStart &&
    timestamp < fixtureCurrentMonthStart
    ? timestamp >= fixtureCurrentMonthPreviousStart
      ? "current"
      : "previous"
    : null;
};
const fixtureCurrentRegistrations = registrations.filter(
  (registration) => fixtureComparisonPeriods(registration.createdAt) === "current",
).length;
const fixturePreviousRegistrations = registrations.filter(
  (registration) => fixtureComparisonPeriods(registration.createdAt) === "previous",
).length;
const fixtureComparisonChange = (current: number, previous: number) =>
  previous === 0
    ? current === 0
      ? 0
      : null
    : Math.round(((current - previous) / previous) * 10000) / 100;
const fixturePaymentMethods = new Map<
  string,
  { method: Payment["method"]; currency: string; amount: number; transactions: number }
>();
for (const payment of fixtureCollectedPayments) {
  const key = `${payment.currency}:${payment.method}`;
  const total = fixturePaymentMethods.get(key) ?? {
    method: payment.method,
    currency: payment.currency,
    amount: 0,
    transactions: 0,
  };
  total.amount += payment.amount;
  total.transactions += 1;
  fixturePaymentMethods.set(key, total);
}
const fixtureRevenueByAxis = new Map<string, number>();
for (const payment of fixtureCollectedPayments) {
  const registration = registrations.find((item) => item.id === payment.registrationId);
  const training = trainings.find((item) => item.slug === registration?.trainingSlug);
  const key = `${training?.axisCode ?? "UNKNOWN"}:${payment.currency}`;
  fixtureRevenueByAxis.set(key, (fixtureRevenueByAxis.get(key) ?? 0) + payment.amount);
}
const fixtureTrend = new Map<number, number>();
for (let index = 0; index < 6; index += 1) {
  fixtureTrend.set(
    fixtureMonthStart(
      fixtureCurrentDate.getUTCFullYear(),
      fixtureCurrentDate.getUTCMonth() - 5 + index,
    ),
    0,
  );
}
for (const registration of registrations) {
  const createdAt = new Date(registration.createdAt).getTime();
  const month = new Date(createdAt);
  const monthStart = fixtureMonthStart(month.getUTCFullYear(), month.getUTCMonth());
  if (fixtureTrend.has(monthStart))
    fixtureTrend.set(monthStart, (fixtureTrend.get(monthStart) ?? 0) + 1);
}
const fixtureRevenueComparison = new Map<string, { current: number; previous: number }>();
for (const payment of fixtureCollectedPayments) {
  const period = fixtureComparisonPeriods(payment.paidAt);
  if (!period) continue;
  const amount = fixtureRevenueComparison.get(payment.currency) ?? { current: 0, previous: 0 };
  amount[period] += payment.amount;
  fixtureRevenueComparison.set(payment.currency, amount);
}

export const analytics = {
  kpis: {
    totalParticipants: users.filter((user) => user.role === "PARTICIPANT").length,
    totalRegistrations: registrations.length,
    eligibleForConversion: registrations.filter(
      (registration) => registration.status !== "CANCELLED",
    ).length,
    convertedRegistrations: fixtureConvertedRegistrations.length,
    cancelledRegistrations: registrations.filter(
      (registration) => registration.status === "CANCELLED",
    ).length,
    conversionRate: registrations.filter((registration) => registration.status !== "CANCELLED")
      .length
      ? Math.round(
          (fixtureConvertedRegistrations.length /
            registrations.filter((registration) => registration.status !== "CANCELLED").length) *
            100,
        )
      : 0,
    cancellationRate: registrations.length
      ? Math.round(
          (registrations.filter((registration) => registration.status === "CANCELLED").length /
            registrations.length) *
            100,
        )
      : 0,
    activeRegistrations: registrations.filter((registration) =>
      ["PENDING", "CONFIRMED"].includes(registration.status),
    ).length,
    pendingRegistrations: registrations.filter((registration) => registration.status === "PENDING")
      .length,
    upcomingSessions: fixtureUpcomingSessions.length,
    occupancyRate: fixtureCapacity
      ? Math.round(
          (fixtureUpcomingSessions.reduce(
            (sum, session) => sum + Math.min(Math.max(0, session.seatsTaken), session.capacity),
            0,
          ) /
            fixtureCapacity) *
            100,
        )
      : 0,
    revenue:
      fixtureRevenueByCurrency.length === 1 ? (fixtureRevenueByCurrency[0]?.amount ?? 0) : null,
    revenueByCurrency: fixtureRevenueByCurrency,
    outstandingBalance:
      fixtureOutstandingByCurrency.length === 1
        ? (fixtureOutstandingByCurrency[0]?.amount ?? 0)
        : null,
    outstandingBalanceByCurrency: fixtureOutstandingByCurrency,
    averageDueByCurrency: aggregateCurrency(
      fixtureConvertedRegistrations,
      (registration) => registration.currency,
      (registration) => registration.amountDue,
    ).map(({ currency, amount }) => ({
      currency,
      amount:
        amount /
        fixtureConvertedRegistrations.filter((registration) => registration.currency === currency)
          .length,
    })),
  },
  registrationTrend: Array.from(fixtureTrend, ([start, value]) => ({
    month: fixtureMonthName(start),
    registrations: value,
  })),
  revenueByAxis: Array.from(fixtureRevenueByAxis, ([key, amount]) => {
    const [axis, currency] = key.split(":");
    return { axis: axis ?? "UNKNOWN", currency: currency ?? "TND", amount };
  }),
  paymentMethods: Array.from(fixturePaymentMethods.values()).sort(
    (first, second) =>
      first.currency.localeCompare(second.currency) || first.method.localeCompare(second.method),
  ),
  trainingPopularity: Array.from(
    fixtureConvertedRegistrations.reduce((totals, registration) => {
      totals.set(registration.trainingTitle, (totals.get(registration.trainingTitle) ?? 0) + 1);
      return totals;
    }, new Map<string, number>()),
    ([training, count]) => ({ training, registrations: count }),
  )
    .sort((first, second) => second.registrations - first.registrations)
    .slice(0, 5),
  sessionOccupancy: fixtureUpcomingSessions.map((session) => ({
    session: session.trainingTitle,
    startDate: session.startDate,
    seatsTaken: Math.min(session.seatsTaken, session.capacity),
    capacity: session.capacity,
    occupancy: session.capacity ? Math.round((session.seatsTaken / session.capacity) * 100) : 0,
  })),
  referralSources: Array.from(
    registrations
      .filter((registration) => registration.status !== "CANCELLED")
      .reduce((totals, registration) => {
        const source = registration.referralSource?.trim() || "Non renseigné";
        totals.set(source, (totals.get(source) ?? 0) + 1);
        return totals;
      }, new Map<string, number>()),
    ([source, count]) => ({ source, registrations: count }),
  ).sort((first, second) => second.registrations - first.registrations),
  comparison: {
    currentPeriod: fixtureMonthName(fixtureCurrentMonthPreviousStart),
    previousPeriod: fixtureMonthName(fixtureTwoMonthsAgoStart),
    registrations: {
      current: fixtureCurrentRegistrations,
      previous: fixturePreviousRegistrations,
      changePercent: fixtureComparisonChange(
        fixtureCurrentRegistrations,
        fixturePreviousRegistrations,
      ),
    },
    revenueByCurrency: Array.from(fixtureRevenueComparison, ([currency, amount]) => ({
      currency,
      ...amount,
      changePercent: fixtureComparisonChange(amount.current, amount.previous),
    })),
  },
};

export const auditLogs: AuditLogsData = {
  summary: {
    totalActions: 128,
    activeSessions: 27,
    riskySessions: 3,
    lastSyncAt: "2026-08-29T12:30:00.000Z",
  },
  actions: [
    {
      id: "audit-act-1",
      actorName: "Yasmine Riahi",
      actorRole: "ADMIN",
      action: "Issued certificate",
      entity: "Certificate",
      entityId: "CERT-2026-0007",
      details: "Certified Amine Bouzid for EMS Foundation",
      createdAt: "2026-08-29T12:08:00.000Z",
      status: "SUCCESS",
    },
    {
      id: "audit-act-2",
      actorName: "Yasmine Riahi",
      actorRole: "ADMIN",
      action: "Updated registration status",
      entity: "Registration",
      entityId: "IMA-2026-0041",
      details: "Moved registration to CONFIRMED and requested payment verification",
      createdAt: "2026-08-29T11:54:00.000Z",
      status: "SUCCESS",
    },
    {
      id: "audit-act-3",
      actorName: "Yasmine Riahi",
      actorRole: "ADMIN",
      action: "Issued refund",
      entity: "Payment",
      entityId: "PAY-2026-0110",
      details: "Cancelled failed payment and flagged the account for review",
      createdAt: "2026-08-28T18:12:00.000Z",
      status: "WARNING",
    },
    {
      id: "audit-act-4",
      actorName: "Yasmine Riahi",
      actorRole: "ADMIN",
      action: "Disabled session editing",
      entity: "Session",
      entityId: "SES-2026-09-18",
      details: "Applied lock after a trainer profile mismatch",
      createdAt: "2026-08-27T16:25:00.000Z",
      status: "SUCCESS",
    },
  ],
  userSessions: [
    {
      id: "sess-audit-1",
      userId: "u-1",
      userName: "Amine Bouzid",
      userEmail: "amine.bouzid@example.com",
      ipAddress: "192.168.1.28",
      device: "Laptop",
      browser: "Chrome 128",
      location: "Tunis, Tunisia",
      lastSeenAt: "2026-08-29T12:22:00.000Z",
      startedAt: "2026-08-29T09:10:00.000Z",
      status: "ACTIVE",
    },
    {
      id: "sess-audit-2",
      userId: "u-3",
      userName: "Karim Mansour",
      userEmail: "karim.mansour@example.com",
      ipAddress: "10.14.50.11",
      device: "Mobile",
      browser: "Safari iOS 17",
      location: "Sousse, Tunisia",
      lastSeenAt: "2026-08-29T11:50:00.000Z",
      startedAt: "2026-08-29T08:40:00.000Z",
      status: "IDLE",
    },
    {
      id: "sess-audit-3",
      userId: "u-adm",
      userName: "Yasmine Riahi",
      userEmail: "admin@i-motion.academy",
      ipAddress: "172.16.0.9",
      device: "Desktop",
      browser: "Edge 127",
      location: "Tunisia HQ",
      lastSeenAt: "2026-08-29T12:30:00.000Z",
      startedAt: "2026-08-29T07:50:00.000Z",
      status: "ACTIVE",
    },
    {
      id: "sess-audit-4",
      userId: "u-4",
      userName: "Selma Trabelsi",
      userEmail: "selma.trabelsi@example.com",
      ipAddress: "41.228.90.79",
      device: "Tablet",
      browser: "Firefox 128",
      location: "Ennasr, Tunisia",
      lastSeenAt: "2026-08-28T21:44:00.000Z",
      startedAt: "2026-08-28T20:31:00.000Z",
      status: "EXPIRED",
    },
  ],
};
