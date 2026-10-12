export interface Training {
  slug: string;
  title: string;
  category:
    | "Sport & EMS"
    | "Bien-être & Nutrition"
    | "Langues"
    | "BTP"
    | "BTS";
  tagline: string;
  description: string;
  targetAudience?: string;
  prerequisites?: string;
  certification?: string | null;
  approvalStatus?: "NOT_APPLICABLE" | "PENDING" | "APPROVED";
  coverUrl?: string;
  level: "Foundation" | "Advanced" | "Master";
  durationHours: number;
  priceEUR: number;
  certified: boolean;
  rating: number;
  learners: number;
  skills: string[];
  modules: { title: string; detail: string; hours: number }[];
  instructor: { name: string; role: string; initials: string };
}

export const trainings: Training[] = [
  {
    slug: "ems-master-certification",
    title: "EMS Master Certification",
    category: "Sport & EMS",
    tagline: "Electro-muscular stimulation, engineered to perfection.",
    description:
      "The flagship i-Motion program. Master impulse physiology, suit calibration and full 20-minute protocol design for elite and rehab clients.",
    level: "Master",
    durationHours: 48,
    priceEUR: 1490,
    certified: true,
    rating: 4.9,
    learners: 2840,
    skills: ["Impulse physiology", "Suit calibration", "Protocol design", "Client screening", "Recovery cycles"],
    modules: [
      { title: "Signal & Muscle", detail: "How frequency, width and ramp shape recruitment.", hours: 8 },
      { title: "Suit Calibration Lab", detail: "Hands-on channel mapping across body types.", hours: 12 },
      { title: "Protocol Architecture", detail: "Build 20-minute sessions for 6 client profiles.", hours: 14 },
      { title: "Safety & Contraindications", detail: "Screening, medical flags, emergency handling.", hours: 6 },
      { title: "Certification Studio", detail: "Live assessment with a real client.", hours: 8 },
    ],
    instructor: { name: "Dr. Léa Farhat", role: "Head of Applied Physiology", initials: "LF" },
  },
  {
    slug: "performance-coaching-lab",
    title: "Performance Coaching Lab",
    category: "Sport & EMS",
    tagline: "Turn data into human progress.",
    description:
      "A coaching system built on load management, behavioural design and measurable athlete outcomes across 12-week blocks.",
    level: "Advanced",
    durationHours: 36,
    priceEUR: 990,
    certified: true,
    rating: 4.8,
    learners: 1930,
    skills: ["Periodization", "Load metrics", "Behaviour design", "Retention", "Session craft"],
    modules: [
      { title: "Athlete Diagnostics", detail: "Movement screens and baseline capture.", hours: 8 },
      { title: "Block Periodization", detail: "12-week architecture with autoregulation.", hours: 10 },
      { title: "Coaching Language", detail: "Cueing, framing, adherence psychology.", hours: 10 },
      { title: "Outcome Reporting", detail: "Dashboards clients actually read.", hours: 8 },
    ],
    instructor: { name: "Marc Devries", role: "Elite Performance Coach", initials: "MD" },
  },
  {
    slug: "applied-sports-nutrition",
    title: "Applied Sports Nutrition",
    category: "Bien-être & Nutrition",
    tagline: "Fuel strategy for high-output bodies.",
    description:
      "Evidence-first nutrition programming for strength, endurance and body-composition goals, with practical client tooling.",
    level: "Advanced",
    durationHours: 28,
    priceEUR: 740,
    certified: true,
    rating: 4.7,
    learners: 1420,
    skills: ["Energy availability", "Macro periodization", "Supplement audit", "Hydration", "Client plans"],
    modules: [
      { title: "Energy Systems", detail: "Substrate use across intensities.", hours: 6 },
      { title: "Macro Periodization", detail: "Aligning intake with training blocks.", hours: 8 },
      { title: "Supplement Reality Check", detail: "What survives the evidence filter.", hours: 6 },
      { title: "Plan Builder", detail: "Templates, tracking and adherence.", hours: 8 },
    ],
    instructor: { name: "Ines Rovira", role: "Sports Dietitian", initials: "IR" },
  },
  {
    slug: "studio-business-accelerator",
    title: "Studio Business Accelerator",
    category: "Sport & EMS",
    tagline: "From one suit to a full studio.",
    description:
      "Pricing, funnels, retention and operations for EMS and boutique studios that want predictable growth.",
    level: "Foundation",
    durationHours: 24,
    priceEUR: 620,
    certified: false,
    rating: 4.6,
    learners: 1105,
    skills: ["Pricing", "Acquisition", "Retention", "Ops systems", "Unit economics"],
    modules: [
      { title: "Unit Economics", detail: "Know your per-session margin cold.", hours: 6 },
      { title: "Acquisition Engine", detail: "Local funnels that convert.", hours: 6 },
      { title: "Retention Loops", detail: "Membership design and churn control.", hours: 6 },
      { title: "Studio Ops", detail: "Scheduling, staffing, equipment cycles.", hours: 6 },
    ],
    instructor: { name: "Yanis Kader", role: "Studio Operator & Advisor", initials: "YK" },
  },
  {
    slug: "ai-motion-analytics",
    title: "AI Motion Analytics",
    category: "Sport & EMS",
    tagline: "Read movement like a machine does.",
    description:
      "Use pose estimation, sensor data and AI dashboards to quantify technique and progression for every client.",
    level: "Master",
    durationHours: 32,
    priceEUR: 1180,
    certified: true,
    rating: 4.9,
    learners: 860,
    skills: ["Pose estimation", "Sensor fusion", "Data hygiene", "AI reporting", "Ethics"],
    modules: [
      { title: "Capture Stack", detail: "Cameras, IMUs and what each one lies about.", hours: 8 },
      { title: "Model Literacy", detail: "Interpreting AI output without over-trusting it.", hours: 8 },
      { title: "Dashboards", detail: "Turning signals into coaching decisions.", hours: 8 },
      { title: "Ethics & Consent", detail: "Data ownership in a body-tracking world.", hours: 8 },
    ],
    instructor: { name: "Sofia Lindqvist", role: "Movement Data Scientist", initials: "SL" },
  },
  {
    slug: "ems-foundation",
    title: "EMS Foundation",
    category: "Sport & EMS",
    tagline: "Your entry into the impulse era.",
    description:
      "The essential first certification: safe suit handling, basic protocols and confident client onboarding.",
    level: "Foundation",
    durationHours: 16,
    priceEUR: 390,
    certified: true,
    rating: 4.8,
    learners: 4310,
    skills: ["Suit handling", "Basic protocols", "Onboarding", "Hygiene", "Safety"],
    modules: [
      { title: "Suit Anatomy", detail: "Every channel, strap and failure mode.", hours: 4 },
      { title: "First Sessions", detail: "Running a safe intro protocol.", hours: 6 },
      { title: "Client Onboarding", detail: "Screening and expectation setting.", hours: 6 },
    ],
    instructor: { name: "Dr. Léa Farhat", role: "Head of Applied Physiology", initials: "LF" },
  },
];

