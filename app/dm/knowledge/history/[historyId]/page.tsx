import { ChroniclerHistoryDetailPage } from "@/components/chronicler-history-detail-page";
import { WorkspaceShell } from "@/components/workspace-shell";

export default async function ChroniclerHistoryRoutePage({ params }: { params: Promise<{ historyId: string }> }) {
  const { historyId } = await params;

  return (
    <WorkspaceShell
      role="chronicler"
      eyebrow="History"
      title="Chronicle Entry"
      copy="Write long-form histories, legends, eras, realms, wars, and player-known versions of the past."
    >
      <ChroniclerHistoryDetailPage historyId={historyId} />
    </WorkspaceShell>
  );
}
