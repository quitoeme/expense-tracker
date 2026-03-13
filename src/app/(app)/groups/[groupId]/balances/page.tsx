import { getBalances } from "@/actions/balances";
import { BalanceSummary } from "@/components/balances/balance-summary";

export default async function BalancesPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const balances = await getBalances(groupId);

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Balances</h2>
      <BalanceSummary balances={balances} groupId={groupId} />
    </div>
  );
}
