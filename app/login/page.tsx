// /app/login/page.tsx

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { redirect } from "next/navigation";

export default async function LoginPage() {
  const cookieStore = cookies(); // ✅ NO await

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          cookieStore.set(name, value, options);
        },
        remove(name: string, options: any) {
          cookieStore.delete({ name, ...options });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  await supabase.from("users").upsert({
    id: user.id,
    email: user.email,
    name: user.user_metadata.full_name ?? null,
    avatar_url: user.user_metadata.avatar_url ?? null,
    moderation_credits: 0,
  });

  redirect("/");
}
