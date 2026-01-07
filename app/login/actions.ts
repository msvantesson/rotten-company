'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import type { CookieOptions } from '@/lib/types';

export async function loginWithPassword(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  // ✅ MUST await cookies() in your environment
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        async get(name: string) {
          const store = await cookies();
          return store.get(name)?.value;
        },
        async set(name: string, value: string, options: CookieOptions) {
          const store = await cookies();
          store.set(name, value, options);
        },
        async remove(name: string, options: CookieOptions) {
          const store = await cookies();
          store.delete({ name, ...options });
        },
      },
    }
  );

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    cookieStore.set("login_error", error.message, {
      path: "/login",
      maxAge: 5,
    });
    redirect("/login");
  }

  redirect("/role-debug");
}
