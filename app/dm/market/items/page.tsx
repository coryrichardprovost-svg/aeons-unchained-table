import { ChroniclerMarketItemsPage } from "@/components/chronicler-market-items-page";
import { WorkspaceShell } from "@/components/workspace-shell";

export default function ChroniclerMarketItemsRoutePage() {
  return (
    <WorkspaceShell
      role="chronicler"
      eyebrow="Market Backend"
      title="Item Database"
      copy="Create item types and shared item records that shops can pull from later."
    >
      <ChroniclerMarketItemsPage />
    </WorkspaceShell>
  );
}
