// /lib/supabase-route.ts

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function supabaseRoute() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        async get(name: string) {
          const store = await cookies();
          return store.get(name)?.value;
        },
        async set(name: string, value: string, options: any) {
          const store = await cookies();
          store.set(name, value, options);
        },
        async remove(name: string, options: any) {
          const store = await cookies();
          store.delete({ name, ...options });
        },
      },
    }
  );
}
