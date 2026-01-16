// /lib/supabase-server.ts
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
export async function supabaseServer() { console.info( "[DB DEBUG][supabaseServer] DATABASE_URL prefix:", process.env.DATABASE_URL?.slice?.(0, 60) ?? null ); // existing code below }
export function supabaseServer() {
  const cookieStorePromise = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, // <-- anon key for SSR session reads
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
