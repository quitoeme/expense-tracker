import type { Expense, ExpenseSplit, Profile } from "./types";

export interface SimplifiedDebt {
  from: string;
  to: string;
  amount: number;
}

export function calculateBalances(
  expenses: Expense[],
  splits: ExpenseSplit[]
): SimplifiedDebt[] {
  const net: Record<string, number> = {};

  // Payer is owed the full amount
  for (const expense of expenses) {
    net[expense.paid_by] = (net[expense.paid_by] || 0) + Number(expense.amount);
  }

  // Each split participant owes their portion
  for (const split of splits) {
    if (split.is_settled) continue;
    net[split.user_id] = (net[split.user_id] || 0) - Number(split.amount);
  }

  // Separate into creditors and debtors
  const creditors: { userId: string; amount: number }[] = [];
  const debtors: { userId: string; amount: number }[] = [];

  for (const [userId, amount] of Object.entries(net)) {
    if (amount > 0.01) creditors.push({ userId, amount });
    else if (amount < -0.01) debtors.push({ userId, amount: -amount });
  }

  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  // Greedy matching to minimize transactions
  const settlements: SimplifiedDebt[] = [];
  let i = 0,
    j = 0;

  while (i < debtors.length && j < creditors.length) {
    const transferAmount = Math.min(debtors[i].amount, creditors[j].amount);

    if (transferAmount > 0.01) {
      settlements.push({
        from: debtors[i].userId,
        to: creditors[j].userId,
        amount: Math.round(transferAmount * 100) / 100,
      });
    }

    debtors[i].amount -= transferAmount;
    creditors[j].amount -= transferAmount;

    if (debtors[i].amount < 0.01) i++;
    if (creditors[j].amount < 0.01) j++;
  }

  return settlements;
}

export function resolveProfiles(
  settlements: SimplifiedDebt[],
  profileMap: Record<string, Profile>
) {
  return settlements.map((s) => ({
    from_user: profileMap[s.from],
    to_user: profileMap[s.to],
    amount: s.amount,
  }));
}
