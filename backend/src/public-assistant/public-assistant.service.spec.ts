import {
  ApprovalStatus,
  RecognitionType,
  Training,
  TrainingLifecycleStatus,
} from '../trainings/entities/training.entity';
import { TrainingsService } from '../trainings/trainings.service';
import { SessionsService } from '../sessions/sessions.service';
import { PublicAssistantService } from './public-assistant.service';
import { GeminiAdapter } from './gemini.adapter';
import {
  PublicAssistantIntent,
  PublicAssistantLanguage,
} from './public-assistant.types';
import { Logger, ServiceUnavailableException } from '@nestjs/common';
import type { PublicAssistantModelRequest } from './public-assistant.types';

describe('PublicAssistantService', () => {
  it('uses training and available-session services and returns verified public references', async () => {
    const availableTraining = {
      id: 'training-id',
      slug: 'ems-training',
      title: 'EMS training',
      axisCode: 'EMS',
      lifecycleStatus: TrainingLifecycleStatus.PUBLISHED,
      active: true,
      description: 'Published training',
      durationValue: 1,
      durationUnit: 'DAYS',
      price: 100,
      currency: 'TND',
      recognitionType: RecognitionType.NONE,
      approvalStatus: ApprovalStatus.NOT_APPLICABLE,
      credentialTitle: null,
      certification: null,
      approvalValidUntil: null,
    } as Training;
    const unavailableTraining = {
      ...availableTraining,
      id: 'unavailable-training-id',
      lifecycleStatus: TrainingLifecycleStatus.DRAFT,
    } as Training;
    const sessions = [
      {
        id: 'session-id',
        trainingId: 'training-id',
        trainingSlug: 'ems-training',
        trainingTitle: 'EMS training',
        startDate: '2026-11-10',
        endDate: '2026-11-11',
        startTime: '09:00',
        endTime: '17:00',
        city: 'Tunis',
        mode: 'On-site',
        seatsLeft: 3,
        price: 100,
        currency: 'TND',
        meetingUrl: 'https://private.example.test',
      },
      {
        id: 'unverified-session-id',
        trainingId: 'unavailable-training-id',
        trainingSlug: 'unavailable-training',
      },
    ];
    const findTrainings = jest
      .fn()
      .mockResolvedValue([availableTraining, unavailableTraining]);
    const findAvailableSessions = jest.fn().mockResolvedValue(sessions);
    const trainingsService = {
      findAll: findTrainings,
    } as unknown as TrainingsService;
    const sessionsService = {
      findAllAvailableForRegistration: findAvailableSessions,
    } as unknown as SessionsService;
    const geminiAdapter = {
      generate: jest.fn(),
    } as unknown as GeminiAdapter;
    const service = new PublicAssistantService(
      trainingsService,
      sessionsService,
      geminiAdapter,
    );

    const references = await service.getVerifiedReferences();

    expect(findTrainings).toHaveBeenCalledTimes(1);
    expect(findAvailableSessions).toHaveBeenCalledTimes(1);
    expect(references).toEqual([
      expect.objectContaining({
        type: 'training',
        id: 'training-id',
        href: '/trainings/ems-training',
      }),
      expect.objectContaining({
        type: 'session',
        id: 'session-id',
        href: '/sessions/session-id',
        seatsRemaining: 3,
      }),
    ]);
    expect(JSON.stringify(references)).not.toContain('private.example.test');
    expect(references).toHaveLength(2);
  });

  it('validates model output and returns only backend-built verified references and actions', async () => {
    const trainingId = '0471f81b-168d-4e1e-aee5-e3df92b453a0';
    const training = {
      id: trainingId,
      slug: 'ems-training',
      title: 'EMS training',
      axisCode: 'EMS',
      lifecycleStatus: TrainingLifecycleStatus.PUBLISHED,
      active: true,
      description: 'Published training',
      prerequisites: 'No prerequisites',
      targetAudience: 'Coaches',
      durationValue: 1,
      durationUnit: 'DAYS',
      price: 100,
      currency: 'TND',
      recognitionType: RecognitionType.NONE,
      approvalStatus: ApprovalStatus.NOT_APPLICABLE,
      credentialTitle: null,
      certification: null,
      approvalValidUntil: null,
    } as Training;
    const findTrainings = jest.fn().mockResolvedValue([training]);
    const findAvailableSessions = jest.fn().mockResolvedValue([
      {
        id: 'c4bbbdac-8de6-48ec-b879-b761413903a2',
        trainingId,
        trainingSlug: 'ems-training',
        trainingTitle: 'EMS training',
        startDate: '2026-11-10',
        endDate: '2026-11-11',
        startTime: '09:00',
        endTime: '17:00',
        city: 'Tunis',
        mode: 'On-site',
        seatsLeft: 3,
        price: 100,
        currency: 'TND',
        meetingUrl: 'https://private.example.test',
        internalRegistrationEmail: 'person@example.test',
      },
    ]);
    const generate = jest.fn((request: PublicAssistantModelRequest) => {
      expect(request.message).toBe('Quels sont les prérequis ?');
      return Promise.resolve({
        intent: PublicAssistantIntent.REGISTRATION_GUIDANCE,
        language: PublicAssistantLanguage.FRENCH,
        needsClarification: false,
        referenceIds: [trainingId, 'untrusted-id'],
      });
    });
    const trainingService = {
      findAll: findTrainings,
    } as unknown as TrainingsService;
    const sessionsService = {
      findAllAvailableForRegistration: findAvailableSessions,
    } as unknown as SessionsService;
    const geminiAdapter = { generate } as unknown as GeminiAdapter;
    const service = new PublicAssistantService(
      trainingService,
      sessionsService,
      geminiAdapter,
    );

    const response = await service.chat({
      message: 'Quels sont les prérequis ?',
      history: [
        { role: 'user', content: 'Je cherche EMS.' },
        { role: 'assistant', content: 'Bien sûr.' },
      ],
    });

    expect(generate).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Quels sont les prérequis ?',
        trainingDetails: [
          expect.objectContaining({
            id: trainingId,
            prerequisites: 'No prerequisites',
          }),
        ],
      }),
    );
    const modelContext = JSON.stringify(generate.mock.calls[0][0]);
    expect(modelContext).not.toContain('private.example.test');
    expect(modelContext).not.toContain('person@example.test');
    expect(response.references).toHaveLength(1);
    expect(response.references[0].id).toBe(trainingId);
    expect(response.actions).toEqual([
      { label: 'Voir la démarche d’inscription', href: '/register' },
    ]);
  });

  it('builds factual answers only from verified references, ignoring model claims', async () => {
    const trainingId = '0471f81b-168d-4e1e-aee5-e3df92b453a0';
    const training = {
      id: trainingId,
      slug: 'ems-training',
      title: 'EMS training',
      axisCode: 'EMS',
      lifecycleStatus: TrainingLifecycleStatus.PUBLISHED,
      active: true,
      description: 'Published training',
      durationValue: 1,
      durationUnit: 'DAYS',
      price: 100,
      currency: 'TND',
      recognitionType: RecognitionType.NONE,
      approvalStatus: ApprovalStatus.NOT_APPLICABLE,
      credentialTitle: null,
      certification: null,
      approvalValidUntil: null,
    } as Training;
    const sessionId = 'c4bbbdac-8de6-48ec-b879-b761413903a2';
    const trainingsService = {
      findAll: jest.fn().mockResolvedValue([training]),
    } as unknown as TrainingsService;
    const sessionsService = {
      findAllAvailableForRegistration: jest.fn().mockResolvedValue([
        {
          id: sessionId,
          trainingId,
          trainingSlug: 'ems-training',
          trainingTitle: 'EMS training',
          startDate: '2026-11-10',
          endDate: '2026-11-11',
          startTime: '09:00',
          endTime: '17:00',
          city: 'Tunis',
          mode: 'On-site',
          seatsLeft: 3,
          price: 100,
          currency: 'TND',
        },
      ]),
    } as unknown as SessionsService;
    const geminiAdapter = {
      generate: jest.fn().mockResolvedValue({
        intent: PublicAssistantIntent.SESSION_SEARCH,
        language: PublicAssistantLanguage.FRENCH,
        needsClarification: false,
        referenceIds: [sessionId],
      }),
    } as unknown as GeminiAdapter;
    const service = new PublicAssistantService(
      trainingsService,
      sessionsService,
      geminiAdapter,
    );

    const response = await service.chat({
      message: 'Quelles sont les dates et le prix ?',
      history: [],
    });

    expect(response.answer).toContain('2026-11-10 – 2026-11-11');
    expect(response.answer).toContain('Prix: 100 TND');
    expect(response.answer).toContain('Places restantes: 3');
    expect(response.answer).not.toMatch(
      /1 TND|2099|500 places|diplôme garanti/,
    );
    expect(response.references.map(({ id }) => id)).toEqual([sessionId]);
    expect(response.suggestedQuestions).toEqual([
      'Quelles sont les prochaines sessions ?',
      'Comment démarrer une inscription ?',
    ]);
  });

  it('uses only verified training prerequisites and recognition in training answers', async () => {
    const trainingId = '0471f81b-168d-4e1e-aee5-e3df92b453a0';
    const training = {
      id: trainingId,
      slug: 'ems-training',
      title: 'EMS training',
      axisCode: 'EMS',
      lifecycleStatus: TrainingLifecycleStatus.PUBLISHED,
      active: true,
      description: 'Published training',
      prerequisites: 'Open to all',
      targetAudience: 'Coaches',
      durationValue: 1,
      durationUnit: 'DAYS',
      price: 100,
      currency: 'TND',
      recognitionType: RecognitionType.I_MOTION_CERTIFICATE,
      approvalStatus: ApprovalStatus.NOT_APPLICABLE,
      credentialTitle: 'i-Motion Certificate',
      certification: null,
      approvalValidUntil: null,
    } as Training;
    const service = new PublicAssistantService(
      {
        findAll: jest.fn().mockResolvedValue([training]),
      } as unknown as TrainingsService,
      {
        findAllAvailableForRegistration: jest.fn().mockResolvedValue([]),
      } as unknown as SessionsService,
      {
        generate: jest.fn().mockResolvedValue({
          intent: PublicAssistantIntent.TRAINING_SEARCH,
          language: PublicAssistantLanguage.ENGLISH,
          needsClarification: false,
          referenceIds: [trainingId],
        }),
      } as unknown as GeminiAdapter,
    );

    const response = await service.chat({
      message: 'What are the prerequisites?',
      history: [],
    });

    expect(response.answer).toContain('Price: 100 TND');
    expect(response.answer).toContain(
      'Recognition listed: i-Motion Certificate',
    );
    expect(response.answer).toContain('Prerequisites listed: Open to all');
  });

  it('asks for clarification when the model provides no verified session reference', async () => {
    const trainingsService = {
      findAll: jest.fn().mockResolvedValue([]),
    } as unknown as TrainingsService;
    const sessionsService = {
      findAllAvailableForRegistration: jest.fn().mockResolvedValue([]),
    } as unknown as SessionsService;
    const geminiAdapter = {
      generate: jest.fn().mockResolvedValue({
        intent: PublicAssistantIntent.SESSION_SEARCH,
        language: PublicAssistantLanguage.FRENCH,
        needsClarification: false,
        referenceIds: ['unknown-session-id'],
      }),
    } as unknown as GeminiAdapter;
    const service = new PublicAssistantService(
      trainingsService,
      sessionsService,
      geminiAdapter,
    );

    const response = await service.chat({
      message: 'Y a-t-il une session ?',
      history: [],
    });

    expect(response.answer).not.toMatch(/demain|1 TND/);
    expect(response.references).toEqual([]);
    expect(response.needsClarification).toBe(true);
    expect(response.actions).toEqual([
      { label: 'Contacter i-Motion Academy', href: '/contact' },
    ]);
  });

  it('forces clarification intent to set needsClarification to true', async () => {
    const service = new PublicAssistantService(
      {
        findAll: jest.fn().mockResolvedValue([]),
      } as unknown as TrainingsService,
      {
        findAllAvailableForRegistration: jest.fn().mockResolvedValue([]),
      } as unknown as SessionsService,
      {
        generate: jest.fn().mockResolvedValue({
          intent: PublicAssistantIntent.CLARIFICATION,
          language: PublicAssistantLanguage.FRENCH,
          needsClarification: false,
          referenceIds: [],
        }),
      } as unknown as GeminiAdapter,
    );

    const response = await service.chat({ message: 'Bonjour', history: [] });

    expect(response.intent).toBe(PublicAssistantIntent.CLARIFICATION);
    expect(response.needsClarification).toBe(true);
    expect(response.actions).toEqual([
      { label: 'Contacter i-Motion Academy', href: '/contact' },
    ]);
  });

  it('normalizes clarification requested by another intent to the clarification intent', async () => {
    const service = new PublicAssistantService(
      {
        findAll: jest.fn().mockResolvedValue([]),
      } as unknown as TrainingsService,
      {
        findAllAvailableForRegistration: jest.fn().mockResolvedValue([]),
      } as unknown as SessionsService,
      {
        generate: jest.fn().mockResolvedValue({
          intent: PublicAssistantIntent.GENERAL_INFO,
          language: PublicAssistantLanguage.FRENCH,
          needsClarification: true,
          referenceIds: [],
        }),
      } as unknown as GeminiAdapter,
    );

    const response = await service.chat({
      message: 'Une demande ambiguë',
      history: [],
    });

    expect(response.intent).toBe(PublicAssistantIntent.CLARIFICATION);
    expect(response.needsClarification).toBe(true);
    expect(response.answer).toContain('préciser votre demande');
    expect(response.suggestedQuestions).toEqual([]);
    expect(response.actions.map(({ href }) => href)).toEqual(['/contact']);
  });

  it('keeps a search intent with clarification when no verified reference matches', async () => {
    const service = new PublicAssistantService(
      {
        findAll: jest.fn().mockResolvedValue([]),
      } as unknown as TrainingsService,
      {
        findAllAvailableForRegistration: jest.fn().mockResolvedValue([]),
      } as unknown as SessionsService,
      {
        generate: jest.fn().mockResolvedValue({
          intent: PublicAssistantIntent.SESSION_SEARCH,
          language: PublicAssistantLanguage.FRENCH,
          needsClarification: true,
          referenceIds: [],
        }),
      } as unknown as GeminiAdapter,
    );

    const response = await service.chat({
      message: 'Je cherche une session',
      history: [],
    });

    expect(response.intent).toBe(PublicAssistantIntent.SESSION_SEARCH);
    expect(response.needsClarification).toBe(true);
    expect(response.references).toEqual([]);
    expect(response.answer).toContain('préciser la formation');
  });

  it('returns Arabic copy, language, verified references and only internal actions', async () => {
    const trainingId = '0471f81b-168d-4e1e-aee5-e3df92b453a0';
    const training = {
      id: trainingId,
      slug: 'ems-training',
      title: 'EMS training',
      axisCode: 'EMS',
      lifecycleStatus: TrainingLifecycleStatus.PUBLISHED,
      active: true,
      description: 'Published training',
      prerequisites: 'Open to all',
      targetAudience: 'Coaches',
      durationValue: 1,
      durationUnit: 'DAYS',
      price: 100,
      currency: 'TND',
      recognitionType: RecognitionType.I_MOTION_CERTIFICATE,
      approvalStatus: ApprovalStatus.NOT_APPLICABLE,
      credentialTitle: 'i-Motion Certificate',
      certification: null,
      approvalValidUntil: null,
    } as Training;
    const service = new PublicAssistantService(
      {
        findAll: jest.fn().mockResolvedValue([training]),
      } as unknown as TrainingsService,
      {
        findAllAvailableForRegistration: jest.fn().mockResolvedValue([]),
      } as unknown as SessionsService,
      {
        generate: jest.fn().mockResolvedValue({
          intent: PublicAssistantIntent.REGISTRATION_GUIDANCE,
          language: PublicAssistantLanguage.ARABIC,
          needsClarification: false,
          referenceIds: [trainingId, 'unknown-id'],
        }),
      } as unknown as GeminiAdapter,
    );

    const response = await service.chat({
      message: 'كيف أبدأ التسجيل؟',
      history: [],
    });

    expect(response.language).toBe(PublicAssistantLanguage.ARABIC);
    expect(response.answer).toMatch(/[\u0600-\u06FF]/);
    expect(response.suggestedQuestions).toEqual(['ما التكوينات المتاحة؟']);
    expect(response.suggestedQuestions.join(' ')).toMatch(/[\u0600-\u06FF]/);
    expect(response.references.map(({ id }) => id)).toEqual([trainingId]);
    expect(response.actions).toEqual([
      { label: 'عرض خطوات التسجيل', href: '/register' },
    ]);
    expect(
      response.actions.every(({ href }) =>
        ['/register', '/contact'].includes(href),
      ),
    ).toBe(true);
  });

  it('uses the verified backend answer when the model output is invalid', async () => {
    const trainingService = {
      findAll: jest.fn().mockResolvedValue([]),
    } as unknown as TrainingsService;
    const sessionsService = {
      findAllAvailableForRegistration: jest.fn().mockResolvedValue([]),
    } as unknown as SessionsService;
    const geminiAdapter = {
      generate: jest.fn().mockResolvedValue({
        intent: 'ADMIN_ACTION',
        language: PublicAssistantLanguage.FRENCH,
        needsClarification: false,
        referenceIds: [],
      }),
    } as unknown as GeminiAdapter;
    const service = new PublicAssistantService(
      trainingService,
      sessionsService,
      geminiAdapter,
    );

    const response = await service.chat({ message: 'Hello', history: [] });

    expect(response.answer).toContain('Je peux vous aider');
    expect(response.intent).toBe(PublicAssistantIntent.GENERAL_INFO);
    expect(response.references).toEqual([]);
  });

  it('uses the model answer while retaining backend-verified response metadata', async () => {
    const service = new PublicAssistantService(
      {
        findAll: jest.fn().mockResolvedValue([]),
      } as unknown as TrainingsService,
      {
        findAllAvailableForRegistration: jest.fn().mockResolvedValue([]),
      } as unknown as SessionsService,
      {
        generate: jest.fn().mockResolvedValue({
          intent: PublicAssistantIntent.GENERAL_INFO,
          language: PublicAssistantLanguage.FRENCH,
          needsClarification: false,
          referenceIds: [],
          answer: 'Bonjour, je peux vous renseigner sur i-Motion Academy.',
        }),
      } as unknown as GeminiAdapter,
    );
    const log = jest
      .spyOn((service as unknown as { logger: Logger }).logger, 'log')
      .mockImplementation();

    const response = await service.chat({
      message: 'Bonjour',
      history: [],
    });

    expect(response.answer).toBe(
      'Bonjour, je peux vous renseigner sur i-Motion Academy.',
    );
    expect(response.intent).toBe(PublicAssistantIntent.GENERAL_INFO);
    expect(response.suggestedQuestions).toEqual([
      'Quelles formations sont disponibles ?',
      'Quelles sessions sont disponibles ?',
    ]);
    expect(log).toHaveBeenCalledWith('Public assistant answer source: Gemini.');
    log.mockRestore();
  });

  it('uses the verified backend fallback when Gemini is unavailable', async () => {
    const service = new PublicAssistantService(
      {
        findAll: jest.fn().mockResolvedValue([]),
      } as unknown as TrainingsService,
      {
        findAllAvailableForRegistration: jest.fn().mockResolvedValue([]),
      } as unknown as SessionsService,
      {
        generate: jest
          .fn()
          .mockRejectedValue(
            new ServiceUnavailableException('provider details must not escape'),
          ),
      } as unknown as GeminiAdapter,
    );
    const log = jest
      .spyOn((service as unknown as { logger: Logger }).logger, 'log')
      .mockImplementation();

    const response = await service.chat({
      message: 'Bonjour',
      history: [],
    });

    expect(response.answer).toContain('Je peux vous aider');
    expect(response.answer).not.toContain('provider details');
    expect(response.language).toBe(PublicAssistantLanguage.FRENCH);
    expect(response.references).toEqual([]);
    expect(log).toHaveBeenCalledWith(
      'Public assistant answer source: backend fallback.',
    );
    log.mockRestore();
  });

  it('falls back to backend text when a valid model classification omits its answer', async () => {
    const service = new PublicAssistantService(
      {
        findAll: jest.fn().mockResolvedValue([]),
      } as unknown as TrainingsService,
      {
        findAllAvailableForRegistration: jest.fn().mockResolvedValue([]),
      } as unknown as SessionsService,
      {
        generate: jest.fn().mockResolvedValue({
          intent: PublicAssistantIntent.GENERAL_INFO,
          language: PublicAssistantLanguage.ENGLISH,
          needsClarification: false,
          referenceIds: [],
        }),
      } as unknown as GeminiAdapter,
    );

    const response = await service.chat({
      message: 'Hello',
      history: [],
    });

    expect(response.answer).toContain('I can help you');
    expect(response.language).toBe(PublicAssistantLanguage.ENGLISH);
  });
});
