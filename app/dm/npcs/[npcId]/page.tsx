import { ChroniclerNpcDetailPage } from "@/components/chronicler-npc-detail-page";
import { WorkspaceShell } from "@/components/workspace-shell";

export default async function ChroniclerNpcRoutePage({ params }: { params: Promise<{ npcId: string }> }) {
  const { npcId } = await params;

  return (
    <WorkspaceShell
      role="chronicler"
      eyebrow="NPC Forge"
      title="NPC Record"
      copy="Build an NPC profile, connect them to Atlas locations, and keep their status, attributes, and story details together."
    >
      <ChroniclerNpcDetailPage npcId={npcId} />
    </WorkspaceShell>
  );
}
