import { useRef, useState, type FormEvent } from "react";
import { Bot, LoaderCircle, RotateCcw, Send, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import { Panel } from "@/components/dash/Primitives";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import {
  adminAssistantLanguageDirection,
  adminAssistantViewState,
  buildAdminAssistantHistory,
} from "@/lib/admin-assistant-contract.js";
import type {
  AdminAssistantChatHistoryMessage,
  AdminAssistantChatResponse,
  AdminAssistantLanguage,
} from "@/lib/admin-assistant-contract.js";
import { AdminAssistantServiceError, adminAssistantService } from "@/services/admin-assistant";

const LANGUAGES: { value: AdminAssistantLanguage; label: string }[] = [
  { value: "fr", label: "Français" },
  { value: "ar", label: "العربية" },
  { value: "ar-TN", label: "العربية (تونس)" },
  { value: "aeb-Latn", label: "Tounsi (latin)" },
];

const SUGGESTIONS = [
  "Quelles formations sont les plus populaires ?",
  "Quelles sessions risquent de ne pas être remplies ?",
  "Quelles inscriptions nécessitent une attention particulière ?",
  "Quels points devrais-je surveiller cette semaine ?",
];

const LANGUAGE_PLACEHOLDERS: Record<AdminAssistantLanguage, string> = {
  fr: "Posez votre question en français…",
  ar: "اكتب سؤالك بالعربية…",
  "ar-TN": "اكتب سؤالك بالعربية التونسية…",
  "aeb-Latn": "Es2el bel tounsi bel 7rouf latines…",
};

interface ConversationMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
  language: AdminAssistantLanguage;
  response?: AdminAssistantChatResponse;
}

