import { ChroniclerFaunaDetailPage } from "@/components/chronicler-fauna-detail-page";
import { WorkspaceShell } from "@/components/workspace-shell";

export default async function ChroniclerFaunaRoutePage({ params }: { params: Promise<{ faunaId: string }> }) {
  const { faunaId } = await params;

  return (
    <WorkspaceShell
      role="chronicler"
      eyebrow="Fauna"
      title="Fauna Entry"
      copy="Record wildlife, habitats, rarity, regional presence, and Chronicler field notes."
    >
      <ChroniclerFaunaDetailPage faunaId={faunaId} />
    </WorkspaceShell>
  );
}
