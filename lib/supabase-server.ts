import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function supabaseServer(): Promise<SupabaseClient> {
  console.info(
    "[DB DEBUG][supabaseServer] DATABASE_URL prefix:",
    process.env.DATABASE_URL?.slice?.(0, 60) ?? null
  );

  const store = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return store.getAll().map((c) => ({
            name: c.name,
            value: c.value,
          }));
        },

        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              store.set(name, value, options);
            }
          } catch {
            // Next.js may block cookie mutation during Server Component render.
            // This is expected and safe — middleware / route handlers will refresh cookies.
          }
        },
      },
    }
  );
}
