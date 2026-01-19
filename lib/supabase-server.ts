// /lib/supabase-server.ts
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function supabaseServer(): Promise<SupabaseClient> {
  console.info(
    "[DB DEBUG][supabaseServer] DATABASE_URL prefix:",
    process.env.DATABASE_URL?.slice?.(0, 60) ?? null
  );

  // await cookies() here so we pass a proper adapter (not a Promise) to createServerClient
  const store = await cookies();

  const cookieAdapter = {
    async get(name: string) {
      try {
        // return the cookie object (not just the string value)
        // Next's cookies().get(name) returns an object like { name, value, path, ... } or undefined
        const c = store.get(name);
        return c ?? null;
      } catch (err) {
        console.warn("[supabaseServer] cookies.get failed", err);
        return null;
      }
    },
    async set(name: string, value: string, options?: any) {
      // no-op in this server helper (server environment)
      try {
        // defensive no-op to avoid runtime attempts to mutate primitives
        return;
      } catch (err) {
        console.warn("[supabaseServer] cookies.set failed", err);
      }
    },
    async remove(name: string) {
      // no-op in this server helper
      try {
        return;
      } catch (err) {
        console.warn("[supabaseServer] cookies.delete failed", err);
      }
    },
  };

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: cookieAdapter }
  );
}