export const categories = [
  "All",
  "Sport & EMS",
  "Bien-être & Nutrition",
  "Langues",
] as const;

export interface SessionSlot {
  id: string;
  trainingSlug: string;
  city: string;
  mode: "On-site" | "Hybrid" | "Live online";
  start: string;
  seats: number;
  seatsLeft: number;
}

export const sessions: SessionSlot[] = [
  { id: "s1", trainingSlug: "ems-master-certification", city: "Paris", mode: "On-site", start: "2026-09-14", seats: 16, seatsLeft: 3 },
  { id: "s2", trainingSlug: "ems-foundation", city: "Lyon", mode: "On-site", start: "2026-09-02", seats: 20, seatsLeft: 11 },
  { id: "s3", trainingSlug: "ai-motion-analytics", city: "Remote", mode: "Live online", start: "2026-08-25", seats: 40, seatsLeft: 18 },
  { id: "s4", trainingSlug: "performance-coaching-lab", city: "Barcelona", mode: "Hybrid", start: "2026-10-06", seats: 24, seatsLeft: 7 },
  { id: "s5", trainingSlug: "applied-sports-nutrition", city: "Remote", mode: "Live online", start: "2026-09-21", seats: 60, seatsLeft: 44 },
  { id: "s6", trainingSlug: "studio-business-accelerator", city: "Brussels", mode: "On-site", start: "2026-11-03", seats: 18, seatsLeft: 2 },
];

export function getTraining(slug: string) {
  return trainings.find((t) => t.slug === slug);
}
