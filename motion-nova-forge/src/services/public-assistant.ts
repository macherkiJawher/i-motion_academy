import { API_BASE_URL, ApiError, api } from "@/api/client";
import {
  PUBLIC_ASSISTANT_INTENTS,
  type PublicAssistantChatRequest,
  type PublicAssistantChatResponse,
  type PublicAssistantHistoryMessage,
  type PublicAssistantReference,
} from "@/types/public-assistant";

const ENDPOINT = "/assistant/public/chat";
const DEFAULT_TIMEOUT_MS = 35_000;
const MAX_REQUEST_BODY_BYTES = 12 * 1024;
const SESSION_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TRAINING_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type PublicAssistantErrorCode =
  | "not-configured"
  | "invalid-request"
  | "request-too-large"
  | "rate-limited"
  | "timeout"
  | "cancelled"
  | "unavailable"
  | "invalid-response";

const PUBLIC_ERROR_MESSAGES: Record<PublicAssistantErrorCode, string> = {
  "not-configured": "Le service de l’assistant est indisponible.",
  "invalid-request": "La demande ne peut pas être envoyée. Vérifiez son contenu.",
  "request-too-large": "La demande est trop volumineuse. Réduisez son contenu puis réessayez.",
  "rate-limited": "Trop de demandes ont été envoyées. Veuillez réessayer plus tard.",
  timeout: "La réponse prend trop de temps. Vous pouvez réessayer.",
  cancelled: "La demande a été annulée.",
  unavailable: "L’assistant est temporairement indisponible. Veuillez réessayer.",
  "invalid-response": "La réponse reçue est invalide. Veuillez réessayer.",
};

export class PublicAssistantError extends Error {
  constructor(readonly code: PublicAssistantErrorCode) {
    super(PUBLIC_ERROR_MESSAGES[code]);
    this.name = "PublicAssistantError";
  }
}

export interface PublicAssistantCallOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, keys: string[]): boolean {
  return (
    Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key))
  );
}

function isNonEmptyString(value: unknown, maxLength: number): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= maxLength;
}

function isPrice(value: unknown): boolean {
  return (
    isRecord(value) &&
    hasExactKeys(value, ["amount", "currency"]) &&
    typeof value["amount"] === "number" &&
    Number.isFinite(value["amount"]) &&
    value["amount"] >= 0 &&
    typeof value["currency"] === "string" &&
    value["currency"].length === 3
  );
}

function isTrainingReference(value: Record<string, unknown>): boolean {
  const duration = value["duration"];
  const recognition = value["recognition"];
  if (
    !hasExactKeys(value, [
      "type",
      "id",
      "slug",
      "title",
      "href",
      "price",
      "duration",
      "recognition",
    ]) ||
    value["type"] !== "training" ||
    typeof value["id"] !== "string" ||
    !SESSION_ID_PATTERN.test(value["id"]) ||
    typeof value["slug"] !== "string" ||
    !TRAINING_SLUG_PATTERN.test(value["slug"]) ||
    value["href"] !== `/trainings/${value["slug"]}` ||
    !isNonEmptyString(value["title"], Number.MAX_SAFE_INTEGER) ||
    !isPrice(value["price"]) ||
    !isRecord(duration) ||
    !hasExactKeys(duration, ["value", "unit"]) ||
    typeof duration["value"] !== "number" ||
    !Number.isFinite(duration["value"]) ||
    duration["value"] < 0 ||
    !isNonEmptyString(duration["unit"], Number.MAX_SAFE_INTEGER) ||
    !isRecord(recognition) ||
    !hasExactKeys(recognition, ["type", "title", "approvalStatus", "validUntil"]) ||
    !isNonEmptyString(recognition["type"], Number.MAX_SAFE_INTEGER) ||
    !(
      recognition["title"] === null ||
      isNonEmptyString(recognition["title"], Number.MAX_SAFE_INTEGER)
    ) ||
    !isNonEmptyString(recognition["approvalStatus"], Number.MAX_SAFE_INTEGER) ||
    !(
      recognition["validUntil"] === null ||
      isNonEmptyString(recognition["validUntil"], Number.MAX_SAFE_INTEGER)
    )
  ) {
    return false;
  }
  return true;
}

function isSessionReference(value: Record<string, unknown>): boolean {
  const requiredStrings = [
    "trainingSlug",
    "title",
    "startDate",
    "endDate",
    "startTime",
    "endTime",
    "mode",
  ];
  return (
    hasExactKeys(value, [
      "type",
      "id",
      "trainingId",
      "trainingSlug",
      "title",
      "href",
      "startDate",
      "endDate",
      "startTime",
      "endTime",
      "city",
      "mode",
      "seatsRemaining",
      "price",
    ]) &&
    value["type"] === "session" &&
    typeof value["id"] === "string" &&
    SESSION_ID_PATTERN.test(value["id"]) &&
    typeof value["trainingId"] === "string" &&
    SESSION_ID_PATTERN.test(value["trainingId"]) &&
    value["href"] === `/sessions/${value["id"]}` &&
    requiredStrings.every((key) => isNonEmptyString(value[key], Number.MAX_SAFE_INTEGER)) &&
    typeof value["city"] === "string" &&
    typeof value["seatsRemaining"] === "number" &&
    Number.isInteger(value["seatsRemaining"]) &&
    value["seatsRemaining"] >= 1 &&
    isPrice(value["price"])
  );
}

function isReference(value: unknown): value is PublicAssistantReference {
  if (!isRecord(value)) return false;
  if (value["type"] === "training") return isTrainingReference(value);
  if (value["type"] === "session") return isSessionReference(value);
  return false;
}

