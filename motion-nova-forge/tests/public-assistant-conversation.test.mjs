import assert from "node:assert/strict";
import test from "node:test";
import { createServer } from "vite";

const vite = await createServer({
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true },
});

const { PublicAssistantConversation, buildPublicAssistantHistory } = await vite.ssrLoadModule(
  "/src/lib/public-assistant-conversation.ts",
);
const { PublicAssistantError } = await vite.ssrLoadModule("/src/services/public-assistant.ts");

const response = (overrides = {}) => ({
  answer: "Réponse de l’assistant.",
  intent: "GENERAL_INFO",
  language: "fr",
  needsClarification: false,
  references: [],
  actions: [{ label: "Nous contacter", href: "/contact" }],
  suggestedQuestions: ["Pouvez-vous préciser votre besoin ?"],
  ...overrides,
});

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

test.after(async () => {
  await vite.close();
});

test("sends a trimmed valid message and exposes pending then successful state", async () => {
  const pending = deferred();
  const requests = [];
  const conversation = new PublicAssistantConversation((request, options) => {
    requests.push({ request, options });
    return pending.promise;
  });

  const sending = conversation.sendMessage("  Bonjour  ");
  assert.equal(conversation.getSnapshot().isLoading, true);
  assert.deepEqual(
    conversation.getSnapshot().messages.map(({ role, status }) => ({ role, status })),
    [
      { role: "user", status: "submitted" },
      { role: "assistant", status: "pending" },
    ],
  );
  assert.deepEqual(requests[0].request, { message: "Bonjour" });
  assert.ok(requests[0].options.signal instanceof AbortSignal);

  pending.resolve(response());
  await sending;
  const snapshot = conversation.getSnapshot();
  assert.equal(snapshot.isLoading, false);
  assert.equal(snapshot.messages[1].status, "succeeded");
  assert.equal(snapshot.messages[1].content, "Réponse de l’assistant.");
  assert.deepEqual(snapshot.messages[1].response, response());
});

test("ignores empty messages and rejects oversized messages without calling the service", async () => {
  let calls = 0;
  const conversation = new PublicAssistantConversation(async () => {
    calls += 1;
    return response();
  });

  await conversation.sendMessage(" \n\t ");
  assert.equal(conversation.getSnapshot().messages.length, 0);
  await conversation.sendMessage("x".repeat(1001));
  assert.equal(calls, 0);
  assert.equal(conversation.getSnapshot().error, "invalid-request");
});

test("builds only complete alternating exchanges within history limits", async () => {
  const sent = [];
  const conversation = new PublicAssistantConversation(async (request) => {
    sent.push(request);
    return response({ answer: "a".repeat(400) });
  });

  for (let index = 0; index < 4; index += 1) {
    await conversation.sendMessage(String(index).repeat(400));
  }
  await conversation.sendMessage("current question");

  const lastRequest = sent.at(-1);
  assert.equal(lastRequest.message, "current question");
  assert.equal(lastRequest.history.length, 6);
  assert.equal(
    lastRequest.history.reduce((total, item) => total + item.content.length, 0),
    2400,
  );
  assert.deepEqual(
    lastRequest.history.map((item) => item.role),
    ["user", "assistant", "user", "assistant", "user", "assistant"],
  );
  assert.equal(
    lastRequest.history.some((item) => item.content === lastRequest.message),
    false,
  );

  const maximumMessageHistory = buildPublicAssistantHistory([
    { id: "max-user", role: "user", content: "u".repeat(800), status: "submitted" },
    { id: "max-assistant", role: "assistant", content: "a".repeat(800), status: "succeeded" },
  ]);
  assert.equal(maximumMessageHistory.length, 2);
  assert.equal(maximumMessageHistory[0].content.length, 800);
  assert.equal(maximumMessageHistory[1].content.length, 800);

  const tooLongExchange = [
    { id: "u", role: "user", content: "u".repeat(801), status: "submitted" },
    { id: "a", role: "assistant", content: "answer", status: "succeeded" },
  ];
  assert.deepEqual(buildPublicAssistantHistory(tooLongExchange), []);
});

test("prevents a second submission while a request is pending", async () => {
  const pending = deferred();
  const requests = [];
  const conversation = new PublicAssistantConversation((request) => {
    requests.push(request);
    return pending.promise;
  });

  const first = conversation.sendMessage("Premier");
  await conversation.sendMessage("Second");
  assert.equal(requests.length, 1);
  assert.equal(
    conversation.getSnapshot().messages.filter((message) => message.role === "user").length,
    1,
  );
  pending.resolve(response());
  await first;
});

