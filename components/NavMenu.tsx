import { supabaseServer } from "@/lib/supabase-server";
import NavMenuClient from "./NavMenuClient";

export default async function NavMenu() {
  const supabase = await supabaseServer();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  // Treat missing session as normal (anonymous visitor, Vercel screenshot bot, etc.)
  const isMissingSession =
    (error as any)?.name === "AuthSessionMissingError" ||
    (error as any)?.__isAuthError === true;

  if (error && !isMissingSession) {
    console.error("[NavMenu] supabaseServer.auth.getUser error", error);
  }

  const email = user?.email ?? null;
  const isLoggedIn = !!user;

  return (
    <NavMenuClient
      email={email}
      isLoggedIn={isLoggedIn}
      moderationHref="/moderation/current"
    />
  );
}
