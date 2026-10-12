import {
  adminAssistantErrorMessage,
  isAdminAssistantChatRequest,
  isAdminAssistantChatResponse,
} from "../lib/admin-assistant-contract.js";

const INVALID_RESPONSE_MESSAGE =
  "La réponse du copilote est incomplète ou invalide. Réessayez dans quelques instants.";

export class AdminAssistantServiceError extends Error {
  constructor(message) {
    super(message);
    this.name = "AdminAssistantServiceError";
  }
}

function errorStatus(error) {
  return typeof error?.status === "number" ? error.status : undefined;
}

export function createAdminAssistantService({ isConfigured, post }) {
  return {
    async chat(message, language = "fr", history = []) {
      const request = { message, language, history };
      if (!isAdminAssistantChatRequest(request)) {
        throw new AdminAssistantServiceError(adminAssistantErrorMessage(400));
      }
      if (!isConfigured) {
        throw new AdminAssistantServiceError(adminAssistantErrorMessage(503));
      }

      let response;
      try {
        response = await post("/admin/assistant/chat", request);
      } catch (error) {
        if (error instanceof AdminAssistantServiceError) throw error;
        const status = errorStatus(error);
        const safeStatus =
          status === undefined ? (error instanceof TypeError ? null : 500) : status;
        throw new AdminAssistantServiceError(adminAssistantErrorMessage(safeStatus));
      }

      if (!isAdminAssistantChatResponse(response)) {
        throw new AdminAssistantServiceError(INVALID_RESPONSE_MESSAGE);
      }
      return response;
    },
  };
}