test("cancels an in-flight request and ignores its stale response", async () => {
  const first = deferred();
  const second = deferred();
  const requests = [];
  const conversation = new PublicAssistantConversation((request, options) => {
    requests.push({ request, options });
    return requests.length === 1 ? first.promise : second.promise;
  });

  const firstSending = conversation.sendMessage("Ancienne demande");
  conversation.cancel();
  assert.equal(requests[0].options.signal.aborted, true);
  assert.equal(conversation.getSnapshot().isLoading, false);
  assert.equal(conversation.getSnapshot().messages[1].status, "cancelled");

  const secondSending = conversation.sendMessage("Demande actuelle");
  second.resolve(response({ answer: "Réponse actuelle" }));
  await secondSending;
  first.resolve(response({ answer: "Réponse périmée" }));
  await firstSending;

  const snapshot = conversation.getSnapshot();
  assert.equal(snapshot.messages[1].status, "cancelled");
  assert.equal(snapshot.messages[3].content, "Réponse actuelle");
  assert.equal(
    snapshot.messages.some((message) => message.content === "Réponse périmée"),
    false,
  );
});

test("maps API failures to controlled errors and allows an explicit retry", async () => {
  let attempts = 0;
  const conversation = new PublicAssistantConversation(async () => {
    attempts += 1;
    if (attempts === 1) throw new PublicAssistantError("rate-limited");
    return response({ answer: "Réponse après réessai." });
  });

  await conversation.sendMessage("Question");
  assert.equal(conversation.getSnapshot().error, "rate-limited");
  assert.equal(conversation.getSnapshot().messages[1].status, "failed");

  await conversation.retryLastMessage();
  const snapshot = conversation.getSnapshot();
  assert.equal(attempts, 2);
  assert.equal(snapshot.error, null);
  assert.equal(snapshot.messages.length, 2);
  assert.equal(snapshot.messages[0].content, "Question");
  assert.equal(snapshot.messages[1].content, "Réponse après réessai.");
  assert.equal(snapshot.messages[1].status, "succeeded");
});

test("does not record an empty assistant answer as a successful message", async () => {
  const conversation = new PublicAssistantConversation(async () => response({ answer: " \n " }));

  await conversation.sendMessage("Question");

  const snapshot = conversation.getSnapshot();
  assert.equal(snapshot.messages[1].status, "failed");
  assert.equal(snapshot.messages[1].content, "");
  assert.equal(snapshot.messages[1].error, "invalid-response");
  assert.equal(snapshot.error, "invalid-response");
});

test("preserves response metadata and language for French, English, and Arabic", async () => {
  for (const [language, answer, suggestion] of [
    ["fr", "Bonjour, voici les formations.", "Quelles sont les prochaines sessions ?"],
    ["en", "Hello, here are the available trainings.", "What sessions are coming up?"],
    ["ar", "مرحبًا، إليك الدورات المتاحة.", "ما هي الجلسات القادمة؟"],
  ]) {
    const expected = response({
      answer,
      language,
      intent: "TRAINING_SEARCH",
      needsClarification: true,
      references: [
        {
          type: "training",
          id: "training-reference",
          slug: "ems",
          title: "EMS",
          href: "/trainings/ems",
          price: { amount: 10, currency: "TND" },
          duration: { value: 1, unit: "DAYS" },
          recognition: {
            type: "NONE",
            title: null,
            approvalStatus: "NOT_APPLICABLE",
            validUntil: null,
          },
        },
      ],
      suggestedQuestions: [suggestion],
    });
    const conversation = new PublicAssistantConversation(async () => expected);

    await conversation.sendMessage("question");

    assert.deepEqual(conversation.getSnapshot().messages[1].response, expected);
    assert.equal(conversation.getSnapshot().messages[1].response.language, language);
  }
});

test("subscription receives loading and completion updates", async () => {
  const pending = deferred();
  const conversation = new PublicAssistantConversation(() => pending.promise);
  const updates = [];
  const unsubscribe = conversation.subscribe(() => {
    updates.push(conversation.getSnapshot());
  });

  const sending = conversation.sendMessage("Bonjour");
  assert.equal(updates.at(-1).isLoading, true);
  pending.resolve(response());
  await sending;
  assert.equal(updates.at(-1).isLoading, false);
  unsubscribe();
});
