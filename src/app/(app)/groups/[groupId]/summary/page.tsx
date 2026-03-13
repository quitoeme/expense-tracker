import { SummaryView } from "@/components/summary/summary-view";

export default async function SummaryPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Resumen</h2>
      <SummaryView groupId={groupId} />
    </div>
  );
}
