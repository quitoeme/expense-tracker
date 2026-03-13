"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Granularity, SummaryBucket } from "@/lib/types";
import { startOfDay, startOfWeek, startOfMonth, format } from "date-fns";
import { es } from "date-fns/locale";

export async function getExpenses(
  groupId: string,
  options?: {
    categoryId?: string;
    startDate?: string;
    endDate?: string;
  }
) {
  const supabase = await createClient();
  let query = supabase
    .from("expenses")
    .select("*, categories(*), payer:profiles!expenses_paid_by_fkey(*), expense_splits(*)")
    .eq("group_id", groupId)
    .order("date", { ascending: false });

  if (options?.categoryId) {
    query = query.eq("category_id", options.categoryId);
  }
  if (options?.startDate) {
    query = query.gte("date", options.startDate);
  }
  if (options?.endDate) {
    query = query.lte("date", options.endDate);
  }

  const { data } = await query;
  return data ?? [];
}

export async function createExpense(
  groupId: string,
  data: {
    description: string;
    amount: number;
    date: string;
    category_id: string | null;
    paid_by: string;
    split_method: "equal" | "percentage" | "fixed";
    splits: { user_id: string; amount: number; percentage?: number }[];
  }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  // Validate splits sum
  const splitsTotal = data.splits.reduce((sum, s) => sum + s.amount, 0);
  if (Math.abs(splitsTotal - data.amount) > 0.01) {
    return {
      error: `La suma de los splits ($${splitsTotal.toFixed(2)}) no coincide con el monto ($${data.amount.toFixed(2)})`,
    };
  }

  if (data.split_method === "percentage") {
    const pctTotal = data.splits.reduce((sum, s) => sum + (s.percentage ?? 0), 0);
    if (Math.abs(pctTotal - 100) > 0.01) {
      return { error: "Los porcentajes deben sumar 100%" };
    }
  }

  // Create expense
  const { data: expense, error: expError } = await supabase
    .from("expenses")
    .insert({
      group_id: groupId,
      description: data.description,
      amount: data.amount,
      date: data.date,
      category_id: data.category_id,
      paid_by: data.paid_by,
      split_method: data.split_method,
      created_by: user.id,
    })
    .select()
    .single();

  if (expError) return { error: expError.message };

  // Create splits
  const { error: splitError } = await supabase.from("expense_splits").insert(
    data.splits.map((s) => ({
      expense_id: expense.id,
      user_id: s.user_id,
      amount: s.amount,
      percentage: s.percentage ?? null,
    }))
  );

  if (splitError) {
    // Rollback expense
    await supabase.from("expenses").delete().eq("id", expense.id);
    return { error: splitError.message };
  }

  revalidatePath(`/groups/${groupId}`);
  return { success: true };
}

export async function deleteExpense(groupId: string, expenseId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("expenses")
    .delete()
    .eq("id", expenseId);

  if (error) return { error: error.message };

  revalidatePath(`/groups/${groupId}`);
  return { success: true };
}

export async function getExpenseSummary(
  groupId: string,
  granularity: Granularity,
  startDate: string,
  endDate: string
): Promise<SummaryBucket[]> {
  const supabase = await createClient();
  const { data: expenses } = await supabase
    .from("expenses")
    .select("*, categories(*)")
    .eq("group_id", groupId)
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date", { ascending: true });

  if (!expenses) return [];

  const bucketFn = {
    daily: (d: Date) => startOfDay(d),
    weekly: (d: Date) => startOfWeek(d, { weekStartsOn: 1 }),
    monthly: (d: Date) => startOfMonth(d),
  }[granularity];

  const formatFn = {
    daily: (d: Date) => format(d, "dd MMM yyyy", { locale: es }),
    weekly: (d: Date) => `Sem. ${format(d, "dd MMM", { locale: es })}`,
    monthly: (d: Date) => format(d, "MMMM yyyy", { locale: es }),
  }[granularity];

  const buckets = new Map<string, SummaryBucket>();

  for (const expense of expenses) {
    const bucketDate = bucketFn(new Date(expense.date));
    const key = bucketDate.toISOString();

    if (!buckets.has(key)) {
      buckets.set(key, {
        label: formatFn(bucketDate),
        total: 0,
        byCategory: {},
        expenses: [],
      });
    }

    const bucket = buckets.get(key)!;
    bucket.total += Number(expense.amount);
    bucket.expenses.push(expense);

    const catName = expense.categories?.name || "Sin categoría";
    const catColor = expense.categories?.color || "#6b7280";
    if (!bucket.byCategory[catName]) {
      bucket.byCategory[catName] = { amount: 0, color: catColor };
    }
    bucket.byCategory[catName].amount += Number(expense.amount);
  }

  return Array.from(buckets.values());
}
