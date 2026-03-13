import { getExpenses } from "@/actions/expenses";
import { getGroupMembers } from "@/actions/groups";
import { getCategories } from "@/actions/categories";
import { ExpenseList } from "@/components/expenses/expense-list";
import { AddExpenseDialog } from "@/components/expenses/add-expense-dialog";

export default async function GroupExpensesPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const [expenses, members, categories] = await Promise.all([
    getExpenses(groupId),
    getGroupMembers(groupId),
    getCategories(groupId),
  ]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Gastos</h2>
        <AddExpenseDialog
          groupId={groupId}
          members={members}
          categories={categories}
        />
      </div>
      <ExpenseList expenses={expenses} groupId={groupId} />
    </div>
  );
}
