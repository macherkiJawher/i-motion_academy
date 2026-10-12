export enum PublicAssistantIntent {
  GENERAL_INFO = 'GENERAL_INFO',
  TRAINING_SEARCH = 'TRAINING_SEARCH',
  TRAINING_COMPARISON = 'TRAINING_COMPARISON',
  SESSION_SEARCH = 'SESSION_SEARCH',
  REGISTRATION_GUIDANCE = 'REGISTRATION_GUIDANCE',
  OUT_OF_SCOPE = 'OUT_OF_SCOPE',
  CLARIFICATION = 'CLARIFICATION',
}

export enum PublicAssistantLanguage {
  FRENCH = 'fr',
  ENGLISH = 'en',
  ARABIC = 'ar',
}

export type PublicAssistantReference =
  PublicAssistantTrainingReference | PublicAssistantSessionReference;

export interface PublicAssistantTrainingReference {
  type: 'training';
  id: string;
  slug: string;
  title: string;
  href: string;
  price: {
    amount: number;
    currency: string;
  };
  duration: {
    value: number;
    unit: string;
  };
  recognition: {
    type: string;
    title: string | null;
    approvalStatus: string;
    validUntil: string | null;
  };
}

export interface PublicAssistantSessionReference {
  type: 'session';
  id: string;
  trainingId: string;
  trainingSlug: string;
  title: string;
  href: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  city: string;
  mode: string;
  seatsRemaining: number;
  price: {
    amount: number;
    currency: string;
  };
}

export interface PublicAssistantAction {
  label: string;
  href: '/register' | '/contact';
}

export interface PublicAssistantChatResponse {
  answer: string;
  intent: PublicAssistantIntent;
  language: PublicAssistantLanguage;
  needsClarification: boolean;
  references: PublicAssistantReference[];
  actions: PublicAssistantAction[];
  suggestedQuestions: string[];
}

export interface PublicAssistantModelRequest {
  message: string;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
  references: PublicAssistantReference[];
  trainingDetails: Array<{
    id: string;
    prerequisites: string;
    targetAudience: string;
    description: string;
  }>;
}

export interface PublicAssistantModelResponse {
  answer?: string;
  intent: PublicAssistantIntent;
  language: PublicAssistantLanguage;
  needsClarification: boolean;
  referenceIds: string[];
}
