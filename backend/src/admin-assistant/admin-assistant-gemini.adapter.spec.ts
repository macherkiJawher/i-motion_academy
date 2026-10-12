jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn(),
  Type: {
    OBJECT: 'OBJECT',
    STRING: 'STRING',
    ARRAY: 'ARRAY',
    BOOLEAN: 'BOOLEAN',
    NUMBER: 'NUMBER',
  },
  FunctionCallingConfigMode: { AUTO: 'AUTO' },
}));

import { BadGatewayException, Logger } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';
import { AdminAssistantGeminiAdapter } from './admin-assistant-gemini.adapter';

describe('AdminAssistantGeminiAdapter', () => {
  const generateContent = jest.fn();
  const config = {
    get: (name: string) =>
      name === 'ADMIN_ASSISTANT_GEMINI_API_KEY' ? 'test-key' : undefined,
  };
  const toolResult = {
    toolName: 'get_current_admin_snapshot',
    data: { registrations: { pending: 3 } },
    sources: ['admin_snapshot'],
    period: {
      type: 'current_snapshot',
      startDate: null,
      endDate: null,
    },
    missingData: ['Refund details are not available.'],
  };
  let execute: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    execute = jest.fn().mockResolvedValue(toolResult);
    jest.mocked(GoogleGenAI).mockImplementation(
      () =>
        ({
          models: { generateContent },
        }) as any,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('executes only the declared server tool and aggregates trusted provenance', async () => {
    generateContent
      .mockResolvedValueOnce({
        functionCalls: [{ name: 'get_current_admin_snapshot', args: {} }],
        candidates: [
          {
            content: {
              role: 'model',
              parts: [{ functionCall: { name: 'get_current_admin_snapshot' } }],
            },
          },
        ],
      })
      .mockResolvedValueOnce({
        text: JSON.stringify({
          answer: 'Il y a 3 inscriptions en attente.',
          language: 'aeb-Latn',
          recommendations: [],
        }),
      });
    const adapter = new AdminAssistantGeminiAdapter(
      config as any,
      { execute } as any,
    );

    const response = await adapter.generate({
      message: 'Combien sont en attente ?',
      history: [
        { role: 'user', content: 'Résumé précédent ?' },
        { role: 'assistant', content: 'Consultez les indicateurs.' },
      ],
      language: 'aeb-Latn',
    });

    expect(execute).toHaveBeenCalledWith('get_current_admin_snapshot', {});
    expect(response).toEqual({
      answer: 'Il y a 3 inscriptions en attente.',
      language: 'aeb-Latn',
      dataSources: ['admin_snapshot'],
      period: {
        type: 'current_snapshot',
        startDate: null,
        endDate: null,
      },
      missingData: ['Refund details are not available.'],
      recommendations: [],
    });
    expect(generateContent).toHaveBeenCalledTimes(2);
    const firstRequest = generateContent.mock.calls[0][0];
    expect(
      firstRequest.config.tools[0].functionDeclarations.map(
        (tool: any) => tool.name,
      ),
    ).toEqual([
      'get_current_admin_snapshot',
      'get_period_operational_breakdowns',
      'get_admin_analytics',
    ]);
    expect(firstRequest.config.responseSchema.properties.language.enum).toEqual(
      ['aeb-Latn'],
    );
  });

  it('exposes the bounded topic-based analytics tool and accepts its call', async () => {
    generateContent
      .mockResolvedValueOnce({
        functionCalls: [
          {
            name: 'get_admin_analytics',
            args: { area: 'participants' },
          },
        ],
        candidates: [
          {
            content: {
              role: 'model',
              parts: [{ functionCall: { name: 'get_admin_analytics' } }],
            },
          },
        ],
      })
      .mockResolvedValueOnce({
        text: JSON.stringify({
          answer: 'La moyenne calculée est de 31 ans.',
          language: 'fr',
          recommendations: [],
        }),
      });
    const adapter = new AdminAssistantGeminiAdapter(
      config as any,
      { execute } as any,
    );

    await adapter.generate({
      message: 'Quelle est la moyenne d’âge ?',
      history: [],
      language: 'fr',
    });

    expect(execute).toHaveBeenCalledWith('get_admin_analytics', {
      area: 'participants',
    });
    const declaration =
      generateContent.mock.calls[0][0].config.tools[0].functionDeclarations.find(
        (tool: { name: string }) => tool.name === 'get_admin_analytics',
      );
    expect(declaration.parameters.properties.area.enum).toContain(
      'participants',
    );
    expect(declaration.parameters.properties.area.enum).toContain('payments');
    expect(declaration.parameters.properties.area.enum).not.toContain('sql');
  });

  it('does not invoke unknown tool names and rejects a mismatched response language', async () => {
    generateContent
      .mockResolvedValueOnce({
        functionCalls: [
          { name: 'execute_arbitrary_sql', args: { sql: 'select' } },
        ],
        candidates: [{ content: { role: 'model', parts: [] } }],
      })
      .mockResolvedValueOnce({
        text: JSON.stringify({
          answer: 'No disponible.',
          language: 'fr',
          recommendations: [],
        }),
      });
    const adapter = new AdminAssistantGeminiAdapter(
      config as any,
      { execute } as any,
    );

    await expect(
      adapter.generate({ message: 'Question', history: [], language: 'ar' }),
    ).rejects.toBeInstanceOf(BadGatewayException);
    expect(execute).not.toHaveBeenCalled();
  });

  it('requires measured evidence and an advisory action without speculative scores', async () => {
    const recommendation = {
      title: 'Examiner les demandes en attente',
      observedFinding: 'Deux réclamations sont nouvelles.',
      measuredEvidence: 'La ventilation actuelle indique 2 dossiers NEW.',
      proposedAction: 'Examiner le volume et définir une procédure de suivi.',
    };
    generateContent.mockResolvedValueOnce({
      text: JSON.stringify({
        answer: 'Deux dossiers sont nouveaux.',
        language: 'fr',
        recommendations: [recommendation],
      }),
    });
    const adapter = new AdminAssistantGeminiAdapter(
      config as any,
      { execute } as any,
    );

    const response = await adapter.generate({
      message: 'Résume les réclamations',
      history: [],
      language: 'fr',
    });

    expect(response.recommendations).toEqual([recommendation]);
    const schema = generateContent.mock.calls[0][0].config.responseSchema;
    expect(schema.properties.recommendations.items.required).toEqual(
      expect.arrayContaining([
        'observedFinding',
        'measuredEvidence',
        'proposedAction',
      ]),
    );
  });

  it('logs provider status categories without logging provider error details', async () => {
    const errorMessage = JSON.stringify({
      error: {
        message: 'Invalid responseSchema property minLength with secret-marker',
        status: 'INVALID_ARGUMENT',
      },
    });
    const providerError = Object.assign(new Error(errorMessage), {
      status: 400,
    });
    generateContent.mockRejectedValueOnce(providerError);
    const errorLog = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    const adapter = new AdminAssistantGeminiAdapter(
      config as any,
      { execute } as any,
    );

    await expect(
      adapter.generate({ message: 'Question', history: [], language: 'fr' }),
    ).rejects.toMatchObject({
      status: 502,
      message: 'Admin assistant provider rejected the request',
    });

    expect(errorLog).toHaveBeenCalledWith(
      'event=admin_assistant_failure category=provider_http_error reason=invalid_response_schema provider_status=400',
    );
    expect(JSON.stringify(errorLog.mock.calls)).not.toContain(errorMessage);
    expect(JSON.stringify(errorLog.mock.calls)).not.toContain('secret-marker');
  });

  it.each([
    {
      status: 429,
      expectedStatus: 503,
      category: 'provider_quota',
    },
    {
      status: 503,
      expectedStatus: 503,
      category: 'provider_unavailable',
    },
  ])(
    'maps provider status $status to a safe HTTP $expectedStatus response',
    async ({ status, expectedStatus, category }) => {
      generateContent.mockRejectedValueOnce(
        Object.assign(new Error('private provider detail'), { status }),
      );
      const errorLog = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation(() => undefined);
      const adapter = new AdminAssistantGeminiAdapter(
        config as any,
        { execute } as any,
      );

      await expect(
        adapter.generate({
          message: 'Question',
          history: [],
          language: 'fr',
        }),
      ).rejects.toMatchObject({ status: expectedStatus });

      expect(errorLog).toHaveBeenCalledWith(
        `event=admin_assistant_failure category=${category} reason=provider_error_unspecified provider_status=${status}`,
      );
      expect(JSON.stringify(errorLog.mock.calls)).not.toContain(
        'private provider detail',
      );
    },
  );

  it('maps provider timeouts to 504 and logs no provider details', async () => {
    generateContent.mockRejectedValueOnce(
      Object.assign(new Error('private provider detail'), {
        name: 'TimeoutError',
      }),
    );
    const errorLog = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    const adapter = new AdminAssistantGeminiAdapter(
      config as any,
      { execute } as any,
    );

    await expect(
      adapter.generate({ message: 'Question', history: [], language: 'fr' }),
    ).rejects.toMatchObject({ status: 504 });

    expect(errorLog).toHaveBeenCalledWith(
      'event=admin_assistant_failure category=provider_timeout reason=provider_error_unspecified',
    );
    expect(JSON.stringify(errorLog.mock.calls)).not.toContain(
      'private provider detail',
    );
  });

  it('identifies invalid model JSON without logging its response body', async () => {
    const providerResponse = 'private-provider-response';
    generateContent.mockResolvedValueOnce({ text: providerResponse });
    const warningLog = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
    const adapter = new AdminAssistantGeminiAdapter(
      config as any,
      { execute } as any,
    );

    await expect(
      adapter.generate({ message: 'Question', history: [], language: 'fr' }),
    ).rejects.toBeInstanceOf(BadGatewayException);

    expect(warningLog).toHaveBeenCalledWith(
      'event=admin_assistant_failure category=invalid_json_response',
    );
    expect(JSON.stringify(warningLog.mock.calls)).not.toContain(
      providerResponse,
    );
  });

  it('logs data-source failures by safe exception type only', async () => {
    generateContent
      .mockResolvedValueOnce({
        functionCalls: [{ name: 'get_current_admin_snapshot', args: {} }],
        candidates: [
          {
            content: {
              role: 'model',
              parts: [{ functionCall: { name: 'get_current_admin_snapshot' } }],
            },
          },
        ],
      })
      .mockResolvedValueOnce({
        text: JSON.stringify({
          answer: 'Les données ne sont pas disponibles.',
          language: 'fr',
          recommendations: [],
        }),
      });
    const dataError = Object.assign(new Error('private database message'), {
      name: 'QueryFailedError',
    });
    execute.mockRejectedValueOnce(dataError);
    const errorLog = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    const adapter = new AdminAssistantGeminiAdapter(
      config as any,
      { execute } as any,
    );

    const response = await adapter.generate({
      message: 'Question',
      history: [],
      language: 'fr',
    });

    expect(response.missingData).toContain(
      'Les données demandées ne sont pas disponibles pour le moment.',
    );
    expect(errorLog).toHaveBeenCalledWith(
      'event=admin_assistant_failure category=analytics_tool_failed tool=get_current_admin_snapshot error_type=QueryFailedError',
    );
    expect(JSON.stringify(errorLog.mock.calls)).not.toContain(
      'private database message',
    );
  });
});
