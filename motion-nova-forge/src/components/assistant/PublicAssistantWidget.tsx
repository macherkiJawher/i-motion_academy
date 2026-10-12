import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowUp,
  BookOpen,
  Bot,
  LoaderCircle,
  MessageCircle,
  RotateCcw,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useA11y } from "@/hooks/useA11y";
import { usePublicAssistant } from "@/hooks/usePublicAssistant";
import { translatePhrase } from "@/lib/i18n";
import type { PublicAssistantAction, PublicAssistantReference } from "@/types/public-assistant";

const ERROR_COPY = {
  "not-configured": "Assistant service is unavailable.",
  "invalid-request": "Check your message and try again.",
  "request-too-large": "This request is too large. Shorten it and try again.",
  "rate-limited": "Too many requests. Please wait and try again.",
  timeout: "The response took too long. Please try again.",
  cancelled: "The response was cancelled.",
  unavailable: "The assistant is temporarily unavailable. Please try again.",
  "invalid-response": "The response could not be validated. Please try again.",
} as const;

function isAllowedReference(reference: PublicAssistantReference): boolean {
  if (reference.type === "training") {
    return (
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(reference.slug) &&
      reference.href === `/trainings/${reference.slug}`
    );
  }
  return (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      reference.id,
    ) && reference.href === `/sessions/${reference.id}`
  );
}

function isAllowedAction(action: PublicAssistantAction): boolean {
  return action.href === "/register" || action.href === "/contact";
}

