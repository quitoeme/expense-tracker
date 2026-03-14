import { updateSession } from "@/lib/supabase/middleware";
import { type NextRequest } from "next/server";

// Cambiar "middleware" por "proxy"
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}
