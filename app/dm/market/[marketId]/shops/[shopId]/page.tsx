import { ChroniclerShopDetailPage } from "@/components/chronicler-shop-detail-page";
import { WorkspaceShell } from "@/components/workspace-shell";

export default async function ChroniclerShopRoutePage({ params }: { params: Promise<{ marketId: string; shopId: string }> }) {
  const { marketId, shopId } = await params;

  return (
    <WorkspaceShell
      role="chronicler"
      eyebrow="Shop Builder"
      title="Shop Page"
      copy="Edit shop details, choose item types, and manage stock from the shared item database."
    >
      <ChroniclerShopDetailPage marketId={marketId} shopId={shopId} />
    </WorkspaceShell>
  );
}
