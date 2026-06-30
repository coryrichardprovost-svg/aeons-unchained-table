import { ChroniclerFactionDetailPage } from "@/components/chronicler-faction-detail-page";
import { WorkspaceShell } from "@/components/workspace-shell";

export default async function ChroniclerFactionRoutePage({ params }: { params: Promise<{ factionId: string }> }) {
  const { factionId } = await params;

  return (
    <WorkspaceShell
      role="chronicler"
      eyebrow="Factions"
      title="Faction Dossier"
      copy="Track organizations, influence, territories, public knowledge, secret motives, and political relationships."
    >
      <ChroniclerFactionDetailPage factionId={factionId} />
    </WorkspaceShell>
  );
}
