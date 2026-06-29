import { ChroniclerClassDetailPage } from "@/components/chronicler-class-detail-page";
import { WorkspaceShell } from "@/components/workspace-shell";

export default async function ChroniclerClassRoutePage({ params }: { params: Promise<{ classId: string }> }) {
  const { classId } = await params;

  return (
    <WorkspaceShell
      role="chronicler"
      eyebrow="Class Builder"
      title="Class Page"
      copy="Edit the class name, description, bonuses, skills, abilities, and subclass evolutions."
    >
      <ChroniclerClassDetailPage classId={classId} />
    </WorkspaceShell>
  );
}
