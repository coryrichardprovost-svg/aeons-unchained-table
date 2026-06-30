import { ChroniclerCultureDetailPage } from "@/components/chronicler-culture-detail-page";

type CulturePageProps = {
  params: Promise<{ cultureId: string }>;
};

export default async function CulturePage({ params }: CulturePageProps) {
  const { cultureId } = await params;
  return <ChroniclerCultureDetailPage cultureId={cultureId} />;
}
