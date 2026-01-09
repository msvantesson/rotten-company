import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export function supabaseServer() {
  const cookieStorePromise = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
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
