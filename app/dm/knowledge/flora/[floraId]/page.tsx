import { ChroniclerFloraDetailPage } from "@/components/chronicler-fauna-detail-page";
import { WorkspaceShell } from "@/components/workspace-shell";

export default async function ChroniclerFloraRoutePage({ params }: { params: Promise<{ floraId: string }> }) {
  const { floraId } = await params;

  return (
    <WorkspaceShell
      role="chronicler"
      eyebrow="Flora"
      title="Flora Entry"
      copy="Record plants, habitats, rarity, regional presence, and Chronicler field notes."
    >
      <ChroniclerFloraDetailPage floraId={floraId} />
    </WorkspaceShell>
  );
}
