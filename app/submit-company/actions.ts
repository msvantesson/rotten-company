'use server';

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import type { CookieOptions } from "@/lib/types";

export async function submitCompany(formData: FormData) {
  const name = (formData.get("name") as string).trim();
  const slugInput = (formData.get("slug") as string).trim();
  const description = (formData.get("description") as string)?.trim() || "";

  // Normalize slug: lowercase, replace spaces, remove unsafe chars
  const slug = slugInput
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-]/g, "");

  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set(name, value, options);
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.delete({ name, ...options });
        },
      },
    }
  );

  // 1. Check if slug already exists
  const { data: existing, error: existingError } = await supabase
    .from("companies")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (existingError) {
    cookieStore.set("submit_company_error", "Database error while checking slug.", {
      path: "/submit-company",
      maxAge: 5,
    });
    redirect("/submit-company");
  }

  if (existing) {
    cookieStore.set("submit_company_error", "A company with this slug already exists.", {
      path: "/submit-company",
      maxAge: 5,
    });
    redirect("/submit-company");
  }

  // 2. Insert the new company
  const { error: insertError } = await supabase.from("companies").insert({
    name,
    slug,
    description,
  });

  if (insertError) {
    cookieStore.set("submit_company_error", "Failed to create company.", {
      path: "/submit-company",
      maxAge: 5,
    });
    redirect("/submit-company");
  }

  // 3. Redirect to the new company page
  redirect(`/company/${slug}`);
}
