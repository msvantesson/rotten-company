"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function submitCompany(formData: FormData) {
  const cookieStore = await cookies();

  const name = (formData.get("name") as string)?.trim();
  const country = (formData.get("country") as string)?.trim();
  const website = (formData.get("website") as string)?.trim() || null;
  const description = (formData.get("description") as string)?.trim();
  const why = (formData.get("why") as string)?.trim();

  if (!name || !country || !description || !why) {
    cookieStore.set("submit_company_error", "All required fields must be filled.", {
      path: "/submit-company",
      maxAge: 5,
    });
    redirect("/submit-company");
  }

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

  if (!user) redirect("/login");

  const { error } = await supabase.from("company_requests").insert({
    name,
    country,
    website,
    description,
    why,
    user_id: user.id,
  });

  if (error) {
    console.error("[submitCompany] Supabase insert error:", error.message);

    cookieStore.set("submit_company_error", "Failed to submit company for review.", {
      path: "/submit-company",
      maxAge: 5,
    });
    redirect("/submit-company");
  }

  redirect("/submit-company/thank-you");
}
