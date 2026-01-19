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

  // Use `any` here to avoid TypeScript mismatch with Supabase types;
  // at runtime we return the RequestCookie objects so Supabase can mutate them if needed.
  const cookieAdapter: any = {
    // Return the cookie object (RequestCookie) or null
    async get(name: string) {
      try {
        const c = store.get(name);
        return c ?? null;
      } catch (err) {
        console.warn("[supabaseServer] cookies.get failed", err);
        return null;
      }
    },

    // Return array of RequestCookie objects (or empty array)
    async getAll() {
      try {
        const all = store.getAll();
        return all ?? [];
      } catch (err) {
        console.warn("[supabaseServer] cookies.getAll failed", err);
        return [];
      }
    },

    // No-op on server helper to avoid "Cookies can only be modified..." errors
    async set(name: string, value: string, options?: any) {
      // intentionally do nothing here in SSR helper
      return;
    },

    // No-op remove to avoid calling store.delete outside allowed contexts
    async remove(name: string) {
      return;
    },
  };

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: cookieAdapter as any }
  );
}
