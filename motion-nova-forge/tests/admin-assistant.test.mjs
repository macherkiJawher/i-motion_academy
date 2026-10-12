import assert from "node:assert/strict";
import test from "node:test";
import {
  adminAssistantErrorMessage,
  adminAssistantLanguageDirection,
  adminAssistantViewState,
  buildAdminAssistantHistory,
  isAdminAssistantChatRequest,
  isAdminAssistantChatResponse,
} from "../src/lib/admin-assistant-contract.js";
import {
  AdminAssistantServiceError,
  createAdminAssistantService,
} from "../src/services/admin-assistant-client.js";

const validResponse = {
  answer: "Sur la période disponible :\n\n- Vérifier les sessions peu remplies.",
  language: "fr",
  dataSources: ["trainings", "sessions", "aggregate complaints", "audit counts"],
  period: {
    type: "date_range",
    startDate: "2026-01-01",
    endDate: "2026-01-31",
  },
  missingData: [],
  recommendations: [
    {
      title: "Examiner les sessions",
      observedFinding: "Une session est peu remplie.",
      measuredEvidence: "4 inscriptions sur 20 places.",
      proposedAction: "Examiner les options de promotion.",
    },
  ],
};

test("validates the full structured response contract and supported languages", () => {
  assert.equal(isAdminAssistantChatResponse(validResponse), true);
  for (const language of ["fr", "ar", "ar-TN", "aeb-Latn"]) {
    assert.equal(isAdminAssistantChatResponse({ ...validResponse, language }), true);
  }
  assert.equal(
    isAdminAssistantChatResponse({ ...validResponse, recommendations: [], missingData: ["audit"] }),
    true,
  );
});

test("rejects incomplete, malformed and out-of-bounds responses", () => {
  assert.equal(isAdminAssistantChatResponse(null), false);
  assert.equal(isAdminAssistantChatResponse({ ...validResponse, period: undefined }), false);
  assert.equal(
    isAdminAssistantChatResponse({ ...validResponse, recommendations: undefined }),
    false,
  );
  assert.equal(isAdminAssistantChatResponse({ ...validResponse, answer: " " }), false);
  assert.equal(isAdminAssistantChatResponse({ ...validResponse, language: "en" }), false);
  assert.equal(isAdminAssistantChatResponse({ ...validResponse, dataSources: "sessions" }), false);
  assert.equal(isAdminAssistantChatResponse({ ...validResponse, answer: "x".repeat(3001) }), false);
  assert.equal(
    isAdminAssistantChatResponse({
      ...validResponse,
      period: { ...validResponse.period, startDate: "2026-02-31" },
    }),
    false,
  );
  assert.equal(
    isAdminAssistantChatResponse({
      ...validResponse,
      recommendations: [{ ...validResponse.recommendations[0], confidence: 0.75 }],
    }),
    false,
  );
  assert.equal(
    isAdminAssistantChatResponse({ ...validResponse, recommendations: [undefined] }),
    false,
  );
  assert.equal(
    isAdminAssistantChatResponse({
      ...validResponse,
      recommendations: [{ title: "Incomplete", observedFinding: "Missing evidence." }],
    }),
    false,
  );
});

test("validates request length, language and alternating bounded history", () => {
  const history = [
    { role: "user", content: "Question précédente" },
    { role: "assistant", content: "Réponse précédente" },
  ];
  assert.equal(isAdminAssistantChatRequest({ message: "Question", history }), true);
  assert.equal(
    isAdminAssistantChatRequest({ message: "Question", language: "ar-TN", history }),
    true,
  );
  assert.equal(isAdminAssistantChatRequest({ message: "", history }), false);
  assert.equal(isAdminAssistantChatRequest({ message: "x".repeat(2001) }), false);
  assert.equal(isAdminAssistantChatRequest({ message: "Question", language: "en" }), false);
  assert.equal(
    isAdminAssistantChatRequest({
      message: "Question",
      history: [{ role: "assistant", content: "Pas de question précédente" }],
    }),
    false,
  );
  assert.equal(
    isAdminAssistantChatRequest({
      message: "Question",
      history: Array.from({ length: 10 }, (_, index) => ({
        role: index % 2 === 0 ? "user" : "assistant",
        content: "Historique",
      })),
    }),
    false,
  );
  assert.equal(
    isAdminAssistantChatRequest({
      message: "Question",
      history: [
        { role: "user", content: "x".repeat(2000) },
        { role: "assistant", content: "x".repeat(2000) },
        { role: "user", content: "x".repeat(2000) },
        { role: "assistant", content: "x".repeat(2001) },
      ],
    }),
    false,
  );
});

