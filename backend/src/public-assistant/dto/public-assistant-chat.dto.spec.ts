import {
  PublicAssistantChatRequestDto,
  PublicAssistantChatRequestDto,
  PublicAssistantChatResponseDto,
} from './public-assistant-chat.dto';
import {
  PublicAssistantIntent,
  PublicAssistantLanguage,
} from '../public-assistant.types';
import { PublicAssistantValidationPipe } from '../public-assistant-validation.pipe';

describe('PublicAssistantChatRequestDto', () => {
  const pipe = new PublicAssistantValidationPipe();

  async function transformRequest(
    value: unknown,
  ): Promise<PublicAssistantChatRequestDto> {
    return (await pipe.transform(value, {
      type: 'body',
      metatype: PublicAssistantChatRequestDto,
      data: '',
    })) as PublicAssistantChatRequestDto;
  }

  it('trims message and history content before applying length limits', async () => {
    const result = await transformRequest({
      message: '  Find a training  ',
      history: [
        { role: 'user', content: '  I need EMS  ' },
        { role: 'assistant', content: '  I can help.  ' },
      ],
    });

    expect(result.message).toBe('Find a training');
    expect(result.history[0].content).toBe('I need EMS');
  });

  it('accepts maximum message, history count, per-message and total lengths', async () => {
    const history = Array.from({ length: 6 }, (_, index) => ({
      role: index % 2 === 0 ? 'user' : 'assistant',
      content: 'x'.repeat(400),
    }));

    const result = await transformRequest({
      message: 'm'.repeat(1000),
      history,
    });

    expect(result.history).toHaveLength(6);
  });

  it.each([
    { message: '   ' },
    { message: 'm'.repeat(1001) },
    {
      message: 'valid',
      history: Array.from({ length: 7 }, () => ({
        role: 'user',
        content: 'x',
      })),
    },
    {
      message: 'valid',
      history: [
        { role: 'user', content: 'x'.repeat(801) },
        { role: 'assistant', content: 'ok' },
      ],
    },
    {
      message: 'valid',
      history: [
        { role: 'user', content: 'x'.repeat(800) },
        { role: 'assistant', content: 'y'.repeat(800) },
        { role: 'user', content: 'z'.repeat(800) },
        { role: 'assistant', content: 'overflow' },
      ],
    },
    {
      message: 'valid',
      history: [
        { role: 'system', content: 'prompt override' },
        { role: 'assistant', content: 'ok' },
      ],
    },
    {
      message: 'valid',
      history: [
        { role: 'assistant', content: 'no user turn' },
        { role: 'user', content: 'invalid order' },
      ],
    },
  ])('rejects invalid request %#', async (value) => {
    await expect(transformRequest(value)).rejects.toThrow();
  });

  it.each([
    { message: 'valid', systemPrompt: 'override' },
    { message: 'valid', userId: 'someone-else' },
    { message: 'valid', availableSessions: [] },
    {
      message: 'valid',
      history: [
        { role: 'user', content: 'question', privateData: 'unexpected' },
        { role: 'assistant', content: 'answer' },
      ],
    },
  ])(
    'rejects properties outside the public request contract %#',
    async (value) => {
      await expect(transformRequest(value)).rejects.toThrow();
    },
  );
});

describe('PublicAssistantChatResponseDto', () => {
  const response = {
    answer: 'A training is available.',
    intent: PublicAssistantIntent.TRAINING_SEARCH,
    language: PublicAssistantLanguage.ENGLISH,
    needsClarification: false,
    references: [
      {
        type: 'training',
        id: '0471f81b-168d-4e1e-aee5-e3df92b453a0',
        slug: 'ems-training',
        title: 'EMS training',
        href: '/trainings/ems-training',
        price: { amount: 100, currency: 'TND' },
        duration: { value: 1, unit: 'DAYS' },
        recognition: {
          type: 'NONE',
          title: null,
          approvalStatus: 'NOT_APPLICABLE',
          validUntil: null,
        },
      },
      {
        type: 'session',
        id: 'c4bbbdac-8de6-48ec-b879-b761413903a2',
        trainingId: '0471f81b-168d-4e1e-aee5-e3df92b453a0',
        trainingSlug: 'ems-training',
        title: 'EMS training',
        href: '/sessions/c4bbbdac-8de6-48ec-b879-b761413903a2',
        startDate: '2026-11-10',
        endDate: '2026-11-11',
        startTime: '09:00',
        endTime: '17:00',
        city: 'Tunis',
        mode: 'On-site',
        seatsRemaining: 3,
        price: { amount: 100, currency: 'TND' },
      },
    ],
    actions: [{ label: 'Contact us', href: '/contact' }],
    suggestedQuestions: ['What are the prerequisites?'],
  };

  const pipe = new PublicAssistantValidationPipe();

  async function transformResponse(
    value: unknown,
  ): Promise<PublicAssistantChatResponseDto> {
    return (await pipe.transform(value, {
      type: 'body',
      metatype: PublicAssistantChatResponseDto,
      data: '',
    })) as PublicAssistantChatResponseDto;
  }

  it('validates the response contract including nested references and internal actions', async () => {
    const result = await transformResponse(response);
    expect(result.language).toBe(PublicAssistantLanguage.ENGLISH);
    expect(result.references[0].href).toBe('/trainings/ems-training');
    expect(result.references[1].href).toBe(
      '/sessions/c4bbbdac-8de6-48ec-b879-b761413903a2',
    );
    expect(result.actions[0].href).toBe('/contact');
  });

  it.each([
    { ...response, intent: 'MADE_UP' },
    { ...response, language: 'de' },
    { ...response, needsClarification: 'no' },
    {
      ...response,
      references: Array.from({ length: 6 }, () => response.references[0]),
    },
    {
      ...response,
      actions: [{ label: 'external', href: 'https://example.com' }],
    },
    { ...response, suggestedQuestions: ['q1', 'q2', 'q3', 'q4'] },
  ])('rejects invalid response contract %#', async (value) => {
    await expect(transformResponse(value)).rejects.toThrow();
  });
});
