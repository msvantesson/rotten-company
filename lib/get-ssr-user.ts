import { supabaseServer } from "./supabase-server";

/**
 * Defensive SSR auth helper.
 * Returns user object { id, email } or null on any error.
 * Logs errors for diagnostics but never throws or causes 404.
 *
 * Use this helper in admin pages instead of calling
 * supabaseServer().auth.getUser() directly to prevent stale/invalid
 * refresh tokens from causing 404s.
 */
export async function getSsrUser(): Promise<{ id?: string; email?: string } | null> {
  try {
    const supabase = await supabaseServer();
    const { data, error } = await supabase.auth.getUser();

    if (error) {
      console.error("[getSsrUser] auth.getUser() error:", error.message);
      return null;
    }

    if (!data?.user) {
      return null;
    }

    return {
      id: data.user.id,
      email: data.user.email,
    };
  } catch (err) {
    console.error("[getSsrUser] unexpected exception:", err);
    return null;
  }
}
