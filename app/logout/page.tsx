import { supabaseServer } from "@/lib/supabase-server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function LogoutPage() {
  const supabase = await supabaseServer();

  // Clear the Supabase auth session (cookie-based)
  await supabase.auth.signOut();

  // Immediately send the user back to the homepage
  redirect("/");
}