export function PublicAssistantWidget() {
  const { lang, reduceMotion } = useA11y();
  const { messages, isLoading, error, sendMessage, retryLastMessage, cancel } =
    usePublicAssistant();
  const prefersReducedMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const t = (phrase: string) => translatePhrase(phrase, lang);
  const shouldReduceMotion = reduceMotion || prefersReducedMotion;
  const lastAssistantMessage = [...messages]
    .reverse()
    .find((message) => message.role === "assistant");
  const canRetry =
    lastAssistantMessage?.role === "assistant" &&
    (lastAssistantMessage.status === "failed" || lastAssistantMessage.status === "cancelled");

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open || !logRef.current) return;
    logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [open, messages]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft.trim() || isLoading) return;
    const message = draft;
    setDraft("");
    void sendMessage(message);
  };

  const handleInputKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  };

  const handleSuggestion = (question: string) => {
    if (isLoading) return;
    setDraft("");
    void sendMessage(question);
  };

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.section
            id="public-assistant-panel"
            data-no-translate
            role="dialog"
            aria-modal="false"
            aria-labelledby="public-assistant-title"
            dir={lang === "ar" ? "rtl" : "ltr"}
            initial={shouldReduceMotion ? false : { opacity: 0, y: 14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
            className="glass-strong fixed bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] right-4 z-[110] flex h-[min(42rem,calc(100dvh-env(safe-area-inset-bottom)-7rem))] max-h-[calc(100dvh-env(safe-area-inset-bottom)-7rem)] w-[min(25rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-3xl border border-border/60 shadow-[var(--shadow-glow)]"
          >
            <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border/60 bg-background/60 px-4 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[image:var(--gradient-electric)] text-primary-foreground shadow-[var(--shadow-glow)]">
                  <Sparkles className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <h2 id="public-assistant-title" className="font-display text-sm font-semibold">
                    {t("i-Motion Assistant")}
                  </h2>
                  <p className="text-xs text-muted-foreground">{t("Your guide to the academy")}</p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                data-no-translate
                aria-label={t("Close assistant")}
                onClick={() => {
                  setOpen(false);
                  triggerRef.current?.focus();
                }}
              >
                <X aria-hidden="true" />
              </Button>
            </header>

            <div
              ref={logRef}
              role="log"
              aria-live="polite"
              aria-relevant="additions text"
              aria-busy={isLoading}
              className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4"
            >
              {messages.length === 0 && (
                <div className="flex h-full min-h-40 flex-col items-center justify-center text-center">
                  <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-electric/25 bg-electric/10 text-electric">
                    <Bot className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <p className="max-w-64 text-sm leading-relaxed text-muted-foreground">
                    {t("No messages yet. Ask about trainings or sessions.")}
                  </p>
                </div>
              )}

              {messages.map((message) => (
                <article
                  key={message.id}
                  className={`flex ${message.role === "user" ? "justify-start" : "justify-end"}`}
                >
                  <div
                    className={`max-w-[92%] rounded-2xl px-3.5 py-3 ${
                      message.role === "user"
                        ? "rounded-ss-md border border-electric/20 bg-electric/10"
                        : "rounded-se-md border border-border/60 bg-background/70"
                    }`}
                  >
                    <p className="mb-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      {message.role === "user" ? t("You") : t("Assistant")}
                    </p>
                    {message.status === "pending" ? (
                      <p className="flex items-center gap-2 text-sm text-muted-foreground">
                        <LoaderCircle
                          className="h-4 w-4 animate-spin text-electric motion-reduce:animate-none"
                          aria-hidden="true"
                        />
                        {t("Thinking...")}
                      </p>
                    ) : message.content ? (
                      <p
                        data-no-translate
                        className="whitespace-pre-wrap break-words text-sm leading-relaxed"
                      >
                        {message.content}
                      </p>
                    ) : null}

                    {message.role === "assistant" && message.error && (
                      <p role="status" className="text-sm leading-relaxed text-destructive">
                        {t(ERROR_COPY[message.error])}
                      </p>
                    )}
                    {message.role === "assistant" && message.status === "cancelled" && (
                      <p className="text-sm text-muted-foreground">{t(ERROR_COPY.cancelled)}</p>
                    )}
                    {message.role === "assistant" &&
                      message.response?.needsClarification &&
                      message.status === "succeeded" && (
                        <p className="mt-2 border-t border-border/50 pt-2 text-xs text-muted-foreground">
                          {t("Please add a little more detail so I can guide you.")}
                        </p>
                      )}

                    {message.role === "assistant" &&
                      message.status === "succeeded" &&
                      message.response && (
                        <div className="mt-3 space-y-3">
                          {message.response.references.some(isAllowedReference) && (
                            <div>
                              <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                                <BookOpen
                                  className="h-3.5 w-3.5 text-electric"
                                  aria-hidden="true"
                                />
                                {t("References")}
                              </p>
                              <ul className="space-y-1.5">
                                {message.response.references
                                  .filter(isAllowedReference)
                                  .map((reference) => (
                                    <li key={`${reference.type}-${reference.id}`}>
                                      <a
                                        href={reference.href}
                                        data-no-translate
                                        className="text-sm text-electric underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                      >
                                        {reference.title}
                                      </a>
                                    </li>
                                  ))}
                              </ul>
                            </div>
                          )}
                          {message.response.actions.filter(isAllowedAction).length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {message.response.actions.filter(isAllowedAction).map((action) => (
                                <Button
                                  key={`${action.href}-${action.label}`}
                                  asChild
                                  size="sm"
                                  variant="outlineGlow"
                                >
                                  <Link to={action.href} data-no-translate>
                                    {action.label}
                                  </Link>
                                </Button>
                              ))}
                            </div>
                          )}
                          {message.response.suggestedQuestions.length > 0 && (
                            <div>
                              <p className="mb-1.5 text-xs font-semibold text-muted-foreground">
                                {t("Suggested questions")}
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {message.response.suggestedQuestions.map((question) => (
                                  <button
                                    key={question}
                                    type="button"
                                    data-no-translate
                                    disabled={isLoading}
                                    onClick={() => handleSuggestion(question)}
                                    className="rounded-full border border-border/70 bg-secondary/50 px-3 py-1.5 text-start text-xs leading-relaxed transition-colors hover:border-electric/50 hover:bg-electric/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    {question}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                    {message.role === "assistant" &&
                      message.id === lastAssistantMessage?.id &&
                      (message.status === "failed" || message.status === "cancelled") && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="mt-2"
                          disabled={isLoading}
                          onClick={() => void retryLastMessage()}
                        >
                          <RotateCcw aria-hidden="true" />
                          {t("Retry")}
                        </Button>
                      )}
                  </div>
                </article>
              ))}
            </div>

            <footer className="shrink-0 border-t border-border/60 bg-background/70 p-3">
              {error && !canRetry && (
                <p role="status" className="mb-2 text-xs text-destructive">
                  {t(ERROR_COPY[error])}
                </p>
              )}
              <form onSubmit={submit} className="flex items-end gap-2">
                <label className="sr-only" htmlFor="public-assistant-message">
                  {t("Ask about trainings, sessions, or the academy...")}
                </label>
                <Textarea
                  ref={inputRef}
                  id="public-assistant-message"
                  data-no-translate
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={handleInputKeyDown}
                  placeholder={t("Ask about trainings, sessions, or the academy...")}
                  maxLength={1000}
                  rows={2}
                  disabled={isLoading}
                  className="max-h-28 min-h-11 resize-none rounded-2xl border-border/70 bg-background/80 text-sm focus-visible:ring-electric"
                />
                {isLoading ? (
                  <Button
                    type="button"
                    size="icon"
                    variant="destructive"
                    data-no-translate
                    aria-label={t("Cancel response")}
                    onClick={cancel}
                  >
                    <X aria-hidden="true" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    size="icon"
                    variant="electric"
                    data-no-translate
                    aria-label={t("Send message")}
                    disabled={!draft.trim()}
                  >
                    <ArrowUp aria-hidden="true" />
                  </Button>
                )}
              </form>
              <div className="mt-2 flex items-center justify-between gap-2 text-[0.68rem] text-muted-foreground">
                <p>{t("Conversation is not saved.")}</p>
                <span aria-hidden="true">{draft.length}/1000</span>
              </div>
            </footer>
          </motion.section>
        )}
      </AnimatePresence>

      <button
        ref={triggerRef}
        type="button"
        data-no-translate
        aria-label={t(open ? "Close assistant" : "Open AI assistant")}
        aria-expanded={open}
        aria-controls={open ? "public-assistant-panel" : undefined}
        onClick={() => setOpen((current) => !current)}
        className="glass-strong fixed bottom-[calc(env(safe-area-inset-bottom)+1.5rem)] right-6 z-[110] flex h-12 w-12 items-center justify-center rounded-full border border-electric/30 text-electric shadow-[var(--shadow-glow)] transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none"
      >
        {open ? (
          <X className="h-5 w-5" aria-hidden="true" />
        ) : (
          <MessageCircle className="h-5 w-5" aria-hidden="true" />
        )}
      </button>
    </>
  );
}
