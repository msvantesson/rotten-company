// /lib/supabase-server.ts
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/auth-helpers-nextjs";

export function supabaseServer() {
  const cookieStore = cookies(); // ← this is the actual cookie object

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: cookieStore, // ← pass the object, not a Promise
    }
  );
}
