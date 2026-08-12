import { supabaseServer } from "@/lib/supabase-server";
import NavMenuClient from "./NavMenuClient";

export default async function NavMenu() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return (
      <NavMenuClient
        email={null}
        isLoggedIn={false}
        moderationHref="/moderation/current"
      />
    );
  }

  const supabase = await supabaseServer();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  // Treat missing session as normal (anonymous visitor, Vercel screenshot bot, etc.)
  const authError = error as { name?: string; __isAuthError?: boolean } | null;
  const isMissingSession =
    authError?.name === "AuthSessionMissingError" ||
    authError?.__isAuthError === true;

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
