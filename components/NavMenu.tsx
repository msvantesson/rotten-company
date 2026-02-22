import { supabaseServer } from "@/lib/supabase-server";
import NavMenuClient from "./NavMenuClient";

export default async function NavMenu() {
  const supabase = await supabaseServer();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    console.error("[NavMenu] supabaseServer.auth.getUser error", error);
  }

  const userId = user?.id ?? null;
  const email = user?.email ?? null;

  let isModerator = false;

  if (userId) {
    const { data: modRow, error: modError } = await supabase
      .from("moderators")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (modError) {
      console.error("[NavMenu] moderators lookup error", modError);
    }

    isModerator = !!modRow;
  }

  return (
    <NavMenuClient
      email={email}
      isModerator={isModerator}
      moderationHref="/moderation/current"
    />
  );
}
