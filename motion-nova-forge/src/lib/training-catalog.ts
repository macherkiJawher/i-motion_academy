import type { AxisCode, Training, TrainingSession } from "@/types/domain";

const testTrainingSlugs = new Set(["fr", "ar", "en", "ems"]);
const axisCodes = new Set<AxisCode>([
  "EMS",
  "LANGUAGES",
  "MANAGEMENT",
  "AI",
  "SPORT_COACHING",
  "WELLNESS",
  "BTP",
  "BTS",
]);

const translatedTitles: Record<string, string> = {
  "ems-foundation": "Fondamentaux de l'EMS",
  "ai-motion-analytics": "Analyse du mouvement par l'intelligence artificielle",
  "technicien-en-automatisme-et-informatique-industrielle":
    "Technicien en automatisme et informatique industrielle",
};

const translatedCopy: Record<string, Record<string, string>> = {
  "ems-foundation": {
    "Your entry into the impulse era.": "Découvrez les bases de l'électrostimulation musculaire.",
    "The essential first certification for safe suit handling and basic protocols.":
      "Apprenez à utiliser une tenue d'électrostimulation en sécurité et à appliquer les protocoles fondamentaux.",
    "Coaches and studio staff starting with EMS":
      "Cette formation s'adresse aux coachs et aux équipes de studio qui débutent en EMS.",
    None: "Aucun prérequis.",
    "Suit handling": "Utilisation de la tenue",
    "Basic protocols": "Protocoles fondamentaux",
    Onboarding: "Accueil des participants",
    Hygiene: "Hygiène",
    Safety: "Sécurité",
    "Suit Anatomy": "Anatomie de la tenue",
    "Every channel, strap and failure mode.":
      "Repérez les canaux, les sangles et les principaux incidents d'utilisation.",
  },
  "ai-motion-analytics": {
    "Read movement like a machine does.": "Analysez le mouvement à l'aide des outils numériques.",
    "Use pose estimation, sensor data and AI dashboards to quantify technique and progression.":
      "Utilisez l'estimation de la posture, les données de capteurs et des tableaux de bord pour mesurer la technique et la progression.",
    "Coaches, analysts and studio tech leads":
      "Cette formation s'adresse aux coachs, aux analystes et aux responsables techniques de studio.",
    "Comfort with basic data tools": "Être à l'aise avec les outils de données de base.",
    "Pose estimation": "Estimation de la posture",
    "Sensor fusion": "Combinaison des données de capteurs",
    "Data hygiene": "Qualité des données",
    "AI reporting": "Rapports assistés par l'intelligence artificielle",
    Ethics: "Éthique",
    "Capture Stack": "Outils de capture du mouvement",
    "Cameras, IMUs and what each one lies about.":
      "Comprenez les apports et les limites des caméras et des unités de mesure inertielle.",
  },
};

const axisNames: Record<AxisCode, string> = {
  EMS: "Sport & EMS",
  LANGUAGES: "Langues",
  MANAGEMENT: "Gestion",
  AI: "Intelligence artificielle",
  SPORT_COACHING: "Sport & EMS",
  WELLNESS: "Bien-être & Nutrition",
  BTP: "BTP",
  BTS: "BTS",
};

function normalized(value: string) {
  return value.trim().toLocaleLowerCase("fr-TN");
}

function isFrenchText(value: string) {
  return (
    /[àâçéèêëîïôùûüÿœæ]/i.test(value) ||
    /\b(au|aux|avec|coach|coaching|dans|des|du|elle|en|et|formation|la|le|les|professionnel(?:le)?s?|programme|pour|qui|sport|sur|une|vos|vous)\b/i.test(
      value,
    )
  );
}

export function trainingTitle(training: Training) {
  return translatedTitles[training.slug] ?? training.title.trim();
}

export function localizedTrainingText(training: Training, value: string | null | undefined) {
  if (!value?.trim()) return null;
  const text = value.trim();
  const knownTranslation = translatedCopy[training.slug]?.[text];
  if (knownTranslation) return knownTranslation;
  if (text.length >= 20 && text.split(/\s+/).length >= 4 && isFrenchText(text)) return text;
  return null;
}

export function isPublishableTraining(training: Training) {
  const slug = normalized(training.slug);
  const isBtpDiploma = training.axisCode === "BTP" && training.recognitionType === "BTP_DIPLOMA";
  const isBtsDiploma = training.axisCode === "BTS" && training.recognitionType === "BTS_DIPLOMA";
  const isDiploma = training.axisCode === "BTP" || training.axisCode === "BTS";
  const validDiploma = Boolean(
    training.approvalStatus === "APPROVED" &&
    training.approvalReference?.trim() &&
    training.approvalAuthority?.trim() &&
    training.approvalValidUntil &&
    training.approvalValidUntil >= new Date().toISOString().slice(0, 10),
  );
  const validRecognition =
    isBtpDiploma || isBtsDiploma
      ? validDiploma
      : !isDiploma &&
        (training.recognitionType === "NONE" ||
          training.recognitionType === "I_MOTION_CERTIFICATE") &&
        training.approvalStatus === "NOT_APPLICABLE" &&
        (training.recognitionType !== "I_MOTION_CERTIFICATE" ||
          Boolean(training.certification?.trim()));

  return (
    training.active === true &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) &&
    !testTrainingSlugs.has(slug) &&
    typeof training.title === "string" &&
    training.title.trim().length > 0 &&
    axisCodes.has(training.axisCode) &&
    validRecognition &&
    typeof training.description === "string" &&
    training.description.trim().length > 0 &&
    Number.isFinite(training.price) &&
    training.price >= 0 &&
    /^[A-Z]{3}$/.test(training.currency)
  );
}

export function isPendingDiploma(training: Training) {
  return (
    (training.active || training.lifecycleStatus === "IN_REVIEW") &&
    ((training.axisCode === "BTP" && training.recognitionType === "BTP_DIPLOMA") ||
      (training.axisCode === "BTS" && training.recognitionType === "BTS_DIPLOMA")) &&
    training.approvalStatus === "PENDING" &&
    !testTrainingSlugs.has(normalized(training.slug)) &&
    training.title.trim().length >= 5
  );
}

export function trainingCategory(axisCode: AxisCode) {
  return axisNames[axisCode];
}

export function formatCatalogMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("fr-TN", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${new Intl.NumberFormat("fr-TN", { maximumFractionDigits: 0 }).format(amount)} ${currency}`;
  }
}

export function formatCatalogDate(value: string, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("fr-TN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
    ...options,
  }).format(new Date(`${value.slice(0, 10)}T12:00:00Z`));
}

export function isUpcomingSession(
  session: TrainingSession,
  trainings: Training[],
  today = new Date(),
) {
  const training = trainings.find(
    (item) => item.id === session.trainingId && item.slug === session.trainingSlug,
  );
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  return (
    training !== undefined &&
    (session.lifecycleStatus === undefined || session.lifecycleStatus === "SCHEDULED") &&
    isPublishableTraining(training) &&
    session.startDate >= todayKey &&
    session.endDate >= todayKey &&
    session.seatsLeft > 0 &&
    (session.status === "OPEN" || session.status === "ALMOST_FULL") &&
    session.currency === training.currency &&
    /^[A-Z]{3}$/.test(session.currency) &&
    Number.isFinite(session.price) &&
    session.price >= 0
  );
}

export function localizedSessionMode(mode: TrainingSession["mode"]) {
  if (mode === "On-site") return "En présentiel";
  if (mode === "Hybrid") return "En format hybride";
  return "À distance";
}
