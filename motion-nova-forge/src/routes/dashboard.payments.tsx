import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { errorMessage } from "@/api/client";
import {
  DashHeader,
  Panel,
  Table,
  Row,
  Cell,
  StatCard,
  StatusBadge,
  EmptyState,
  LoadingRows,
  formatDate,
  formatMoney,
  statusLabel,
  statusTone,
} from "@/components/dash/Primitives";
import { useAuth } from "@/hooks/useAuth";
import {
  registrationService,
  paymentService,
  certificateService,
  notificationService,
  sessionService,
  catalogService,
  userService,
  contactService,
  analyticsService,
  trainerService,
} from "@/services";

export const Route = createFileRoute("/dashboard/payments")({
  head: () => ({
    meta: [{ title: "Payments — i-Motion Academy" }, { name: "robots", content: "noindex" }],
  }),
  component: Page,
});

function Page() {
  const { user } = useAuth();
  const uid = user?.id ?? "u-1";
  const { data = [], isLoading } = useQuery({
    queryKey: ["payments", uid],
    queryFn: () => paymentService.mine(uid),
  });
  const downloadReceipt = async (paymentId: string, paymentReference: string) => {
    try {
      const file = await paymentService.downloadReceipt(paymentId);
      const objectUrl = URL.createObjectURL(file);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `recu-${paymentReference}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };
  return (
    <>
      <DashHeader title="Payments" subtitle="Every transaction linked to your registrations." />
      <Panel>
        {isLoading ? (
          <LoadingRows />
        ) : data.length === 0 ? (
          <EmptyState title="No payment recorded" />
        ) : (
          <Table
            head={["Reference", "Training", "Method", "Status", "Paid on", "Amount", "Receipt"]}
          >
            {data.map((p) => (
              <Row key={p.id}>
                <Cell className="text-muted-foreground">{p.reference}</Cell>
                <Cell>{p.trainingTitle}</Cell>
                <Cell>{statusLabel(p.method)}</Cell>
                <Cell>
                  <StatusBadge tone={statusTone(p.status)}>{statusLabel(p.status)}</StatusBadge>
                </Cell>
                <Cell>{formatDate(p.paidAt)}</Cell>
                <Cell>{formatMoney(p.amount, p.currency)}</Cell>
                <Cell>
                  {(p.status === "PAID" || p.status === "PARTIAL") && (
                    <button
                      type="button"
                      onClick={() => void downloadReceipt(p.id, p.reference)}
                      className="inline-flex items-center gap-2 rounded-lg border border-border/60 px-3 py-2 text-xs hover:bg-secondary"
                      aria-label={`Télécharger le reçu ${p.reference}`}
                    >
                      <Download className="h-4 w-4" />
                      PDF
                    </button>
                  )}
                </Cell>
              </Row>
            ))}
          </Table>
        )}
      </Panel>
    </>
  );
}