export function isPublicAssistantChatResponse(
  value: unknown,
): value is PublicAssistantChatResponse {
  if (!isRecord(value)) return false;
  const intent = value["intent"];
  const language = value["language"];
  const references = value["references"];
  const actions = value["actions"];
  const suggestedQuestions = value["suggestedQuestions"];
  if (
    !hasExactKeys(value, [
      "answer",
      "intent",
      "language",
      "needsClarification",
      "references",
      "actions",
      "suggestedQuestions",
    ]) ||
    !isNonEmptyString(value["answer"], 4000) ||
    typeof intent !== "string" ||
    !PUBLIC_ASSISTANT_INTENTS.includes(intent as (typeof PUBLIC_ASSISTANT_INTENTS)[number]) ||
    !["fr", "en", "ar"].includes(language as string) ||
    typeof value["needsClarification"] !== "boolean" ||
    !Array.isArray(references) ||
    references.length > 5 ||
    !references.every(isReference) ||
    !Array.isArray(actions) ||
    actions.length > 2 ||
    !actions.every(
      (action) =>
        isRecord(action) &&
        hasExactKeys(action, ["label", "href"]) &&
        isNonEmptyString(action["label"], 80) &&
        (action["href"] === "/register" || action["href"] === "/contact"),
    ) ||
    !Array.isArray(suggestedQuestions) ||
    suggestedQuestions.length > 3 ||
    !suggestedQuestions.every((question) => isNonEmptyString(question, 200))
  ) {
    return false;
  }
  return true;
}

function normalizeRequest(value: PublicAssistantChatRequest): PublicAssistantChatRequest {
  if (!isRecord(value) || Object.keys(value).some((key) => !["message", "history"].includes(key))) {
    throw new PublicAssistantError("invalid-request");
  }
  const rawMessage = value["message"];
  const message = typeof rawMessage === "string" ? rawMessage.trim() : "";
  if (message.length < 1 || message.length > 1000) {
    throw new PublicAssistantError("invalid-request");
  }
  const rawHistory = value["history"];
  if (rawHistory === undefined) return { message };
  if (!Array.isArray(rawHistory) || rawHistory.length > 6) {
    throw new PublicAssistantError("invalid-request");
  }

  const history: PublicAssistantHistoryMessage[] = rawHistory.map((item) => {
    if (
      !isRecord(item) ||
      !hasExactKeys(item, ["role", "content"]) ||
      !["user", "assistant"].includes(item["role"] as string) ||
      typeof item["content"] !== "string"
    ) {
      throw new PublicAssistantError("invalid-request");
    }
    const content = item["content"].trim();
    if (content.length < 1 || content.length > 800) {
      throw new PublicAssistantError("invalid-request");
    }
    return { role: item["role"] as "user" | "assistant", content };
  });

  const totalLength = history.reduce((total, item) => total + item.content.length, 0);
  const invalidExchange =
    history.length % 2 !== 0 ||
    history.some((item, index) => item.role !== (index % 2 === 0 ? "user" : "assistant"));
  if (totalLength > 2400 || invalidExchange) {
    throw new PublicAssistantError("invalid-request");
  }
  return { message, history };
}

function mapRequestError(error: unknown, signal?: AbortSignal, timedOut = false): never {
  if (signal?.aborted) throw new PublicAssistantError("cancelled");
  if (timedOut) throw new PublicAssistantError("timeout");
  if (error instanceof SyntaxError) {
    throw new PublicAssistantError("invalid-response");
  }
  if (error instanceof ApiError) {
    if (error.status === 429) throw new PublicAssistantError("rate-limited");
    if (error.status === 413) throw new PublicAssistantError("request-too-large");
    if (error.status === 400) throw new PublicAssistantError("invalid-request");
    if (error.status === 504) throw new PublicAssistantError("timeout");
    throw new PublicAssistantError("unavailable");
  }
  throw new PublicAssistantError("unavailable");
}

async function postWithTimeout(
  request: PublicAssistantChatRequest,
  options: PublicAssistantCallOptions,
): Promise<unknown> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  if (!Number.isFinite(timeoutMs) || timeoutMs < 1 || timeoutMs > 60_000) {
    throw new PublicAssistantError("invalid-request");
  }
  if (options.signal?.aborted) throw new PublicAssistantError("cancelled");

  const controller = new AbortController();
  let timedOut = false;
  const abortFromCaller = () => controller.abort(options.signal?.reason);
  options.signal?.addEventListener("abort", abortFromCaller, { once: true });
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    return await api.postAnonymous<unknown>(ENDPOINT, request, controller.signal);
  } catch (error) {
    return mapRequestError(error, options.signal, timedOut);
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener("abort", abortFromCaller);
  }
}

export const publicAssistantService = {
  async chat(
    input: PublicAssistantChatRequest,
    options: PublicAssistantCallOptions = {},
  ): Promise<PublicAssistantChatResponse> {
    if (!API_BASE_URL) throw new PublicAssistantError("not-configured");
    const request = normalizeRequest(input);
    const requestBody = JSON.stringify(request);
    if (new TextEncoder().encode(requestBody).byteLength > MAX_REQUEST_BODY_BYTES) {
      throw new PublicAssistantError("request-too-large");
    }
    const response = await postWithTimeout(request, options);
    if (!isPublicAssistantChatResponse(response)) {
      throw new PublicAssistantError("invalid-response");
    }
    return response;
  },
};
