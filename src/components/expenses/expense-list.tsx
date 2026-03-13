"use client";

import type { Expense } from "@/lib/types";
import { ExpenseCard } from "./expense-card";

interface ExpenseListProps {
  expenses: Expense[];
  groupId: string;
}

export function ExpenseList({ expenses, groupId }: ExpenseListProps) {
  if (expenses.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No hay gastos todavía. Agregá el primero.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {expenses.map((expense) => (
        <ExpenseCard key={expense.id} expense={expense} groupId={groupId} />
      ))}
    </div>
  );
}
