import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function supabaseServer(): Promise<SupabaseClient> {
  // Optional: keep a very safe dev-only check
  if (process.env.NODE_ENV !== "production") {
    console.info(
      "[DB DEBUG][supabaseServer] DATABASE_URL set:",
      Boolean(process.env.DATABASE_URL),
    );
  }

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
    },
  );
}
