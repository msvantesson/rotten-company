"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

export async function signupWithPassword(formData: FormData) {
  const email = (formData.get("email") as string | null)?.trim();
  const password = formData.get("password") as string | null;

  if (!email || !password) {
    redirect("/signup?error=missing_fields");
  }

  const store = await cookies();
  const headerStore = await headers();
  const requestOrigin = headerStore.get("origin");
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (requestOrigin &&
    /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(requestOrigin)
      ? requestOrigin
      : "http://localhost:3000");

  const emailRedirectTo = new URL("/auth/callback", origin);
  emailRedirectTo.searchParams.set("next", "/");

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
    options: {
      emailRedirectTo: emailRedirectTo.toString(),
    },
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
