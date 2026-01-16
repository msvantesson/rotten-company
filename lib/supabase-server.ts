// /lib/supabase-server.ts
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export function supabaseServer() {
  console.info(
    "[DB DEBUG][supabaseServer] DATABASE_URL prefix:",
    process.env.DATABASE_URL?.slice?.(0, 60) ?? null
  );

  const cookieStorePromise = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, // anon key for SSR session reads
    {
      cookies: {
        async get(name: string) {
          const store = await cookieStorePromise;
          return store.get(name)?.value;
        },
        set() {
          // no-op for server environment
        },
        remove() {
          // no-op for server environment
        },
      },
    }
  );
}
