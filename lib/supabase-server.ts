// /lib/supabase-server.ts
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function supabaseServer(): Promise<SupabaseClient> {
  console.info(
    "[DB DEBUG][supabaseServer] DATABASE_URL prefix:",
    process.env.DATABASE_URL?.slice?.(0, 60) ?? null
  );

  const store = await cookies();

  const cookieAdapter = {
    async get(name: string) {
      try {
        const c = store.get(name);
        return c?.value ?? null;
      } catch (err) {
        console.warn("[supabaseServer] cookies.get failed", err);
        return null;
      }
    },
    async set(name: string, value: string, options?: any) {
      // no-op in this server helper (server environment)
      try {
        // keep a defensive no-op to avoid runtime attempts to mutate primitives
        // If you need to set cookies from server, implement this using Response cookies.
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
