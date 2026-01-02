// /lib/supabase-server.ts

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function supabaseServer() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        async get(name: string) {
          const store = await cookies();
          return store.get(name)?.value;
        },
        // ❌ Pages cannot modify cookies in Next.js 16
        set() {},
        remove() {},
      },
    }
  );
}
