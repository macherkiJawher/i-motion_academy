import {
  BadGatewayException,
  GatewayTimeoutException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { trainingAvailabilityError } from '../trainings/training-availability';
import { TrainingsService } from '../trainings/trainings.service';
import { SessionsService } from '../sessions/sessions.service';
import {
  PublicAssistantReference,
  PublicAssistantSessionReference,
  PublicAssistantTrainingReference,
  PublicAssistantChatResponse,
  PublicAssistantIntent,
  PublicAssistantLanguage,
  PublicAssistantModelRequest,
  PublicAssistantModelResponse,
} from './public-assistant.types';
import { PublicAssistantModelResponseDto } from './dto/public-assistant-model-response.dto';
import { PublicAssistantChatRequestDto } from './dto/public-assistant-chat.dto';
import { GeminiAdapter } from './gemini.adapter';
import { PublicAssistantChatResponseDto } from './dto/public-assistant-chat.dto';

@Injectable()
export class PublicAssistantService {
  private readonly logger = new Logger(PublicAssistantService.name);

  constructor(
    private readonly trainingsService: TrainingsService,
    private readonly sessionsService: SessionsService,
    private readonly geminiAdapter: GeminiAdapter,
  ) {}

  async getVerifiedReferences(): Promise<PublicAssistantReference[]> {
    return (await this.getVerifiedContext()).references;
  }

  async chat(
    request: PublicAssistantChatRequestDto,
  ): Promise<PublicAssistantChatResponse> {
    const context = await this.getVerifiedContext();
    let validatedModelResponse: PublicAssistantModelResponse;
    try {
      const modelResponse = await this.geminiAdapter.generate({
        message: request.message,
        history: request.history ?? [],
        references: context.references,
        trainingDetails: context.trainingDetails,
      });
      validatedModelResponse = await this.validateModelResponse(modelResponse);
    } catch (error) {
      if (
        !(error instanceof BadGatewayException) &&
        !(error instanceof GatewayTimeoutException) &&
        !(error instanceof ServiceUnavailableException)
      ) {
        throw error;
      }
      this.logger.warn(
        'Gemini response unavailable or invalid; using the verified fallback.',
      );
      validatedModelResponse = {
        answer: '',
        intent: PublicAssistantIntent.GENERAL_INFO,
        language: PublicAssistantLanguage.FRENCH,
        needsClarification: false,
        referenceIds: [],
      };
    }
    const referencesById = new Map(
      context.references.map((reference) => [reference.id, reference]),
    );
    const selectedReferences = validatedModelResponse.referenceIds
      .map((id) => referencesById.get(id))
      .filter(
        (reference): reference is PublicAssistantReference =>
          reference !== undefined,
      )
      .filter((reference) =>
        this.referenceMatchesIntent(reference, validatedModelResponse.intent),
      )
      .slice(0, 5);
    const searchHasNoReferences =
      (validatedModelResponse.intent ===
        PublicAssistantIntent.TRAINING_SEARCH ||
        validatedModelResponse.intent ===
          PublicAssistantIntent.TRAINING_COMPARISON ||
        validatedModelResponse.intent ===
          PublicAssistantIntent.SESSION_SEARCH) &&
      selectedReferences.length === 0;
    const responseIntent =
      validatedModelResponse.intent !== PublicAssistantIntent.CLARIFICATION &&
      validatedModelResponse.needsClarification &&
      !searchHasNoReferences
        ? PublicAssistantIntent.CLARIFICATION
        : validatedModelResponse.intent;
    const responseReferences =
      responseIntent === PublicAssistantIntent.CLARIFICATION
        ? []
        : selectedReferences;
    const needsClarification =
      responseIntent === PublicAssistantIntent.CLARIFICATION ||
      validatedModelResponse.needsClarification ||
      searchHasNoReferences;
    const actions =
      responseIntent === PublicAssistantIntent.REGISTRATION_GUIDANCE
        ? [
            {
              label: this.getCopy(validatedModelResponse.language).register,
              href: '/register' as const,
            },
          ]
        : needsClarification ||
            validatedModelResponse.intent === PublicAssistantIntent.OUT_OF_SCOPE
          ? [
              {
                label: this.getCopy(validatedModelResponse.language).contact,
                href: '/contact' as const,
              },
            ]
          : [];

    const answerFromGemini =
      Boolean(validatedModelResponse.answer?.trim()) && !searchHasNoReferences;
    const response = plainToInstance(PublicAssistantChatResponseDto, {
      answer: answerFromGemini
        ? validatedModelResponse.answer?.trim()
        : this.buildVerifiedAnswer(
            responseIntent,
            responseReferences,
            validatedModelResponse.language,
            context.trainingDetails,
          ),
      intent: responseIntent,
      language: validatedModelResponse.language,
      needsClarification,
      references: responseReferences,
      actions,
      suggestedQuestions: this.getSuggestedQuestions(
        responseIntent,
        validatedModelResponse.language,
      ),
    });
    const errors = await validate(response, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    if (errors.length > 0) {
      throw new BadGatewayException('Assistant response is unavailable');
    }
    this.logger.log(
      `Public assistant answer source: ${answerFromGemini ? 'Gemini' : 'backend fallback'}.`,
    );
    return response;
  }

  private async getVerifiedContext() {
    const [trainings, sessions] = await Promise.all([
      this.trainingsService.findAll(),
      this.sessionsService.findAllAvailableForRegistration(),
    ]);

    const availableTrainings = trainings.filter(
      (training) => trainingAvailabilityError(training) === null,
    );
    const trainingsById = new Map(
      availableTrainings.map((training) => [training.id, training]),
    );

    const trainingReferences: PublicAssistantTrainingReference[] =
      availableTrainings.map((training) => ({
        type: 'training',
        id: training.id,
        slug: training.slug,
        title: training.title,
        href: `/trainings/${encodeURIComponent(training.slug)}`,
        price: {
          amount: training.price,
          currency: training.currency,
        },
        duration: {
          value: training.durationValue,
          unit: training.durationUnit,
        },
        recognition: {
          type: training.recognitionType,
          title: training.credentialTitle ?? training.certification,
          approvalStatus: training.approvalStatus,
          validUntil: training.approvalValidUntil,
        },
      }));

    const sessionReferences: PublicAssistantSessionReference[] = sessions
      .filter((session) => {
        const training = trainingsById.get(session.trainingId);
        return training?.slug === session.trainingSlug;
      })
      .map((session) => ({
        type: 'session',
        id: session.id,
        trainingId: session.trainingId,
        trainingSlug: session.trainingSlug,
        title: session.trainingTitle,
        href: `/sessions/${encodeURIComponent(session.id)}`,
        startDate: session.startDate,
        endDate: session.endDate,
        startTime: session.startTime,
        endTime: session.endTime,
        city: session.city,
        mode: session.mode,
        seatsRemaining: session.seatsLeft,
        price: {
          amount: session.price,
          currency: session.currency,
        },
      }));

    return {
      references: [...trainingReferences, ...sessionReferences],
      trainingDetails: availableTrainings.map((training) => ({
        id: training.id,
        prerequisites: training.prerequisites,
        targetAudience: training.targetAudience,
        description: training.description,
      })),
    };
  }

  private referenceMatchesIntent(
    reference: PublicAssistantReference,
    intent: PublicAssistantIntent,
  ): boolean {
    if (
      intent === PublicAssistantIntent.TRAINING_SEARCH ||
      intent === PublicAssistantIntent.TRAINING_COMPARISON
    ) {
      return reference.type === 'training';
    }
    if (intent === PublicAssistantIntent.SESSION_SEARCH) {
      return reference.type === 'session';
    }
    return (
      intent === PublicAssistantIntent.REGISTRATION_GUIDANCE &&
      (reference.type === 'training' || reference.type === 'session')
    );
  }

  private buildVerifiedAnswer(
    intent: PublicAssistantIntent,
    references: PublicAssistantReference[],
    language: PublicAssistantLanguage,
    trainingDetails: PublicAssistantModelRequest['trainingDetails'],
  ): string {
    const copy = this.getCopy(language);
    if (
      intent === PublicAssistantIntent.TRAINING_SEARCH ||
      intent === PublicAssistantIntent.TRAINING_COMPARISON
    ) {
      const trainings = references.filter(
        (reference): reference is PublicAssistantTrainingReference =>
          reference.type === 'training',
      );
      if (trainings.length === 0) {
        return copy.noTraining;
      }
      const trainingDetailsById = new Map(
        trainingDetails.map((training) => [training.id, training]),
      );
      return trainings
        .map((training) => {
          const details = [
            `${copy.price}: ${training.price.amount} ${training.price.currency}`,
            `${copy.duration}: ${training.duration.value} ${training.duration.unit}`,
          ];
          if (training.recognition.type === 'NONE') {
            details.push(copy.noRecognition);
          } else if (training.recognition.title) {
            details.push(`${copy.recognition}: ${training.recognition.title}`);
          }
          const prerequisites = trainingDetailsById
            .get(training.id)
            ?.prerequisites.trim()
            .slice(0, 300);
          if (prerequisites) {
            details.push(`${copy.prerequisites}: ${prerequisites}`);
          }
          if (
            training.recognition.approvalStatus === 'APPROVED' &&
            training.recognition.validUntil
          ) {
            details.push(
              `${copy.approvedUntil}: ${training.recognition.validUntil}`,
            );
          }
          return `${training.title} — ${details.join('. ')}.`;
        })
        .join('\n');
    }

    if (intent === PublicAssistantIntent.SESSION_SEARCH) {
      const sessions = references.filter(
        (reference): reference is PublicAssistantSessionReference =>
          reference.type === 'session',
      );
      if (sessions.length === 0) {
        return copy.noSession;
      }
      return sessions
        .map((session) => {
          const details = [
            `${copy.dates}: ${session.startDate} – ${session.endDate}`,
            `${copy.price}: ${session.price.amount} ${session.price.currency}`,
            `${copy.seats}: ${session.seatsRemaining}`,
          ];
          if (session.city) details.push(`${copy.location}: ${session.city}`);
          if (session.mode) details.push(`${copy.mode}: ${session.mode}`);
          return `${session.title} — ${details.join('. ')}.`;
        })
        .join('\n');
    }

    switch (intent) {
      case PublicAssistantIntent.REGISTRATION_GUIDANCE:
        return copy.registration;
      case PublicAssistantIntent.OUT_OF_SCOPE:
        return copy.outOfScope;
      case PublicAssistantIntent.CLARIFICATION:
        return copy.clarification;
      default:
        return copy.general;
    }
  }

  private getSuggestedQuestions(
    intent: PublicAssistantIntent,
    language: PublicAssistantLanguage,
  ): string[] {
    const copy = this.getCopy(language);
    switch (intent) {
      case PublicAssistantIntent.TRAINING_SEARCH:
      case PublicAssistantIntent.TRAINING_COMPARISON:
        return [copy.askSessions, copy.askPrerequisites];
      case PublicAssistantIntent.SESSION_SEARCH:
        return [copy.askNextSessions, copy.askRegistration];
      case PublicAssistantIntent.REGISTRATION_GUIDANCE:
        return [copy.askTrainings];
      case PublicAssistantIntent.OUT_OF_SCOPE:
      case PublicAssistantIntent.CLARIFICATION:
        return [];
      default:
        return [copy.askTrainings, copy.askSessions];
    }
  }

  private getCopy(language: PublicAssistantLanguage) {
    if (language === PublicAssistantLanguage.ENGLISH) {
      return {
        register: 'View registration steps',
        contact: 'Contact i-Motion Academy',
        noTraining:
          'I do not have a verified training reference for this request. Could you specify the name or subject area?',
        noSession:
          'I do not have a verified session reference for this request. Could you specify the training you are looking for?',
        price: 'Price',
        duration: 'Duration',
        noRecognition: 'No recognition is listed',
        recognition: 'Recognition listed',
        prerequisites: 'Prerequisites listed',
        approvedUntil: 'Approval valid until',
        dates: 'Dates',
        seats: 'Places remaining',
        location: 'Location',
        mode: 'Format',
        registration:
          'I cannot complete a registration or payment for you. You can visit the registration page to get started.',
        outOfScope:
          'I can help you look up training and available sessions. For another request, please contact i-Motion Academy.',
        clarification:
          'Could you clarify your request: are you looking for training, a session, or registration information?',
        general:
          'I can help you look up training and sessions offered by i-Motion Academy.',
        askSessions: 'Which sessions are available?',
        askPrerequisites: 'What are the prerequisites?',
        askNextSessions: 'What are the upcoming sessions?',
        askRegistration: 'How do I start a registration?',
        askTrainings: 'Which training courses are available?',
      };
    }
    if (language === PublicAssistantLanguage.ARABIC) {
      return {
        register: 'عرض خطوات التسجيل',
        contact: 'تواصل مع i-Motion Academy',
        noTraining:
          'لا تتوفر لديّ مرجعية موثقة لتكوين مطابق لهذا الطلب. هل يمكنك تحديد الاسم أو المجال؟',
        noSession:
          'لا تتوفر لديّ مرجعية موثقة لحصة مطابقة لهذا الطلب. ما التكوين الذي تبحث عنه؟',
        price: 'السعر',
        duration: 'المدة',
        noRecognition: 'لا توجد شهادة أو اعتماد مدرج',
        recognition: 'الاعتماد المدرج',
        prerequisites: 'المتطلبات السابقة المدرجة',
        approvedUntil: 'الاعتماد ساري حتى',
        dates: 'التواريخ',
        seats: 'المقاعد المتبقية',
        location: 'المكان',
        mode: 'النمط',
        registration:
          'لا يمكنني إتمام التسجيل أو الدفع نيابةً عنك. يمكنك زيارة صفحة التسجيل للبدء.',
        outOfScope:
          'يمكنني مساعدتك في البحث عن التكوينات والحصص المتاحة. لطلب آخر، يرجى التواصل مع i-Motion Academy.',
        clarification:
          'هل يمكنك توضيح طلبك: هل تبحث عن تكوين أو حصة أو معلومات حول التسجيل؟',
        general:
          'يمكنني مساعدتك في البحث عن التكوينات والحصص التي تقدمها i-Motion Academy.',
        askSessions: 'ما الحصص المتاحة؟',
        askPrerequisites: 'ما المتطلبات السابقة؟',
        askNextSessions: 'ما الحصص القادمة؟',
        askRegistration: 'كيف أبدأ التسجيل؟',
        askTrainings: 'ما التكوينات المتاحة؟',
      };
    }
    return {
      register: 'Voir la démarche d’inscription',
      contact: 'Contacter i-Motion Academy',
      noTraining:
        'Je n’ai pas de référence de formation vérifiée pour cette demande. Pouvez-vous préciser le nom ou le domaine recherché ?',
      noSession:
        'Je n’ai pas de référence de session vérifiée pour cette demande. Pouvez-vous préciser la formation recherchée ?',
      price: 'Prix',
      duration: 'Durée',
      noRecognition: 'Aucune reconnaissance n’est indiquée',
      recognition: 'Reconnaissance indiquée',
      prerequisites: 'Prérequis indiqués',
      approvedUntil: 'Homologation approuvée jusqu’au',
      dates: 'Dates',
      seats: 'Places restantes',
      location: 'Lieu',
      mode: 'Modalité',
      registration:
        'Je ne peux pas effectuer une inscription ou un paiement à votre place. Vous pouvez consulter la page d’inscription pour démarrer.',
      outOfScope:
        'Je peux vous aider à consulter les formations et les sessions disponibles. Pour une autre demande, contactez i-Motion Academy.',
      clarification:
        'Pouvez-vous préciser votre demande : recherchez-vous une formation, une session ou des informations sur l’inscription ?',
      general:
        'Je peux vous aider à consulter les formations et les sessions proposées par i-Motion Academy.',
      askSessions: 'Quelles sessions sont disponibles ?',
      askPrerequisites: 'Quels sont les prérequis ?',
      askNextSessions: 'Quelles sont les prochaines sessions ?',
      askRegistration: 'Comment démarrer une inscription ?',
      askTrainings: 'Quelles formations sont disponibles ?',
    };
  }

  private async validateModelResponse(
    value: unknown,
  ): Promise<PublicAssistantModelResponse> {
    let parsed: unknown = value;
    if (typeof value === 'string') {
      try {
        parsed = JSON.parse(value);
      } catch {
        throw new BadGatewayException('Assistant response is unavailable');
      }
    }
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      throw new BadGatewayException('Assistant response is unavailable');
    }
    const response = plainToInstance(PublicAssistantModelResponseDto, parsed);
    const errors = await validate(response, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    if (errors.length > 0) {
      throw new BadGatewayException('Assistant response is unavailable');
    }
    return response;
  }
}
