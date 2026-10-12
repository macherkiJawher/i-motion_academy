import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DashHeader, Panel, Table, Row, Cell, StatCard, StatusBadge, EmptyState, LoadingRows, formatDate, formatMoney, statusLabel, statusTone } from "@/components/dash/Primitives";
import { useAuth } from "@/hooks/useAuth";
import { registrationService, paymentService, certificateService, notificationService, sessionService, catalogService, userService, contactService, analyticsService, trainerService } from "@/services";

export const Route = createFileRoute("/dashboard/certificates")({
  head: () => ({ meta: [{ title: "Certificates — i-Motion Academy" }, { name: "robots", content: "noindex" }] }),
  component: Page,
});

function Page() {
  const { user } = useAuth();
  const uid = user?.id ?? "u-1";
  const { data = [], isLoading } = useQuery({ queryKey: ["certs", uid], queryFn: () => certificateService.mine(uid) });
  return (
    <>
      <DashHeader title="Certificates & diplomas" subtitle="Numbered documents issued after each validated assessment." />
      {isLoading ? <LoadingRows /> : data.length === 0 ? <EmptyState title="No certificate yet" description="Complete a certified program to receive your first document." /> : (
        <div className="grid gap-4 sm:grid-cols-2">
          {data.map((c) => (
            <Panel key={c.id} title={c.trainingTitle} description={`No. ${c.number}`}>
              <StatusBadge tone={statusTone(c.status)}>{statusLabel(c.type)}</StatusBadge>
              <p className="mt-4 text-sm text-muted-foreground">Issued on {formatDate(c.issuedAt)}</p>
              {c.status === "ISSUED" && <DownloadButton certificateId={c.id} />}
            </Panel>
          ))}
        </div>
      )}
    </>
  );
}

function DownloadButton({ certificateId }: { certificateId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function download() {
    setLoading(true);
    setError(null);
    try {
      const blob = await certificateService.download(certificateId);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "certificate.pdf";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : "Unable to download the certificate.");
    } finally {
      setLoading(false);
    }
  }
  return (
    <>
      <Button type="button" variant="glass" className="mt-4" onClick={() => void download()} disabled={loading}>
        {loading ? "Downloading..." : "Download PDF"}
      </Button>
      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
    </>
  );
}
