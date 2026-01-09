import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export function supabaseServer() {
  const cookieStorePromise = cookies(); // TS thinks this is a Promise

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
