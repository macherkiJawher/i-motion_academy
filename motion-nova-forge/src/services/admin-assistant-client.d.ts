import type {
  AdminAssistantChatHistory,
  AdminAssistantChatResponse,
  AdminAssistantLanguage,
} from "../lib/admin-assistant-contract.js";

export declare class AdminAssistantServiceError extends Error {
  constructor(message: string);
}

export declare function createAdminAssistantService(input: {
  isConfigured: boolean;
  post: (
    path: string,
    body: {
      message: string;
      language: AdminAssistantLanguage;
      history: AdminAssistantChatHistory;
    },
  ) => Promise<unknown>;
}): {
  chat(
    message: string,
    language?: AdminAssistantLanguage,
    history?: AdminAssistantChatHistory,
  ): Promise<AdminAssistantChatResponse>;
};
