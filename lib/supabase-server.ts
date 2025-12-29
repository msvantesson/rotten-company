// /lib/supabase-server.ts
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/auth-helpers-nextjs";

export function supabaseServer() {
  const cookieStore = cookies(); // must CALL cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // safe on server
    {
      cookies: cookieStore, // pass the cookie object, not the function
    }
  );
}
