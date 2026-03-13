"use client";

import type { Expense } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { deleteExpense } from "@/actions/expenses";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface ExpenseCardProps {
  expense: Expense;
  groupId: string;
}

export function ExpenseCard({ expense, groupId }: ExpenseCardProps) {
  const handleDelete = async () => {
    const result = await deleteExpense(groupId, expense.id);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Gasto eliminado");
    }
  };

  return (
    <Card>
      <CardContent className="flex items-center justify-between py-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium truncate">{expense.description}</p>
            {expense.categories && (
              <Badge
                variant="secondary"
                style={{
                  backgroundColor: expense.categories.color
                    ? `${expense.categories.color}20`
                    : undefined,
                  color: expense.categories.color ?? undefined,
                }}
              >
                {expense.categories.name}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Pagó: {expense.payer?.display_name ?? "?"} ·{" "}
            {format(new Date(expense.date + "T12:00:00"), "dd MMM yyyy", {
              locale: es,
            })}{" "}
            · {expense.split_method === "equal" ? "Partes iguales" : expense.split_method === "percentage" ? "Porcentual" : "Monto fijo"}
          </p>
        </div>
        <div className="flex items-center gap-3 ml-4">
          <span className="font-bold text-lg">
            ${Number(expense.amount).toLocaleString("es-AR", { minimumFractionDigits: 2 })}
          </span>
          <form action={handleDelete}>
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive">
              <Trash2 className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
