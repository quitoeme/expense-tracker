"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { categorySchema } from "@/lib/validators";

export async function getCategories(groupId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("categories")
    .select("*")
    .eq("group_id", groupId)
    .order("name");

  return data ?? [];
}

export async function createCategory(groupId: string, formData: FormData) {
  const raw = {
    name: formData.get("name") as string,
    icon: (formData.get("icon") as string) || undefined,
    color: (formData.get("color") as string) || undefined,
  };

  const parsed = categorySchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("categories").insert({
    group_id: groupId,
    name: parsed.data.name,
    icon: parsed.data.icon ?? null,
    color: parsed.data.color ?? null,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "Ya existe una categoría con ese nombre" };
    }
    return { error: error.message };
  }

  revalidatePath(`/groups/${groupId}/categories`);
  return { success: true };
}

export async function deleteCategory(groupId: string, categoryId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", categoryId)
    .eq("group_id", groupId);

  if (error) return { error: error.message };

  revalidatePath(`/groups/${groupId}/categories`);
  return { success: true };
}
