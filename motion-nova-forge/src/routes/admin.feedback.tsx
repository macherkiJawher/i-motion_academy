import { createFileRoute } from "@tanstack/react-router";
import { AdminFeedbackDashboard } from "@/components/feedback/AdminFeedbackDashboard";

export const Route = createFileRoute("/admin/feedback")({
  component: AdminFeedback,
});

function AdminFeedback() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Gestion des Feedbacks</h1>
        <p className="text-muted-foreground mt-2">
          Modérez et approuvez les retours des participants
        </p>
      </div>

      <AdminFeedbackDashboard />
    </div>
  );
}
