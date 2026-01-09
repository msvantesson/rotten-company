import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export function supabaseServer() {
  // Next.js 16.1.0-canary.15 types say cookies() returns a Promise,
  // but at runtime it's sync in RSC. So we unwrap it manually.
  const cookieStorePromise = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        async get(name: string) {
          const store = await cookieStorePromise;
          return store.get(name)?.value;
        },
        set() {},
        remove() {},
      },
    }
  );
}
