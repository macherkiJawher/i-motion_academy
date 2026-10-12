export type AdminAssistantLanguage = "fr" | "ar" | "ar-TN" | "aeb-Latn";

export interface AdminAssistantChatHistoryMessage {
  role: "user" | "assistant";
  content: string;
}

export type AdminAssistantChatHistory = AdminAssistantChatHistoryMessage[];

export interface AdminAssistantChatResponse {
  answer: string;
  language: AdminAssistantLanguage;
  dataSources: string[];
  period: {
    type: "current_snapshot" | "date_range" | "mixed" | "not_requested";
    startDate: string | null;
    endDate: string | null;
  };
  missingData: string[];
  recommendations: AdminAssistantRecommendation[];
}

export interface AdminAssistantRecommendation {
  title: string;
  observedFinding: string;
  measuredEvidence: string;
  proposedAction: string;
}

export declare function isAdminAssistantLanguage(value: unknown): value is AdminAssistantLanguage;

export declare function isAdminAssistantHistory(value: unknown): value is AdminAssistantChatHistory;

export declare function isAdminAssistantChatRequest(value: unknown): value is {
  message: string;
  language?: AdminAssistantLanguage;
  history?: AdminAssistantChatHistory;
};

export declare function isAdminAssistantChatResponse(
  value: unknown,
): value is AdminAssistantChatResponse;

export declare function buildAdminAssistantHistory(
  messages: AdminAssistantChatHistory,
): AdminAssistantChatHistory;

export declare function adminAssistantLanguageDirection(
  language: AdminAssistantLanguage,
): "ltr" | "rtl";

export declare function adminAssistantErrorMessage(status: number | null): string;

export declare function adminAssistantViewState(input: {
  messageCount: number;
  pending: boolean;
  error: string | null;
}): "initial" | "loading" | "success" | "error";
