// lib/supabase-route.ts
import { cookies } from "next/headers";
import { createServerClient, SupabaseClient } from "@supabase/ssr";

/**
 * Returns a Supabase server client that reads/writes HttpOnly cookies
 * from the incoming Next.js request. This helper is safe to call from
 * server components and route handlers.
 *
 * Throws a clear error if required env vars are missing.
 */
export async function supabaseRoute(): Promise<SupabaseClient> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables."
    );
  }

  const store = cookies();

  // Adapter that matches the cookie API expected by @supabase/ssr
  const cookieAdapter = {
    async get(name: string) {
      try {
        const c = store.get(name);
        return c?.value ?? null;
      } catch (err) {
        console.warn("supabase-route: cookies.get failed", err);
        return null;
      }
    },
    async set(name: string, value: string, options?: any) {
      try {
        // next/headers cookies.set accepts an object with name/value and options
        // Merge options if provided (path, httpOnly, sameSite, maxAge, etc.)
        const cookieObj: any = { name, value };
        if (options && typeof options === "object") {
          // map common option names directly
          if (options.path) cookieObj.path = options.path;
          if (options.httpOnly !== undefined) cookieObj.httpOnly = options.httpOnly;
          if (options.sameSite) cookieObj.sameSite = options.sameSite;
          if (options.maxAge) cookieObj.maxAge = options.maxAge;
          if (options.expires) cookieObj.expires = options.expires;
        }
        store.set(cookieObj);
      } catch (err) {
        console.warn("supabase-route: cookies.set failed", err);
      }
    },
    async remove(name: string, _options?: any) {
      try {
        // next/headers cookies.delete accepts either name or object
        // use object form for clarity
        store.delete(name);
      } catch (err) {
        console.warn("supabase-route: cookies.delete failed", err);
      }
    },
  };

  // createServerClient expects the cookie adapter under `cookies`
  return createServerClient(url, anonKey, { cookies: cookieAdapter });
}
