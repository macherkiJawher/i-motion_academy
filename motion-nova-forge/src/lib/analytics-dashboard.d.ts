import type { AdminAnalytics } from "@/types/domain";

export function resolveAnalyticsState(
  query: { isLoading: boolean; isError: boolean },
  data: AdminAnalytics | undefined,
): "loading" | "error" | "ready" | "empty";
