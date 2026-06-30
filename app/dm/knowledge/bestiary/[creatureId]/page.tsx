import { ChroniclerBestiaryDetailPage } from "@/components/chronicler-bestiary-detail-page";
import { WorkspaceShell } from "@/components/workspace-shell";

export default async function ChroniclerBestiaryRoutePage({ params }: { params: Promise<{ creatureId: string }> }) {
  const { creatureId } = await params;

  return (
    <WorkspaceShell
      role="chronicler"
      eyebrow="Bestiary"
      title="Creature Entry"
      copy="Record creature lore, origin, traits, strengths, weaknesses, status, and attributes."
    >
      <ChroniclerBestiaryDetailPage creatureId={creatureId} />
    </WorkspaceShell>
  );
}
