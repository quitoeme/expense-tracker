"use server";

import { createClient } from "@/lib/supabase/server";
import { calculateBalances, resolveProfiles } from "@/lib/balance-calculator";
import { revalidatePath } from "next/cache";
import type { BalanceEntry, Profile } from "@/lib/types";

export async function getBalances(groupId: string): Promise<BalanceEntry[]> {
  const supabase = await createClient();

  const { data: expenses } = await supabase
    .from("expenses")
    .select("*")
    .eq("group_id", groupId);

  const { data: splits } = await supabase
    .from("expense_splits")
    .select("*, profiles(*)")
    .in(
      "expense_id",
      (expenses ?? []).map((e) => e.id)
    );

  if (!expenses || !splits) return [];

  // Build profile map
  const { data: members } = await supabase
    .from("group_members")
    .select("*, profiles(*)")
    .eq("group_id", groupId);

  const profileMap: Record<string, Profile> = {};
  for (const member of members ?? []) {
    if (member.profiles) {
      profileMap[member.user_id] = member.profiles as unknown as Profile;
    }
  }

  const settlements = calculateBalances(expenses, splits);
  return resolveProfiles(settlements, profileMap);
}

export async function settleUp(
  groupId: string,
  fromUserId: string,
  toUserId: string
) {
  const supabase = await createClient();

  // Get all expenses where toUser paid
  const { data: expenses } = await supabase
    .from("expenses")
    .select("id")
    .eq("group_id", groupId)
    .eq("paid_by", toUserId);

  if (!expenses?.length) return { success: true };

  // Mark splits from fromUser as settled
  const { error } = await supabase
    .from("expense_splits")
    .update({ is_settled: true })
    .in(
      "expense_id",
      expenses.map((e) => e.id)
    )
    .eq("user_id", fromUserId)
    .eq("is_settled", false);

  if (error) return { error: error.message };

  revalidatePath(`/groups/${groupId}/balances`);
  return { success: true };
}
