// /lib/supabase-server.ts
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function supabaseServer(): Promise<SupabaseClient> {
  console.info(
    "[DB DEBUG][supabaseServer] DATABASE_URL prefix:",
    process.env.DATABASE_URL?.slice?.(0, 60) ?? null
  );

  // Await the cookie store so we pass a concrete adapter to createServerClient
  const store = await cookies();

  const cookieAdapter = {
    // Supabase expects get to return the cookie value (string) or null
    async get(name: string): Promise<string | null> {
      try {
        const c = store.get(name);
        return c?.value ?? null;
      } catch (err) {
        console.warn("[supabaseServer] cookies.get failed", err);
        return null;
      }
    },

    // Supabase may call getAll; return an array of cookie values
    async getAll(): Promise<string[]> {
      try {
        const all = store.getAll();
        return all.map((c) => c.value);
      } catch (err) {
        console.warn("[supabaseServer] cookies.getAll failed", err);
        return [];
      }
    },

    // In this server helper we don't set cookies on the response; keep a safe implementation
    async set(name: string, value: string, options?: any): Promise<void> {
      try {
        // If you ever need to set cookies from server code, implement via Response cookies.
        // Here we attempt to call store.set if available, but swallow errors to avoid build/runtime failures.
        if (typeof (store as any).set === "function") {
          (store as any).set({ name, value, ...(options || {}) });
        }
      } catch (err) {
        console.warn("[supabaseServer] cookies.set failed", err);
      }
    },

    // Remove cookie (best-effort)
    async remove(name: string): Promise<void> {
      try {
        if (typeof (store as any).delete === "function") {
          (store as any).delete(name);
        }
      } catch (err) {
        console.warn("[supabaseServer] cookies.delete failed", err);
      }
    },
  };

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: cookieAdapter as any }
  );
}
