import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export function supabaseServer() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, // ✅ NEVER service role
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        // ❌ DO NOT SET COOKIES IN PAGES
        set() {},
        remove() {},
      },
    }
  );
}
