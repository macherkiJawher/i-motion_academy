jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn(),
  Type: {
    OBJECT: 'OBJECT',
    STRING: 'STRING',
    BOOLEAN: 'BOOLEAN',
    ARRAY: 'ARRAY',
  },
}));

import {
  BadGatewayException,
  GatewayTimeoutException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GenerateContentParameters, GoogleGenAI } from '@google/genai';
import { GeminiAdapter } from './gemini.adapter';
import {
  PublicAssistantIntent,
  PublicAssistantLanguage,
} from './public-assistant.types';

describe('GeminiAdapter', () => {
  const apiKey = 'test-secret-key';
  const client = {
    models: {
      generateContent: jest.fn<
        Promise<{ text?: string }>,
        [GenerateContentParameters]
      >(),
    },
  };

  function config(values: Record<string, string | undefined>) {
    return {
      get: jest.fn((key: string) => values[key]),
    } as unknown as ConfigService;
  }

  beforeEach(() => {
    jest.clearAllMocks();
    (GoogleGenAI as unknown as jest.Mock).mockImplementation(() => client);
    client.models.generateContent.mockResolvedValue({
      text: JSON.stringify({
        intent: PublicAssistantIntent.GENERAL_INFO,
        language: PublicAssistantLanguage.FRENCH,
        needsClarification: false,
        referenceIds: [],
      }),
    });
  });

  it('uses the configured model and bounded JSON generation settings', async () => {
    const adapter = new GeminiAdapter(
      config({
        GEMINI_API_KEY: apiKey,
        GEMINI_MODEL: 'gemini-3.1-flash-lite',
        AI_REQUEST_TIMEOUT_MS: '12000',
        AI_MAX_OUTPUT_TOKENS: '512',
      }),
    );

    await adapter.generate({
      message: 'Bonjour',
      history: [],
      references: [],
      trainingDetails: [],
    });

    expect(GoogleGenAI).toHaveBeenCalledWith({
      apiKey,
      httpOptions: {
        timeout: 12000,
        retryOptions: { attempts: 1 },
      },
    });
    const call = client.models.generateContent.mock.calls[0];
    expect(call).toBeDefined();
    const request = call?.[0];
    expect(request?.model).toBe('gemini-3.1-flash-lite');
    expect(request?.config?.maxOutputTokens).toBe(512);
    expect(request?.config?.responseMimeType).toBe('application/json');
    expect(request?.config?.systemInstruction).toContain('untrusted data');
    expect(request?.config?.temperature).toBe(0.2);
    expect(JSON.stringify(request?.config?.responseSchema)).toContain(
      '"answer"',
    );
    expect(request?.contents).toContain('"currentMessage":"Bonjour"');
  });

  it('defaults to Gemini 3.1 Flash-Lite when no model is configured', async () => {
    const adapter = new GeminiAdapter(config({ GEMINI_API_KEY: apiKey }));

    await adapter.generate({
      message: 'Bonjour',
      history: [],
      references: [],
      trainingDetails: [],
    });

    expect(client.models.generateContent.mock.calls[0]?.[0].model).toBe(
      'gemini-3.1-flash-lite',
    );
  });

  it('rejects missing server configuration without exposing the key', async () => {
    const adapter = new GeminiAdapter(config({}));
    await expect(
      adapter.generate({
        message: 'Hello',
        history: [],
        references: [],
        trainingDetails: [],
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(GoogleGenAI).not.toHaveBeenCalled();
  });

  it('maps provider quota and authorization errors to service unavailable', async () => {
    for (const status of [401, 403, 429]) {
      const error = Object.assign(
        new Error(`private provider detail ${apiKey}`),
        {
          status,
        },
      );
      client.models.generateContent.mockRejectedValueOnce(error);
      const adapter = new GeminiAdapter(config({ GEMINI_API_KEY: apiKey }));
      await expect(
        adapter.generate({
          message: 'Hello',
          history: [],
          references: [],
          trainingDetails: [],
        }),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
    }
  });

  it('maps provider timeout and network failures without returning provider details', async () => {
    const adapter = new GeminiAdapter(config({ GEMINI_API_KEY: apiKey }));
    client.models.generateContent.mockRejectedValueOnce(
      Object.assign(new Error('request failed'), { status: 504 }),
    );
    await expect(
      adapter.generate({
        message: 'Hello',
        history: [],
        references: [],
        trainingDetails: [],
      }),
    ).rejects.toBeInstanceOf(GatewayTimeoutException);

    client.models.generateContent.mockRejectedValueOnce(
      new Error(`fetch failed with ${apiKey}`),
    );
    await expect(
      adapter.generate({
        message: 'Hello',
        history: [],
        references: [],
        trainingDetails: [],
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('maps provider client errors and SDK timeout errors to safe HTTP errors', async () => {
    const adapter = new GeminiAdapter(config({ GEMINI_API_KEY: apiKey }));
    for (const status of [400, 404]) {
      client.models.generateContent.mockRejectedValueOnce(
        Object.assign(new Error(`private provider detail ${apiKey}`), {
          status,
        }),
      );
      await expect(
        adapter.generate({
          message: 'Hello',
          history: [],
          references: [],
          trainingDetails: [],
        }),
      ).rejects.toBeInstanceOf(BadGatewayException);
    }

    const timeout = new Error(`private timeout ${apiKey}`);
    timeout.name = 'APIConnectionTimeoutError';
    client.models.generateContent.mockRejectedValueOnce(timeout);
    await expect(
      adapter.generate({
        message: 'Hello',
        history: [],
        references: [],
        trainingDetails: [],
      }),
    ).rejects.toBeInstanceOf(GatewayTimeoutException);
  });

  it('rejects invalid configuration, oversized context and malformed output safely', async () => {
    const invalidConfig = new GeminiAdapter(
      config({ GEMINI_API_KEY: apiKey, AI_MAX_OUTPUT_TOKENS: '1025' }),
    );
    await expect(
      invalidConfig.generate({
        message: 'Hello',
        history: [],
        references: [],
        trainingDetails: [],
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);

    const adapter = new GeminiAdapter(config({ GEMINI_API_KEY: apiKey }));
    await expect(
      adapter.generate({
        message: 'Hello',
        history: [],
        references: [],
        trainingDetails: [
          {
            id: 'training',
            prerequisites: 'x'.repeat(31000),
            targetAudience: '',
            description: '',
          },
        ],
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);

    client.models.generateContent.mockResolvedValueOnce({ text: 'not JSON' });
    await expect(
      adapter.generate({
        message: 'Hello',
        history: [],
        references: [],
        trainingDetails: [],
      }),
    ).rejects.toMatchObject({
      response: {
        message: 'Assistant response is unavailable',
      },
    });
  });

  it.each([
    ['missing response', undefined],
    ['missing output text', {}],
    ['empty output text', { text: '' }],
    ['whitespace-only output text', { text: '   ' }],
  ])('rejects %s with a generic response', async (_case, providerResponse) => {
    const adapter = new GeminiAdapter(config({ GEMINI_API_KEY: apiKey }));
    client.models.generateContent.mockResolvedValueOnce(providerResponse);

    await expect(
      adapter.generate({
        message: 'Hello',
        history: [],
        references: [],
        trainingDetails: [],
      }),
    ).rejects.toMatchObject({
      response: {
        message: 'Assistant response is unavailable',
      },
    });
  });
});