test("keeps only complete recent turns and bounds each history message", () => {
  const messages = Array.from({ length: 5 }, (_, index) => [
    { role: "user", content: `Question ${index}` },
    { role: "assistant", content: "r".repeat(3000) },
  ]).flat();
  const history = buildAdminAssistantHistory(messages);

  assert.equal(history.length, 6);
  assert.equal(history[0].content, "Question 2");
  assert.equal(history[1].content.length, 2000);
  assert.deepEqual(
    history.filter((_, index) => index % 2 === 0).map(({ role }) => role),
    ["user", "user", "user"],
  );
  assert.equal(history.reduce((length, item) => length + item.content.length, 0) <= 8000, true);
});

test("chooses text direction for Arabic scripts and Latin transliteration", () => {
  assert.equal(adminAssistantLanguageDirection("ar"), "rtl");
  assert.equal(adminAssistantLanguageDirection("ar-TN"), "rtl");
  assert.equal(adminAssistantLanguageDirection("fr"), "ltr");
  assert.equal(adminAssistantLanguageDirection("aeb-Latn"), "ltr");
});

test("maps backend and network failures to safe French messages", () => {
  assert.match(adminAssistantErrorMessage(400), /invalide/i);
  assert.match(adminAssistantErrorMessage(401), /session/i);
  assert.match(adminAssistantErrorMessage(403), /administrateurs/i);
  assert.match(adminAssistantErrorMessage(429), /sollicité/i);
  assert.match(adminAssistantErrorMessage(503), /indisponible/i);
  assert.match(adminAssistantErrorMessage(null), /Connexion impossible/i);
  assert.match(adminAssistantErrorMessage(500), /erreur/i);
  assert.doesNotMatch(adminAssistantErrorMessage(503), /stack|api.?key|token/i);
});

test("posts only to the authenticated admin chat route with language and history", async () => {
  const calls = [];
  const service = createAdminAssistantService({
    isConfigured: true,
    post: async (...args) => {
      calls.push(args);
      return validResponse;
    },
  });
  const history = [
    { role: "user", content: "Question précédente" },
    { role: "assistant", content: "Réponse précédente" },
  ];

  assert.deepEqual(await service.chat("Question", "ar-TN", history), validResponse);
  assert.deepEqual(calls, [
    ["/admin/assistant/chat", { message: "Question", language: "ar-TN", history }],
  ]);
});

test("does not call the API when unconfigured and rejects malformed replies", async () => {
  let calls = 0;
  const unavailable = createAdminAssistantService({
    isConfigured: false,
    post: async () => {
      calls += 1;
      return validResponse;
    },
  });
  await assert.rejects(unavailable.chat("Question"), {
    name: "AdminAssistantServiceError",
    message: adminAssistantErrorMessage(503),
  });
  assert.equal(calls, 0);

  const malformed = createAdminAssistantService({
    isConfigured: true,
    post: async () => ({ answer: "réponse tronquée", language: "fr" }),
  });
  await assert.rejects(malformed.chat("Question"), {
    name: "AdminAssistantServiceError",
    message: /incomplète ou invalide/,
  });
});

test("maps HTTP statuses, network errors and unknown errors without leaking details", async () => {
  for (const [status, message] of [
    [400, /invalide/],
    [401, /session/],
    [403, /administrateurs/],
    [429, /sollicité/],
    [503, /indisponible/],
    [500, /erreur/],
  ]) {
    const service = createAdminAssistantService({
      isConfigured: true,
      post: async () => {
        const error = new Error("sensitive upstream response");
        error.status = status;
        throw error;
      },
    });
    await assert.rejects(service.chat("Question"), {
      name: "AdminAssistantServiceError",
      message,
    });
  }

  const networkService = createAdminAssistantService({
    isConfigured: true,
    post: async () => {
      throw new TypeError("network detail");
    },
  });
  await assert.rejects(networkService.chat("Question"), {
    name: "AdminAssistantServiceError",
    message: adminAssistantErrorMessage(null),
  });
  assert.equal(AdminAssistantServiceError.name, "AdminAssistantServiceError");
});

test("models the initial, loading, success and error conversation states", () => {
  assert.equal(
    adminAssistantViewState({ messageCount: 0, pending: false, error: null }),
    "initial",
  );
  assert.equal(adminAssistantViewState({ messageCount: 1, pending: true, error: null }), "loading");
  assert.equal(
    adminAssistantViewState({ messageCount: 2, pending: false, error: null }),
    "success",
  );
  assert.equal(
    adminAssistantViewState({ messageCount: 1, pending: false, error: "Indisponible" }),
    "error",
  );
});
