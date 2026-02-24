"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function signupWithPassword(formData: FormData) {
  const email = (formData.get("email") as string | null)?.trim();
  const password = formData.get("password") as string | null;

  if (!email || !password) {
    redirect("/signup?error=missing_fields");
  }

  const store = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        async get(name) {
          return store.get(name)?.value;
        },
        async set(name, value, options) {
          store.set(name, value, options);
        },
        async remove(name, options) {
          store.delete({ name, ...options });
        },
      },
    },
  );

  const { error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    store.set("signup_error", error.message, {
      path: "/signup",
      maxAge: 10,
    });
    redirect("/signup");
  }

  // User must confirm email → show friendly "check your inbox" page
  redirect(`/signup/confirm?email=${encodeURIComponent(email)}`);
}
