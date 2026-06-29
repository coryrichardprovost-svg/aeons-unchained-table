import { ChroniclerMarketDetailPage } from "@/components/chronicler-market-detail-page";
import { WorkspaceShell } from "@/components/workspace-shell";

export default async function ChroniclerMarketRoutePage({ params }: { params: Promise<{ marketId: string }> }) {
  const { marketId } = await params;

  return (
    <WorkspaceShell
      role="chronicler"
      eyebrow="Market Builder"
      title="Market Page"
      copy="Edit a location-based market, add shops, and choose what item types those shops can carry."
    >
      <ChroniclerMarketDetailPage marketId={marketId} />
    </WorkspaceShell>
  );
}
