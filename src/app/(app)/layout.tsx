import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Toaster } from "sonner";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return (
    <div className="min-h-screen flex">
      <Sidebar
        user={{
          id: user.id,
          email: user.email ?? "",
          display_name: profile?.display_name ?? user.email ?? "",
        }}
      />
      <main className="flex-1 p-6 md:p-8 overflow-auto">{children}</main>
      <Toaster />
    </div>
  );
}
