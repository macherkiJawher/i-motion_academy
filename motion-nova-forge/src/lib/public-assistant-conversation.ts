import {
  PublicAssistantError,
  type PublicAssistantErrorCode,
  type PublicAssistantCallOptions,
} from "@/services/public-assistant";
import type {
  PublicAssistantChatRequest,
  PublicAssistantChatResponse,
  PublicAssistantHistoryMessage,
} from "@/types/public-assistant";

export type PublicAssistantMessageStatus =
  "submitted" | "pending" | "succeeded" | "failed" | "cancelled";

export interface PublicAssistantUserMessage {
  id: string;
  role: "user";
  content: string;
  status: "submitted";
}

export interface PublicAssistantAssistantMessage {
  id: string;
  role: "assistant";
  content: string;
  status: Exclude<PublicAssistantMessageStatus, "submitted">;
  response?: PublicAssistantChatResponse;
  error?: PublicAssistantErrorCode;
}

export type PublicAssistantMessage = PublicAssistantUserMessage | PublicAssistantAssistantMessage;

export interface PublicAssistantConversationSnapshot {
  messages: PublicAssistantMessage[];
  isLoading: boolean;
  error: PublicAssistantErrorCode | null;
}

export type PublicAssistantChat = (
  request: PublicAssistantChatRequest,
  options?: PublicAssistantCallOptions,
) => Promise<PublicAssistantChatResponse>;

function isEligibleHistoryContent(content: string): boolean {
  const normalized = content.trim();
  return normalized.length > 0 && normalized.length <= 800;
}

export function buildPublicAssistantHistory(
  messages: PublicAssistantMessage[],
): PublicAssistantHistoryMessage[] {
  const exchanges: PublicAssistantHistoryMessage[][] = [];
  for (let index = 0; index < messages.length - 1; index += 1) {
    const user = messages[index];
    const assistant = messages[index + 1];
    if (
      user?.role === "user" &&
      assistant?.role === "assistant" &&
      assistant.status === "succeeded" &&
      isEligibleHistoryContent(user.content) &&
      isEligibleHistoryContent(assistant.content)
    ) {
      exchanges.push([
        { role: "user", content: user.content.trim() },
        { role: "assistant", content: assistant.content.trim() },
      ]);
      index += 1;
    }
  }

  const selected: PublicAssistantHistoryMessage[][] = [];
  let totalLength = 0;
  let messageCount = 0;
  for (let index = exchanges.length - 1; index >= 0; index -= 1) {
    const exchange = exchanges[index]!;
    const exchangeLength = exchange.reduce((total, message) => total + message.content.length, 0);
    if (messageCount + exchange.length > 6 || totalLength + exchangeLength > 2400) continue;
    selected.unshift(exchange);
    messageCount += exchange.length;
    totalLength += exchangeLength;
  }

  return selected.flat();
}

interface ActiveRequest {
  id: number;
  controller: AbortController;
  assistantMessageId: string;
}

export class PublicAssistantConversation {
  private snapshot: PublicAssistantConversationSnapshot = {
    messages: [],
    isLoading: false,
    error: null,
  };
  private readonly listeners = new Set<() => void>();
  private activeRequest: ActiveRequest | null = null;
  private requestSequence = 0;
  private messageSequence = 0;

  constructor(private readonly chat: PublicAssistantChat) {}

  readonly getSnapshot = (): PublicAssistantConversationSnapshot => this.snapshot;

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  readonly sendMessage = async (input: string): Promise<void> => {
    if (this.activeRequest) return;
    const message = input.trim();
    if (!message) return;
    if (message.length > 1000) {
      this.publish({ error: "invalid-request" });
      return;
    }

    const userMessage: PublicAssistantUserMessage = {
      id: this.nextMessageId(),
      role: "user",
      content: message,
      status: "submitted",
    };
    const history = buildPublicAssistantHistory(this.snapshot.messages);
    this.publish({
      messages: [...this.snapshot.messages, userMessage],
      error: null,
    });
    await this.requestAnswer(userMessage, history);
  };

  readonly retryLastMessage = async (): Promise<void> => {
    if (this.activeRequest) return;
    const messages = this.snapshot.messages;
    let userIndex = -1;
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      if (messages[index]?.role === "user") {
        userIndex = index;
        break;
      }
    }
    const userMessage = messages[userIndex];
    const assistantMessage = messages[userIndex + 1];
    if (
      userMessage?.role !== "user" ||
      assistantMessage?.role !== "assistant" ||
      (assistantMessage.status !== "failed" && assistantMessage.status !== "cancelled")
    ) {
      return;
    }

    const history = buildPublicAssistantHistory(messages.slice(0, userIndex));
    this.publish({
      messages: messages.filter((message) => message.id !== assistantMessage.id),
      error: null,
    });
    await this.requestAnswer(userMessage, history);
  };

  readonly cancel = (): void => {
    const active = this.activeRequest;
    if (!active) return;
    this.activeRequest = null;
    this.requestSequence += 1;
    active.controller.abort();
    this.publish({
      messages: this.snapshot.messages.map((message) =>
        message.id === active.assistantMessageId && message.role === "assistant"
          ? { ...message, status: "cancelled" }
          : message,
      ),
      isLoading: false,
      error: null,
    });
  };

  private async requestAnswer(
    userMessage: PublicAssistantUserMessage,
    history: PublicAssistantHistoryMessage[],
  ): Promise<void> {
    const requestId = ++this.requestSequence;
    const controller = new AbortController();
    const assistantMessageId = this.nextMessageId();
    this.activeRequest = { id: requestId, controller, assistantMessageId };
    this.publish({
      messages: [
        ...this.snapshot.messages,
        {
          id: assistantMessageId,
          role: "assistant",
          content: "",
          status: "pending",
        },
      ],
      isLoading: true,
      error: null,
    });

    try {
      const response = await this.chat(
        { message: userMessage.content, ...(history.length > 0 ? { history } : {}) },
        { signal: controller.signal },
      );
      if (!this.isCurrentRequest(requestId)) return;
      if (!response.answer.trim()) throw new PublicAssistantError("invalid-response");
      this.publish({
        messages: this.snapshot.messages.map((message) =>
          message.id === assistantMessageId && message.role === "assistant"
            ? { ...message, content: response.answer, status: "succeeded", response }
            : message,
        ),
        isLoading: false,
        error: null,
      });
    } catch (error) {
      if (!this.isCurrentRequest(requestId)) return;
      const code = error instanceof PublicAssistantError ? error.code : "unavailable";
      const cancelled = code === "cancelled";
      this.publish({
        messages: this.snapshot.messages.map((message) =>
          message.id === assistantMessageId && message.role === "assistant"
            ? {
                ...message,
                status: cancelled ? "cancelled" : "failed",
                ...(!cancelled ? { error: code } : {}),
              }
            : message,
        ),
        isLoading: false,
        error: cancelled ? null : code,
      });
    } finally {
      if (this.activeRequest?.id === requestId) this.activeRequest = null;
    }
  }

  private isCurrentRequest(requestId: number): boolean {
    return this.activeRequest?.id === requestId;
  }

  private nextMessageId(): string {
    this.messageSequence += 1;
    return `public-assistant-${this.messageSequence}`;
  }

  private publish(patch: Partial<PublicAssistantConversationSnapshot>): void {
    this.snapshot = { ...this.snapshot, ...patch };
    this.listeners.forEach((listener) => listener());
  }
}
