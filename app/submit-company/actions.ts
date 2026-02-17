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
  const ceoName = (formData.get("ceo_name") as string)?.trim();
  const ceoLinkedinUrl = (formData.get("ceo_linkedin_url") as string)?.trim() || null;
  const ceoStartedAt = (formData.get("ceo_started_at") as string)?.trim() || null;

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

  const { data: companyRequest, error } = await supabase
    .from("company_requests")
    .insert({
      name,
      country,
      website,
      description,
      why,
      user_id: user.id,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[submitCompany] Supabase insert error:", error.message);

    cookieStore.set("submit_company_error", "Failed to submit company for review.", {
      path: "/submit-company",
      maxAge: 5,
    });
    redirect("/submit-company");
  }

  // Insert CEO staging data if CEO name is provided
  if (ceoName && companyRequest) {
    const { error: ceoError } = await supabase
      .from("company_request_leader_tenures")
      .insert({
        company_request_id: companyRequest.id,
        leader_name: ceoName,
        // Note: Uses UTC date if not provided by user
        started_at: ceoStartedAt || new Date().toISOString().split("T")[0], // Default to today
        ended_at: null,
        role: "ceo",
        linkedin_url: ceoLinkedinUrl,
      });

    if (ceoError) {
      console.error("[submitCompany] CEO staging insert error:", ceoError.message);
      // Note: We don't fail the entire request if CEO staging fails
    }
  }

  redirect("/submit-company/thank-you");
}
