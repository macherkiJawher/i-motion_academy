import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import React from "react";
import { FeedbackForm } from "@/components/feedback/FeedbackForm";
import { api } from "@/api/client";

interface ParticipantFeedback {
  id: string;
  rating: number;
  feedbackType: string;
  isPublished: boolean;
  createdAt: string;
}

export const Route = createFileRoute("/dashboard/feedback")({
  component: DashboardFeedback,
});

function DashboardFeedback() {
  // Fetch user's registrations with sessions
  const { data: registrations = [], isLoading } = useQuery({
    queryKey: ["user-registrations"],
    queryFn: async () => {
      const data = await api.get<unknown>("/registrations/me");
      return Array.isArray(data) ? data : [data];
    },
  });

  // Categorize registrations
  const completed = registrations.filter((r: any) => r.status === "COMPLETED");
  const pending = registrations.filter((r: any) => r.status !== "COMPLETED");

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-secondary/50 rounded w-1/3" />
          <div className="h-64 bg-secondary/50 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">My feedback</h1>
        <p className="text-muted-foreground mt-2">
          Share your feedback on your completed training programs
        </p>
      </div>

      {/* Completed Sessions with Feedback Option */}
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-semibold mb-4">
            Completed sessions ({completed.length})
          </h2>

          {completed.length === 0 ? (
            <div className="rounded-lg border border-border/50 bg-card p-8 text-center text-muted-foreground">
              No completed sessions yet
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {completed.map((registration: any) => (
                <CompletedSessionCard
                  key={registration.id}
                  registration={registration}
                />
              ))}
            </div>
          )}
        </div>

        {/* Pending/In Progress Sessions */}
        {pending.length > 0 && (
          <div>
            <h2 className="text-2xl font-semibold mb-4">
              Sessions in progress ({pending.length})
            </h2>
            <div className="grid gap-6 md:grid-cols-2">
              {pending.map((registration: any) => (
                <PendingSessionCard
                  key={registration.id}
                  registration={registration}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CompletedSessionCard({ registration }: { registration: any }) {
  const [showForm, setShowForm] = React.useState(false);
  const queryClient = useQueryClient();
  const { data: feedback } = useQuery<ParticipantFeedback | null>({
    queryKey: ["feedback", registration.id],
    queryFn: async () => {
      const data = await api.get<ParticipantFeedback | { message: string }>(
        `/feedback/${registration.id}`,
      );
      return "id" in data ? data : null;
    },
  });
  const trainingTitle =
    registration.trainingTitle ||
    registration.session?.training?.title ||
    registration.session?.training?.name ||
    "Formation";

  return (
    <div className="rounded-lg border border-border/50 bg-card p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">{trainingTitle}</h3>
        <p className="text-sm text-muted-foreground">
          {registration.session?.trainerName || "No trainer assigned"}
        </p>
      </div>

      <div className="mb-4 space-y-2 text-sm">
        <div>
          <span className="text-muted-foreground">Dates:</span>
          <span className="ml-2 font-medium">
            {new Date(registration.session?.startDate).toLocaleDateString()} -{" "}
            {new Date(registration.session?.endDate).toLocaleDateString()}
          </span>
        </div>
        <div>
          <span className="text-muted-foreground">Status:</span>
          <span className="ml-2 inline-block px-2 py-1 bg-green-500/20 text-green-700 rounded text-xs font-medium">
            ✓ Completed
          </span>
        </div>
      </div>

      {feedback ? (
        <div className="rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          <p className="font-semibold">
            Feedback {feedback.isPublished ? "published" : "submitted"}
          </p>
          <p className="mt-1">
            {feedback.isPublished
              ? "Your feedback is now visible after moderation."
              : "Your feedback is waiting for moderation."}
          </p>
          <p className="mt-2 text-xs text-green-700">
            Sent on {new Date(feedback.createdAt).toLocaleDateString()} · Rating {feedback.rating}/5
          </p>
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex-1 px-4 py-2 text-sm font-medium rounded bg-electric text-white hover:bg-electric/90 transition-colors"
          >
            💬 {showForm ? "Hide" : "Give feedback"}
          </button>
        </div>
      )}

      {showForm && (
        <div className="mt-4 pt-4 border-t border-border/50">
          <FeedbackForm
            registrationId={registration.id}
            onSubmitSuccess={() => {
              setShowForm(false);
              queryClient.invalidateQueries({ queryKey: ["feedback", registration.id] });
            }}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}
    </div>
  );
}

function PendingSessionCard({ registration }: { registration: any }) {
  const trainingTitle =
    registration.trainingTitle ||
    registration.session?.training?.title ||
    registration.session?.training?.name ||
    "Formation";

  return (
    <div className="rounded-lg border border-border/50 bg-card p-6 opacity-60">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">{trainingTitle}</h3>
        <p className="text-sm text-muted-foreground">
          {registration.session?.trainerName || "No trainer assigned"}
        </p>
      </div>

      <div className="mb-4 space-y-2 text-sm">
        <div>
          <span className="text-muted-foreground">Dates:</span>
          <span className="ml-2 font-medium">
            {new Date(registration.session?.startDate).toLocaleDateString()} -{" "}
            {new Date(registration.session?.endDate).toLocaleDateString()}
          </span>
        </div>
        <div>
          <span className="text-muted-foreground">Status:</span>
          <span className="ml-2 inline-block px-2 py-1 bg-yellow-500/20 text-yellow-700 rounded text-xs font-medium">
            ⏳ {registration.status}
          </span>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Feedback will be available after the session ends
      </p>
    </div>
  );
}

