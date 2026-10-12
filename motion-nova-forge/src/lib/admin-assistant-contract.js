const LANGUAGES = ["fr", "ar", "ar-TN", "aeb-Latn"];
const PERIOD_TYPES = ["current_snapshot", "date_range", "mixed", "not_requested"];
const RECOMMENDATION_FIELDS = ["title", "observedFinding", "measuredEvidence", "proposedAction"];

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isDateOrNull(value) {
  if (value === null) return true;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function isStringArray(value) {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isRecommendation(value) {
  if (!isRecord(value)) return false;
  return (
    RECOMMENDATION_FIELDS.every((field) => Object.hasOwn(value, field)) &&
    Object.keys(value).length === RECOMMENDATION_FIELDS.length &&
    typeof value.title === "string" &&
    value.title.trim().length > 0 &&
    typeof value.observedFinding === "string" &&
    typeof value.measuredEvidence === "string" &&
    typeof value.proposedAction === "string" &&
    value.proposedAction.trim().length > 0
  );
}

export function isAdminAssistantLanguage(value) {
  return LANGUAGES.includes(value);
}

export function isAdminAssistantHistory(value) {
  if (!Array.isArray(value) || value.length > 8 || value.length % 2 !== 0) return false;
  let totalLength = 0;

  for (let index = 0; index < value.length; index += 1) {
    const message = value[index];
    const expectedRole = index % 2 === 0 ? "user" : "assistant";
    if (
      !isRecord(message) ||
      message.role !== expectedRole ||
      typeof message.content !== "string" ||
      message.content.length === 0 ||
      message.content.length > 2000
    ) {
      return false;
    }
    totalLength += message.content.length;
  }

  return totalLength <= 8000;
}

export function isAdminAssistantChatRequest(value) {
  return (
    isRecord(value) &&
    typeof value.message === "string" &&
    value.message.trim().length > 0 &&
    value.message.length <= 2000 &&
    (value.language === undefined || isAdminAssistantLanguage(value.language)) &&
    (value.history === undefined || isAdminAssistantHistory(value.history))
  );
}

export function isAdminAssistantChatResponse(value) {
  if (!isRecord(value)) return false;
  const period = value.period;
  const recommendations = value.recommendations;

  return (
    typeof value.answer === "string" &&
    value.answer.trim().length > 0 &&
    value.answer.length <= 3000 &&
    isAdminAssistantLanguage(value.language) &&
    isStringArray(value.dataSources) &&
    isRecord(period) &&
    PERIOD_TYPES.includes(period.type) &&
    isDateOrNull(period.startDate) &&
    isDateOrNull(period.endDate) &&
    isStringArray(value.missingData) &&
    Array.isArray(recommendations) &&
    recommendations.every(isRecommendation)
  );
}

export function buildAdminAssistantHistory(messages) {
  const pairs = [];
  for (let index = 0; index + 1 < messages.length; index += 1) {
    const user = messages[index];
    const assistant = messages[index + 1];
    if (user?.role === "user" && assistant?.role === "assistant") {
      pairs.push([
        { role: "user", content: user.content.slice(0, 2000) },
        { role: "assistant", content: assistant.content.slice(0, 2000) },
      ]);
      index += 1;
    }
  }

  const history = pairs.slice(-4).flat();
  while (history.reduce((length, message) => length + message.content.length, 0) > 8000) {
    history.shift();
    history.shift();
  }
  return history;
}

export function adminAssistantLanguageDirection(language) {
  return language === "ar" || language === "ar-TN" ? "rtl" : "ltr";
}

export function adminAssistantErrorMessage(status) {
  switch (status) {
    case 400:
      return "Votre message est invalide. Modifiez-le puis réessayez.";
    case 401:
      return "Votre session a expiré. Reconnectez-vous pour continuer.";
    case 403:
      return "L’accès au copilote est réservé aux administrateurs.";
    case 429:
      return "Le service est momentanément trop sollicité. Réessayez dans quelques instants.";
    case 503:
      return "Le copilote est temporairement indisponible. Réessayez dans quelques instants.";
    case null:
      return "Connexion impossible au copilote. Vérifiez votre réseau puis réessayez.";
    default:
      return "Une erreur est survenue. Réessayez dans quelques instants.";
  }
}

export function adminAssistantViewState({ messageCount, pending, error }) {
  if (pending) return "loading";
  if (error) return "error";
  if (messageCount === 0) return "initial";
  return "success";
}
