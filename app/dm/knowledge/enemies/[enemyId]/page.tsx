import { ChroniclerEnemyDetailPage } from "@/components/chronicler-enemy-detail-page";
import { WorkspaceShell } from "@/components/workspace-shell";

export default async function ChroniclerEnemyRoutePage({ params }: { params: Promise<{ enemyId: string }> }) {
  const { enemyId } = await params;

  return (
    <WorkspaceShell
      role="chronicler"
      eyebrow="Enemies"
      title="Enemy Entry"
      copy="Record enemy lore, origin areas, strengths, weaknesses, status, attributes, and combat notes."
    >
      <ChroniclerEnemyDetailPage enemyId={enemyId} />
    </WorkspaceShell>
  );
}
