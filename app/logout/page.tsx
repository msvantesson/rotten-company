import { supabaseServer } from "@/lib/supabase-server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function LogoutPage() {
  const supabase = await supabaseServer();
  await supabase.auth.signOut();
  redirect("/");
}
