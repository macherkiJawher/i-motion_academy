import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const originalApiUrl = process.env.VITE_API_URL;
process.env.VITE_API_URL = "http://assistant.test";

const vite = await createServer({
  configFile: fileURLToPath(new URL("../vite.config.ts", import.meta.url)),
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true },
});

const { API_BASE_URL, ApiError, api, tokenStore } = await vite.ssrLoadModule("/src/api/client.ts");
const { PublicAssistantError, isPublicAssistantChatResponse, publicAssistantService } =
  await vite.ssrLoadModule("/src/services/public-assistant.ts");

const trainingId = "0471f81b-168d-4e1e-aee5-e3df92b453a0";
const validResponse = {
  answer: "Formation EMS — Prix: 100 TND.",
  intent: "TRAINING_SEARCH",
  language: "fr",
  needsClarification: false,
  references: [
    {
      type: "training",
      id: trainingId,
      slug: "ems-training",
      title: "Formation EMS",
      href: "/trainings/ems-training",
      price: { amount: 100, currency: "TND" },
      duration: { value: 1, unit: "DAYS" },
      recognition: {
        type: "NONE",
        title: null,
        approvalStatus: "NOT_APPLICABLE",
        validUntil: null,
      },
    },
  ],
  actions: [{ label: "Nous contacter", href: "/contact" }],
  suggestedQuestions: ["Quelles sont les prochaines sessions ?"],
};

let originalFetch;
let originalWindow;

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

function setResponse(body, status = 200) {
  globalThis.fetch = async () => jsonResponse(body, status);
}

before(() => {
  originalFetch = globalThis.fetch;
  originalWindow = globalThis.window;
  globalThis.window = {
    localStorage: {
      getItem: (key) => (key === "imotion.access_token" ? "signed-in-test-token" : null),
      setItem() {},
      removeItem() {},
    },
    dispatchEvent() {},
  };
});

after(async () => {
  globalThis.fetch = originalFetch;
  if (originalWindow === undefined) delete globalThis.window;
  else globalThis.window = originalWindow;
  await vite.close();
  if (originalApiUrl === undefined) delete process.env.VITE_API_URL;
  else process.env.VITE_API_URL = originalApiUrl;
});

test("posts exact assistant contract anonymously even with a stored bearer token", async () => {
  assert.equal(API_BASE_URL, "http://assistant.test");
  tokenStore.set("signed-in-test-token");
  let captured;
  globalThis.fetch = async (url, init) => {
    captured = { url, init };
    return jsonResponse(validResponse);
  };

  const result = await publicAssistantService.chat({
    message: "  Quelles formations ?  ",
    history: [
      { role: "user", content: "Je cherche EMS." },
      { role: "assistant", content: "Bien sûr." },
    ],
  });

  assert.equal(captured.url, "http://assistant.test/assistant/public/chat");
  assert.deepEqual(JSON.parse(captured.init.body), {
    message: "Quelles formations ?",
    history: [
      { role: "user", content: "Je cherche EMS." },
      { role: "assistant", content: "Bien sûr." },
    ],
  });
  assert.equal(captured.init.headers.Authorization, undefined);
  assert.equal(captured.init.method, "POST");
  assert.equal(result.language, "fr");
});

test("validates full response shape and rejects missing, extra or malformed fields", () => {
  assert.equal(isPublicAssistantChatResponse(validResponse), true);
  assert.equal(isPublicAssistantChatResponse({ ...validResponse, language: "de" }), false);
  assert.equal(
    isPublicAssistantChatResponse({
      ...validResponse,
      unexpectedProviderField: "must not pass",
    }),
    false,
  );
  assert.equal(
    isPublicAssistantChatResponse({
      ...validResponse,
      references: [
        {
          ...validResponse.references[0],
          href: "https://example.test",
        },
      ],
    }),
    false,
  );
  assert.equal(
    isPublicAssistantChatResponse({
      ...validResponse,
      actions: [{ label: "External", href: "https://example.test" }],
    }),
    false,
  );
});

test("rejects a malformed success response and invalid requests without sending them", async () => {
  setResponse({ answer: "missing fields" });
  await assert.rejects(publicAssistantService.chat({ message: "Bonjour" }), {
    code: "invalid-response",
  });

  let called = false;
  globalThis.fetch = async () => {
    called = true;
    return jsonResponse(validResponse);
  };
  await assert.rejects(
    publicAssistantService.chat({
      message: "Bonjour",
      history: [{ role: "user", content: "Échange incomplet" }],
    }),
    { code: "invalid-request" },
  );
  assert.equal(called, false);
});

