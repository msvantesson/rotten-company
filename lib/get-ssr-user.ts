import { supabaseServer } from "./supabase-server";
import type { User } from "@supabase/supabase-js";

/**
 * Defensive SSR auth helper.
 * Wraps supabaseServer().auth.getUser() and returns user or null on any error.
 * Logs errors for diagnostics but never throws.
 * 
 * Use this in admin pages to prevent stale browser sessions from causing notFound() (404).
 */
export async function getSsrUser(): Promise<User | null> {
  try {
    const supabase = await supabaseServer();
    const { data, error } = await supabase.auth.getUser();

    if (error) {
      console.warn("[getSsrUser] supabase.auth.getUser error:", error);
      return null;
    }

    return data.user ?? null;
  } catch (err) {
    console.error("[getSsrUser] unexpected error:", err);
    return null;
  }
}
