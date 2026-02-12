// lib/supabase-route.ts
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function supabaseRoute(): Promise<SupabaseClient> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.",
    );
  }

  // await cookies() because in this runtime it returns a Promise
  const store = await cookies();

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
        const cookieObj: any = { name, value };
        if (options && typeof options === "object") {
          if (options.path) cookieObj.path = options.path;
          if (options.httpOnly !== undefined)
            cookieObj.httpOnly = options.httpOnly;
          if (options.sameSite) cookieObj.sameSite = options.sameSite;
          if (options.maxAge) cookieObj.maxAge = options.maxAge;
          if (options.expires) cookieObj.expires = options.expires;
        }
        store.set(cookieObj);
      } catch (err) {
        console.warn("supabase-route: cookies.set failed", err);
      }
    },
    async remove(name: string) {
      try {
        store.delete(name);
      } catch (err) {
        console.warn("supabase-route: cookies.delete failed", err);
      }
    },
  };

  return createServerClient(url, anonKey, { cookies: cookieAdapter });
}
