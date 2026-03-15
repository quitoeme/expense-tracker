"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { groupSchema } from "@/lib/validators";

export async function getGroups() {
    const supabase = await createClient();
    const { data } = await supabase
      .from("groups")
      .select("*, group_members(count)")
      .order("created_at", { ascending: false });
    return data ?? [];
}

export async function getGroupById(groupId: string) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("groups")
      .select("*")
      .eq("id", groupId)
      .single();
    return data;
}

export async function createGroup(formData: FormData) {
    const raw = {
          name: formData.get("name") as string,
          description: (formData.get("description") as string) || undefined,
          currency: (formData.get("currency") as string) || "ARS",
    };
    const parsed = groupSchema.safeParse(raw);
    if (!parsed.success) {
          return { error: parsed.error.issues[0].message };
    }
    const supabase = await createClient();
    const {
          data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "No autenticado" };

  const { data: group, error } = await supabase
      .from("groups")
      .insert({
              name: parsed.data.name,
              description: parsed.data.description ?? null,
              currency: parsed.data.currency,
              created_by: user.id,
      })
      .select()
      .single();

  if (error) return { error: error.message };

  await supabase.from("group_members").insert({
        group_id: group.id,
        user_id: user.id,
        role: "admin",
  });

  await supabase.rpc("seed_default_categories", { p_group_id: group.id });

  redirect(`/groups/${group.id}`);
}

export async function updateGroup(groupId: string, formData: FormData) {
    const raw = {
          name: formData.get("name") as string,
          description: (formData.get("description") as string) || undefined,
          currency: (formData.get("currency") as string) || "ARS",
    };
    const parsed = groupSchema.safeParse(raw);
    if (!parsed.success) {
          return { error: parsed.error.issues[0].message };
    }
    const supabase = await createClient();
    const { error } = await supabase
      .from("groups")
      .update({
              name: parsed.data.name,
              description: parsed.data.description ?? null,
              currency: parsed.data.currency,
      })
      .eq("id", groupId);
    if (error) return { error: error.message };
    revalidatePath(`/groups/${groupId}`);
    return { success: true };
}

export async function deleteGroup(groupId: string) {
    const supabase = await createClient();
    const { error } = await supabase.from("groups").delete().eq("id", groupId);
    if (error) return { error: error.message };
    redirect("/");
}

export async function getGroupMembers(groupId: string) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("group_members")
      .select("*, profiles(*)")
      .eq("group_id", groupId)
      .order("joined_at", { ascending: true });
    return data ?? [];
}

export async function addMember(groupId: string, email: string) {
    const supabase = await createClient();

  const { data: profile } = await supabase
      .from("profiles")
      .select("id, display_name, email")
      .eq("email", email)
      .single();

  if (!profile) {
        return { error: "No se encontró un usuario con ese email" };
  }

  const { data: group } = await supabase
      .from("groups")
      .select("name, id")
      .eq("id", groupId)
      .single();

  const { error } = await supabase.from("group_members").insert({
        group_id: groupId,
        user_id: profile.id,
        role: "member",
  });

  if (error) {
        if (error.code === "23505") {
                return { error: "Este usuario ya es miembro del grupo" };
        }
        return { error: error.message };
  }

  // Send invitation email
  try {
        const { Resend } = await import("resend");
        const resend = new Resend(process.env.RESEND_API_KEY);
        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://expense-tracker-swart-beta.vercel.app";
        const groupUrl = `${appUrl}/groups/${groupId}`;
        const displayName = profile.display_name ?? email;
        const groupName = group?.name ?? "un grupo";

      await resend.emails.send({
              from: "Expense Tracker <onboarding@resend.dev>",
              to: email,
              subject: `Te invitaron al grupo "${groupName}"`,
              html: `
                      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;">
                                <h2 style="margin:0 0 8px;">Te agregaron a un grupo 🎉</h2>
                                          <p style="color:#555;margin:0 0 24px;">
                                                      Hola <strong>${displayName}</strong>, te agregaron al grupo
                                                                  <strong>${groupName}</strong> en Expense Tracker.
                                                                            </p>
                                                                                      <a href="${groupUrl}"
                                                                                                   style="display:inline-block;background:#000;color:#fff;padding:12px 24px;
                                                                                                                       border-radius:8px;text-decoration:none;font-weight:600;">
                                                                                                                                   Ver grupo
                                                                                                                                             </a>
                                                                                                                                                       <p style="color:#aaa;font-size:12px;margin-top:32px;">
                                                                                                                                                                   Si no esperabas esta invitación, podés ignorar este mail.
                                                                                                                                                                             </p>
                                                                                                                                                                                     </div>
                                                                                                                                                                                           `,
      });
  } catch (emailError) {
        console.error("Error enviando email de invitación:", emailError);
  }

  revalidatePath(`/groups/${groupId}`);
    return { success: true };
}

export async function removeMember(groupId: string, userId: string) {
    const supabase = await createClient();
    const { error } = await supabase
      .from("group_members")
      .delete()
      .eq("group_id", groupId)
      .eq("user_id", userId);
    if (error) return { error: error.message };
    revalidatePath(`/groups/${groupId}`);
    return { success: true };
}
