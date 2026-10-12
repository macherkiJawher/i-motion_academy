import { api, hasApi } from "@/api/client";
import { createAdminAssistantService } from "./admin-assistant-client.js";

export { AdminAssistantServiceError } from "./admin-assistant-client.js";

const client = createAdminAssistantService({
  isConfigured: hasApi,
  post: api.post,
});

export const adminAssistantService = {
  chat: client.chat,
};