test("maps HTTP errors to safe frontend errors without exposing server messages", async () => {
  for (const [status, code] of [
    [400, "invalid-request"],
    [413, "request-too-large"],
    [429, "rate-limited"],
    [502, "unavailable"],
    [503, "unavailable"],
    [504, "timeout"],
  ]) {
    setResponse({ message: "private provider diagnostic and secret" }, status);
    await assert.rejects(publicAssistantService.chat({ message: "Bonjour" }), (error) => {
      assert.ok(error instanceof PublicAssistantError);
      assert.equal(error.code, code);
      assert.doesNotMatch(error.message, /private|secret|provider/i);
      return true;
    });
  }
});

test("checks UTF-8 request size before sending maximum multilingual input", async () => {
  const maxHistoryContent = "مرحبا ".repeat(50) + "A".repeat(500);
  const regularHistoryContent = "مرحبا ".repeat(20) + "A".repeat(200);
  const maximumMultilingualRequest = {
    message: "مرحبا ".repeat(100) + "A".repeat(400),
    history: [
      { role: "user", content: maxHistoryContent },
      { role: "assistant", content: regularHistoryContent },
      { role: "user", content: regularHistoryContent },
      { role: "assistant", content: regularHistoryContent },
      { role: "user", content: regularHistoryContent },
      { role: "assistant", content: regularHistoryContent },
    ],
  };
  let calls = 0;
  let sentBody;
  globalThis.fetch = async (_url, init) => {
    calls += 1;
    sentBody = init.body;
    return jsonResponse(validResponse);
  };

  await publicAssistantService.chat(maximumMultilingualRequest);

  assert.equal(maximumMultilingualRequest.message.length, 1000);
  assert.equal(maximumMultilingualRequest.history.length, 6);
  assert.equal(
    maximumMultilingualRequest.history.reduce((total, item) => total + item.content.length, 0),
    2400,
  );
  assert.ok(new TextEncoder().encode(sentBody).byteLength <= 12 * 1024);
  assert.equal(calls, 1);

  const oversizedRequest = {
    message: "\0".repeat(1000),
    history: maximumMultilingualRequest.history.map((item) => ({
      ...item,
      content: "\0".repeat(item.content.length),
    })),
  };
  await assert.rejects(publicAssistantService.chat(oversizedRequest), (error) => {
    assert.ok(error instanceof PublicAssistantError);
    assert.equal(error.code, "request-too-large");
    return true;
  });
  assert.equal(calls, 1);
});

test("supports caller cancellation and reports a controlled timeout", async () => {
  globalThis.fetch = (_url, init) =>
    new Promise((_resolve, reject) => {
      init.signal.addEventListener(
        "abort",
        () => {
          const error = new Error("transport details");
          error.name = "AbortError";
          reject(error);
        },
        { once: true },
      );
    });

  const caller = new AbortController();
  const cancelled = publicAssistantService.chat(
    { message: "Bonjour" },
    { signal: caller.signal, timeoutMs: 1000 },
  );
  caller.abort();
  await assert.rejects(cancelled, { code: "cancelled" });

  await assert.rejects(publicAssistantService.chat({ message: "Bonjour" }, { timeoutMs: 5 }), {
    code: "timeout",
  });
});

test("does not clear login state or dispatch auth invalidation for an anonymous 401", async () => {
  const dispatch = [];
  globalThis.window.dispatchEvent = (event) => dispatch.push(event);
  setResponse({ message: "internal unauthorized diagnostic" }, 401);

  await assert.rejects(publicAssistantService.chat({ message: "Bonjour" }), (error) => {
    assert.equal(error.code, "unavailable");
    assert.doesNotMatch(error.message, /internal|unauthorized/i);
    return true;
  });
  assert.equal(tokenStore.get(), "signed-in-test-token");
  assert.deepEqual(dispatch, []);
});

test("existing authenticated API calls retain their bearer token behavior", async () => {
  let headers;
  globalThis.fetch = async (_url, init) => {
    headers = init.headers;
    return jsonResponse({ ok: true });
  };

  await api.post("/example", { value: 1 });

  assert.equal(headers.Authorization, "Bearer signed-in-test-token");
  assert.ok(ApiError);
});

test("never falls back to a fabricated assistant response", async () => {
  globalThis.fetch = async () => {
    throw new Error("private transport detail");
  };
  await assert.rejects(publicAssistantService.chat({ message: "Bonjour" }), (error) => {
    assert.equal(error.code, "unavailable");
    assert.doesNotMatch(error.message, /private|transport/i);
    return true;
  });
});
