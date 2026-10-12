export const PUBLIC_ASSISTANT_INTENTS = [
  "GENERAL_INFO",
  "TRAINING_SEARCH",
  "TRAINING_COMPARISON",
  "SESSION_SEARCH",
  "REGISTRATION_GUIDANCE",
  "OUT_OF_SCOPE",
  "CLARIFICATION",
] as const;

export type PublicAssistantIntent = (typeof PUBLIC_ASSISTANT_INTENTS)[number];
export type PublicAssistantLanguage = "fr" | "en" | "ar";

export interface PublicAssistantHistoryMessage {
  role: "user" | "assistant";
  content: string;
}

export interface PublicAssistantChatRequest {
  message: string;
  history?: PublicAssistantHistoryMessage[];
}

export interface PublicAssistantPrice {
  amount: number;
  currency: string;
}

export interface PublicAssistantTrainingReference {
  type: "training";
  id: string;
  slug: string;
  title: string;
  href: string;
  price: PublicAssistantPrice;
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
  type: "session";
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
  price: PublicAssistantPrice;
}

export type PublicAssistantReference =
  PublicAssistantTrainingReference | PublicAssistantSessionReference;

export interface PublicAssistantAction {
  label: string;
  href: "/register" | "/contact";
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
