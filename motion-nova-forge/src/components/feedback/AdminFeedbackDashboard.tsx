import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";

interface FeedbackQueueItemData {
  id: string;
  rating: number;
  comment: string;
  feedbackType: string;
  isPublished: boolean;
  isFeatured: boolean;
  containsBadWords: boolean;
  flaggedReason: string | null;
  userName: string;
  trainingName: string;
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface FeedbackQueueResponse {
  data: FeedbackQueueItemData[];
  pagination: Pagination;
}

interface FeedbackStats {
  totalFeedbacks: number;
  publishedFeedbacks: number;
  featuredFeedbacks: number;
  flaggedFeedbacks: number;
  averageRating: number;
  pendingApproval: number;
  ratingBreakdown: Record<number, number>;
}

type FeedbackStatusFilter = "ALL" | "PENDING" | "PUBLISHED";

export function AdminFeedbackDashboard() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({
    status: "ALL" as FeedbackStatusFilter,
    page: 1,
    limit: 10,
  });

  // Fetch all feedback so admins can review and change every status.
  const { data: feedbackData, isLoading: loadingFeedback } = useQuery<FeedbackQueueResponse>({
    queryKey: ["feedback-list", filters],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: filters.page.toString(),
        limit: filters.limit.toString(),
      });
      if (filters.status !== "ALL") {
        params.set("isPublished", String(filters.status === "PUBLISHED"));
      }
      return api.get<FeedbackQueueResponse>(`/admin/feedback?${params}`);
    },
  });

  // Fetch dashboard stats
  const { data: statsData } = useQuery<FeedbackStats>({
    queryKey: ["feedback-stats"],
    queryFn: async () => {
      return api.get<FeedbackStats>("/admin/feedback/stats/dashboard");
    },
  });

  // Publish feedback mutation
  const publishFeedback = useMutation({
    mutationFn: async (feedbackId: string) => {
      return api.patch(`/admin/feedback/${feedbackId}/publish`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feedback-list"] });
      queryClient.invalidateQueries({ queryKey: ["feedback-stats"] });
    },
  });

  // Feature status is independent from approval status.
  const featureFeedback = useMutation({
    mutationFn: async (feedbackId: string) => {
      return api.patch(`/admin/feedback/${feedbackId}/star`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feedback-list"] });
      queryClient.invalidateQueries({ queryKey: ["feedback-stats"] });
    },
  });

  // Reject feedback mutation
  const rejectFeedback = useMutation({
    mutationFn: async (feedbackId: string) => {
      return api.delete(`/admin/feedback/${feedbackId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feedback-list"] });
      queryClient.invalidateQueries({ queryKey: ["feedback-stats"] });
    },
  });

  return (
    <div className="space-y-6">
      {/* Dashboard Stats */}
      <div className="grid gap-4 md:grid-cols-5">
        <StatsCard
          label="Total Feedbacks"
          value={statsData?.totalFeedbacks || 0}
          subtext={`${statsData?.publishedFeedbacks || 0} approuvés`}
        />
        <StatsCard
          label="Featured"
          value={statsData?.featuredFeedbacks || 0}
          subtext="Pour la home"
        />
        <StatsCard
          label="Moyenne"
          value={statsData?.averageRating?.toFixed(1) || "0"}
          subtext="⭐ Évaluation"
        />
        <StatsCard label="Flaggés" value={statsData?.flaggedFeedbacks || 0} subtext="Bad words" />
        <StatsCard
          label="En attente"
          value={statsData?.pendingApproval || 0}
          subtext="À modérer"
          highlight={true}
        />
      </div>

      {/* Rating Breakdown */}
      {statsData?.ratingBreakdown && (
        <div className="rounded-lg border border-border/50 bg-card p-6">
          <h3 className="mb-4 font-semibold">Distribution des notes</h3>
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map((rating) => (
              <div key={rating} className="flex items-center gap-2">
                <span className="w-8 text-sm font-medium">{rating}⭐</span>
                <div className="flex-1 h-6 bg-secondary/50 rounded">
                  <div
                    className="h-full bg-electric rounded transition-all"
                    style={{
                      width: `${
                        ((statsData.ratingBreakdown[rating] || 0) /
                          Math.max(...Object.values(statsData.ratingBreakdown))) *
                        100
                      }%`,
                    }}
                  />
                </div>
                <span className="w-12 text-right text-sm text-muted-foreground">
                  {statsData.ratingBreakdown[rating] || 0}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Complete feedback list */}
      <div className="rounded-lg border border-border/50 bg-card">
        <div className="border-b border-border/50 p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold">
                Tous les feedbacks ({feedbackData?.pagination?.total || 0})
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Consultez et modifiez le statut de chaque feedback.
              </p>
            </div>
            <select
              value={filters.status}
              onChange={(event) =>
                setFilters({
                  ...filters,
                  status: event.target.value as FeedbackStatusFilter,
                  page: 1,
                })
              }
              className="rounded-md border border-border/50 bg-background px-3 py-2 text-sm"
              aria-label="Filtrer les feedbacks par statut"
            >
              <option value="ALL">Tous les statuts</option>
              <option value="PENDING">En attente</option>
              <option value="PUBLISHED">Approuvés</option>
            </select>
          </div>
        </div>

        {loadingFeedback ? (
          <div className="p-6 text-center text-muted-foreground">Chargement...</div>
        ) : !feedbackData?.data?.length ? (
          <div className="p-6 text-center text-muted-foreground">
            Aucun feedback dans ce filtre.
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {feedbackData.data.map((feedback) => (
              <FeedbackQueueItem
                key={feedback.id}
                feedback={feedback}
                onPublish={() => publishFeedback.mutate(feedback.id)}
                onFeature={() => featureFeedback.mutate(feedback.id)}
                onReject={() => rejectFeedback.mutate(feedback.id)}
                isLoading={
                  publishFeedback.isPending || featureFeedback.isPending || rejectFeedback.isPending
                }
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {feedbackData?.pagination?.totalPages && feedbackData.pagination.totalPages > 1 && (
          <div className="border-t border-border/50 p-4 flex justify-between items-center">
            <button
              onClick={() => setFilters({ ...filters, page: Math.max(1, filters.page - 1) })}
              disabled={filters.page === 1}
              className="px-3 py-1 text-sm rounded border border-border/50 disabled:opacity-50 hover:bg-secondary transition-colors"
            >
              ← Précédent
            </button>
            <span className="text-sm text-muted-foreground">
              Page {filters.page} sur {feedbackData.pagination.totalPages}
            </span>
            <button
              onClick={() =>
                setFilters({
                  ...filters,
                  page: Math.min(feedbackData.pagination.totalPages, filters.page + 1),
                })
              }
              disabled={filters.page === feedbackData.pagination.totalPages}
              className="px-3 py-1 text-sm rounded border border-border/50 disabled:opacity-50 hover:bg-secondary transition-colors"
            >
              Suivant →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function StatsCard({ label, value, subtext, highlight }: any) {
  return (
    <div
      className={`rounded-lg border p-4 ${
        highlight ? "border-red-500/50 bg-red-50/50 dark:bg-red-950/20" : "border-border/50 bg-card"
      }`}
    >
      <div className="text-3xl font-bold">{value}</div>
      <div className="text-xs font-medium text-muted-foreground mt-1">{label}</div>
      <div className="text-xs text-muted-foreground">{subtext}</div>
    </div>
  );
}

function FeedbackQueueItem({
  feedback,
  onPublish,
  onFeature,
  onReject,
  isLoading,
}: {
  feedback: FeedbackQueueItemData;
  onPublish: () => void;
  onFeature: () => void;
  onReject: () => void;
  isLoading: boolean;
}) {
  return (
    <div className="p-6 hover:bg-secondary/20 transition-colors">
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex gap-1">
              {[...Array(feedback.rating)].map((_, i) => (
                <span key={i}>⭐</span>
              ))}
            </div>
            <span className="text-xs font-medium bg-secondary/50 px-2 py-1 rounded">
              {feedback.feedbackType}
            </span>
            {feedback.containsBadWords && (
              <span className="text-xs font-medium bg-red-500/20 text-red-700 px-2 py-1 rounded">
                ⚠️ Bad words
              </span>
            )}
          </div>

          <p className="text-sm font-semibold">{feedback.trainingName}</p>
          <p className="text-sm text-muted-foreground">Par {feedback.userName}</p>

          {feedback.comment && (
            <p className="text-sm mt-2 italic text-foreground/70">
              "{feedback.comment.substring(0, 150)}
              {feedback.comment.length > 150 ? "..." : ""}"
            </p>
          )}

          {feedback.flaggedReason && (
            <p className="text-xs text-red-600 mt-2">Raison: {feedback.flaggedReason}</p>
          )}

          <p className="text-xs text-muted-foreground mt-2">
            {new Date(feedback.createdAt).toLocaleDateString()}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onPublish}
            disabled={isLoading}
            className="px-3 py-1 text-xs font-medium rounded bg-green-500/20 text-green-700 hover:bg-green-500/30 disabled:opacity-50 transition-colors"
          >
            {feedback.isPublished ? "↺ Retirer l’approbation" : "✓ Approuver"}
          </button>
          <button
            onClick={onFeature}
            disabled={isLoading || !feedback.isPublished}
            className="px-3 py-1 text-xs font-medium rounded bg-yellow-500/20 text-yellow-700 hover:bg-yellow-500/30 disabled:opacity-50 transition-colors"
            title="Approuver et ajouter à la page d'accueil"
          >
            {feedback.isFeatured ? "☆ Retirer de l’accueil" : "★ Mettre en avant"}
          </button>
          <button
            onClick={onReject}
            disabled={isLoading}
            className="px-3 py-1 text-xs font-medium rounded bg-red-500/20 text-red-700 hover:bg-red-500/30 disabled:opacity-50 transition-colors"
          >
            ✕ Rejeter
          </button>
        </div>
      </div>
    </div>
  );
}
