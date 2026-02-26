import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, // ✅ public anon key for browser
  {
    auth: {
      // optional: for a public page, you can disable session persistence
      // persistSession: false,
      // autoRefreshToken: false,
      // detectSessionInUrl: false,
    },
  },
);