function AnswerText({ answer, language }: { answer: string; language: AdminAssistantLanguage }) {
  const blocks = answer
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);
  const direction = adminAssistantLanguageDirection(language);

  return (
    <div dir={direction} className="space-y-3 text-sm leading-relaxed">
      {blocks.map((block, index) => {
        const lines = block
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean);
        if (lines.every((line) => /^[-*•]\s+/.test(line))) {
          return (
            <ul key={index} className="list-disc space-y-1 pl-5">
              {lines.map((line, lineIndex) => (
                <li key={lineIndex}>{line.replace(/^[-*•]\s+/, "")}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={index} className="whitespace-pre-wrap">
            {block}
          </p>
        );
      })}
    </div>
  );
}

function periodDescription(response: AdminAssistantChatResponse) {
  const labels = {
    current_snapshot: "Instantané actuel",
    date_range: "Période datée",
    mixed: "Période mixte",
    not_requested: "Aucune période demandée",
  } as const;
  const { startDate, endDate } = response.period;
  if (startDate && endDate) return `${labels[response.period.type]} · ${startDate} – ${endDate}`;
  if (startDate) return `${labels[response.period.type]} · depuis le ${startDate}`;
  if (endDate) return `${labels[response.period.type]} · jusqu’au ${endDate}`;
  return labels[response.period.type];
}

function ResponseDetails({ response }: { response: AdminAssistantChatResponse }) {
  const direction = adminAssistantLanguageDirection(response.language);

  return (
    <div dir={direction} className="mt-4 space-y-3 border-t border-border/50 pt-3 text-xs">
      <section aria-label="Sources des données">
        <h4 className="font-semibold text-muted-foreground">Sources des données</h4>
        {response.dataSources.length ? (
          <ul className="mt-1 flex flex-wrap gap-1.5">
            {response.dataSources.map((source, index) => (
              <li
                key={`${source}-${index}`}
                className="rounded-full bg-secondary/70 px-2 py-0.5 text-muted-foreground"
              >
                {source}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-muted-foreground">Aucune source précisée.</p>
        )}
      </section>

      <section aria-label="Période analysée">
        <h4 className="font-semibold text-muted-foreground">Période analysée</h4>
        <p className="mt-1 text-foreground">{periodDescription(response)}</p>
      </section>

      {response.missingData.length > 0 && (
        <section aria-label="Données manquantes">
          <h4 className="font-semibold text-amber-300">Données non disponibles</h4>
          <ul className="mt-1 list-inside list-disc space-y-1 text-amber-200">
            {response.missingData.map((item, index) => (
              <li key={`${item}-${index}`}>{item}</li>
            ))}
          </ul>
        </section>
      )}

      {response.recommendations.length > 0 && (
        <section aria-label="Recommandations">
          <h4 className="font-semibold text-muted-foreground">Pistes de vigilance</h4>
          <ul className="mt-2 grid gap-2 sm:grid-cols-2">
            {response.recommendations.map((recommendation, index) => (
              <li
                key={`${recommendation.title}-${index}`}
                className="rounded-lg border border-border/50 bg-background/50 p-3"
              >
                <h5 className="font-semibold text-foreground">{recommendation.title}</h5>
                <dl className="mt-2 space-y-2 text-muted-foreground">
                  <div>
                    <dt className="font-semibold text-foreground">Constat observé</dt>
                    <dd className="mt-0.5 whitespace-pre-wrap">{recommendation.observedFinding}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-foreground">Éléments mesurés</dt>
                    <dd className="mt-0.5 whitespace-pre-wrap">
                      {recommendation.measuredEvidence}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-foreground">
                      Suggestion (à distinguer du constat)
                    </dt>
                    <dd className="mt-0.5 whitespace-pre-wrap">{recommendation.proposedAction}</dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

export function AdminAssistantWidget() {
  const { role } = useAuth();
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [language, setLanguage] = useState<AdminAssistantLanguage>("fr");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryMessageId, setRetryMessageId] = useState<number | null>(null);
  const pendingRef = useRef(false);
  const nextMessageId = useRef(0);
  const historyRef = useRef<AdminAssistantChatHistoryMessage[]>([]);
  const viewState = adminAssistantViewState({
    messageCount: messages.length,
    pending,
    error,
  });

  if (role !== "ADMIN") return null;

  async function submitMessage(message: string, retryId?: number) {
    const normalized = message.trim();
    if (!normalized || pendingRef.current || normalized.length > 2000) return;
    const retryEntry =
      retryId === undefined ? undefined : messages.find((item) => item.id === retryId);
    if (retryId !== undefined && (!retryEntry || retryEntry.role !== "user")) return;
    const requestLanguage = retryEntry?.language ?? language;
    const submittedMessageId = retryEntry?.id ?? nextMessageId.current++;

    pendingRef.current = true;
    setPending(true);
    setError(null);
    if (retryId === undefined) {
      setRetryMessageId(null);
      setDraft("");
      setMessages((current) => [
        ...current,
        {
          id: submittedMessageId,
          role: "user",
          content: normalized,
          language: requestLanguage,
        },
      ]);
    }

    try {
      const response = await adminAssistantService.chat(
        normalized,
        requestLanguage,
        buildAdminAssistantHistory(historyRef.current),
      );
      historyRef.current = [
        ...historyRef.current,
        { role: "user", content: normalized },
        { role: "assistant", content: response.answer },
      ];
      historyRef.current = buildAdminAssistantHistory(historyRef.current);
      setMessages((current) => [
        ...current,
        {
          id: nextMessageId.current++,
          role: "assistant",
          content: response.answer,
          language: response.language,
          response,
        },
      ]);
      setRetryMessageId(null);
    } catch (requestError) {
      setError(
        requestError instanceof AdminAssistantServiceError
          ? requestError.message
          : "Une erreur est survenue. Réessayez dans quelques instants.",
      );
      setRetryMessageId(submittedMessageId);
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitMessage(draft);
  }

  return (
    <Panel
      className="mb-6 overflow-hidden border border-electric/20 bg-gradient-to-br from-electric/[0.06] via-background/20 to-violet/[0.05]"
      title="Copilote IA Administrateur"
      description="Interrogez les indicateurs agrégés de l’Académie et obtenez des pistes de vigilance. Le copilote est en lecture seule."
      actions={
        <span className="inline-flex items-center gap-1.5 rounded-full border border-electric/30 bg-electric/10 px-3 py-1.5 text-xs text-electric">
          <ShieldCheck className="h-3.5 w-3.5" />
          Réservé aux administrateurs
        </span>
      }
    >
      <div className="rounded-2xl border border-border/50 bg-background/35">
        <div
          role="log"
          aria-label="Conversation avec le copilote administrateur"
          aria-live="polite"
          aria-relevant="additions"
          aria-atomic="false"
          className="max-h-[32rem] min-h-40 space-y-4 overflow-y-auto p-4 sm:p-5"
        >
          {viewState === "initial" && (
            <div className="flex min-h-32 flex-col items-center justify-center text-center">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-electric/10 text-electric">
                <Sparkles className="h-5 w-5" />
              </span>
              <p className="mt-3 text-sm font-medium">Que souhaitez-vous analyser ?</p>
              <p className="mt-1 max-w-lg text-xs text-muted-foreground">
                Les réponses s’appuient sur le contexte métier disponible. Les données absentes sont
                signalées.
              </p>
            </div>
          )}

          {messages.map((message) => (
            <article
              key={message.id}
              className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {message.role === "assistant" && (
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-electric/10 text-electric">
                  <Bot className="h-4 w-4" />
                </span>
              )}
              <div
                dir={adminAssistantLanguageDirection(message.language)}
                className={`max-w-[88%] rounded-2xl px-4 py-3 ${
                  message.role === "user"
                    ? "bg-electric/15 text-foreground"
                    : "border border-border/50 bg-card/70 text-foreground"
                }`}
              >
                {message.role === "assistant" ? (
                  <AnswerText answer={message.content} language={message.language} />
                ) : (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
                )}
                {message.response && <ResponseDetails response={message.response} />}
              </div>
              {message.role === "user" && (
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-secondary text-muted-foreground">
                  <UserRound className="h-4 w-4" />
                </span>
              )}
            </article>
          ))}

          {viewState === "loading" && (
            <div className="flex items-center gap-3 text-sm text-muted-foreground" role="status">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-electric/10 text-electric">
                <LoaderCircle className="h-4 w-4 animate-spin" />
              </span>
              Analyse des indicateurs en cours…
            </div>
          )}

          {viewState === "error" && error && (
            <div
              className="ml-11 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3"
              role="alert"
            >
              <p className="text-sm text-destructive">{error}</p>
              {retryMessageId !== null && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={pending}
                  onClick={() => {
                    const failedMessage = messages.find((item) => item.id === retryMessageId);
                    if (failedMessage?.role === "user") {
                      void submitMessage(failedMessage.content, failedMessage.id);
                    }
                  }}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Réessayer
                </Button>
              )}
            </div>
          )}
        </div>

        {messages.length === 0 && (
          <div className="flex flex-wrap gap-2 border-t border-border/40 px-4 py-3 sm:px-5">
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                disabled={pending}
                onClick={() => void submitMessage(suggestion)}
                className="rounded-full border border-border/60 px-3 py-1.5 text-left text-xs text-muted-foreground transition hover:border-electric/40 hover:bg-electric/5 hover:text-foreground disabled:opacity-50"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="grid gap-3 border-t border-border/40 p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:p-4"
        >
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
            <label
              htmlFor="admin-assistant-language"
              className="text-xs font-medium text-muted-foreground"
            >
              Langue de réponse
            </label>
            <select
              id="admin-assistant-language"
              value={language}
              onChange={(event) => setLanguage(event.target.value as AdminAssistantLanguage)}
              disabled={pending}
              className="min-h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground"
            >
              {LANGUAGES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex min-w-0 items-end gap-3 sm:col-span-2">
            <label className="sr-only" htmlFor="admin-assistant-message">
              Votre question au copilote
            </label>
            <Textarea
              id="admin-assistant-message"
              dir={adminAssistantLanguageDirection(language)}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={LANGUAGE_PLACEHOLDERS[language]}
              maxLength={2000}
              rows={2}
              disabled={pending || (error !== null && retryMessageId !== null)}
              aria-describedby="admin-assistant-message-count"
              className="min-h-12 resize-y rounded-2xl bg-background/50 text-sm"
            />
            <span id="admin-assistant-message-count" className="sr-only">
              {draft.length} sur 2000 caractères
            </span>
            <Button
              type="submit"
              variant="electric"
              size="icon"
              aria-label="Envoyer la question"
              disabled={
                pending ||
                (error !== null && retryMessageId !== null) ||
                draft.trim().length === 0 ||
                draft.length > 2000
              }
            >
              {pending ? <LoaderCircle className="animate-spin" /> : <Send />}
            </Button>
          </div>
        </form>
      </div>
      <p className="mt-3 text-[0.7rem] text-muted-foreground">
        Les suggestions sont informatives. Aucune action administrative ou modification de données
        n’est exécutée.
      </p>
    </Panel>
  );
}
