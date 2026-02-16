import { supabaseServer } from "./supabase-server";
import { logDebug } from "./log";
import type { User } from "@supabase/supabase-js";

/**
 * Defensive SSR auth helper.
 * 
 * Wraps supabaseServer().auth.getUser() in a safe helper that returns
 * the user object or null on auth errors. This prevents SSR pages from
 * throwing or returning 404 when the browser session is stale/missing.
 * 
 * Instead of crashing, pages can render a friendly sign-in message.
 */
export async function getSsrUser(): Promise<User | null> {
  try {
    const supabase = await supabaseServer();
    const { data, error } = await supabase.auth.getUser();
    
    if (error) {
      logDebug("get-ssr-user", "auth.getUser error (returning null)", error);
      return null;
    }
    
    return data.user ?? null;
  } catch (err) {
    logDebug("get-ssr-user", "unexpected error in getSsrUser (returning null)", err);
    return null;
  }
}
