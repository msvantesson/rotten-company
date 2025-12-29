// /lib/supabase-server.ts
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/auth-helpers-nextjs";

export function supabaseServer() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        get: async (name: string) => {
          const store = await cookies();
          return store.get(name);
        },
        getAll: async () => {
          const store = await cookies();
          return store.getAll();
        },
        set: async (name: string, value: string, options: any) => {
          const store = await cookies();
          store.set(name, value, options);
        },
        delete: async (name: string, options: any) => {
          const store = await cookies();
          store.delete(name, options);
        },
      },
    }
  );
}
