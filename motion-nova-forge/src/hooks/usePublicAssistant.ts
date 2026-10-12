import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { PublicAssistantConversation } from "@/lib/public-assistant-conversation";
import { publicAssistantService } from "@/services/public-assistant";

export function usePublicAssistant() {
  const [conversation] = useState(
    () =>
      new PublicAssistantConversation((request, options) =>
        publicAssistantService.chat(request, options),
      ),
  );
  const snapshot = useSyncExternalStore(
    conversation.subscribe,
    conversation.getSnapshot,
    conversation.getSnapshot,
  );

  useEffect(() => () => conversation.cancel(), [conversation]);

  const sendMessage = useCallback(
    (message: string) => conversation.sendMessage(message),
    [conversation],
  );
  const retryLastMessage = useCallback(() => conversation.retryLastMessage(), [conversation]);
  const cancel = useCallback(() => conversation.cancel(), [conversation]);

  return { ...snapshot, sendMessage, retryLastMessage, cancel };
}
