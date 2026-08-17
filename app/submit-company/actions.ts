"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { INDUSTRIES, ALLOWED_EMPLOYEE_RANGE_VALUES } from "./constants";

export async function submitCompany(formData: FormData) {
  const cookieStore = await cookies();

  const name = (formData.get("name") as string)?.trim();
  const country = (formData.get("country") as string)?.trim();
  const hqRegion = (formData.get("hq_region") as string)?.trim() || null;
  const hqCity = (formData.get("hq_city") as string)?.trim() || null;
  const website = (formData.get("website") as string)?.trim() || null;
  const description = (formData.get("description") as string)?.trim();
  const why = (formData.get("why") as string)?.trim();

  const industry = (formData.get("industry") as string)?.trim() || null;
  const employeeRange = (formData.get("employee_range") as string)?.trim() || null;

  // No longer use min lookup — store value directly as canonical range string

  const isPrivateEquity = formData.get("is_private_equity") === "true";
  const peOwned = formData.get("pe_owned") === "true";
  const peOwnerId = (formData.get("pe_owner_id") as string)?.trim() || null;
  const peOwnershipStart = (formData.get("pe_ownership_start") as string)?.trim() || null;
  const peOwnershipEnd = (formData.get("pe_ownership_end") as string)?.trim() || null;

  if (!name || !country || !description || !why) {
    cookieStore.set("submit_company_error", "All required fields must be filled.", {
      path: "/submit-company",
      maxAge: 5,
    });
    redirect("/submit-company");
  }

  if (!industry || !INDUSTRIES.includes(industry)) {
    cookieStore.set("submit_company_error", "Please select a valid industry.", {
      path: "/submit-company",
      maxAge: 5,
    });
    redirect("/submit-company");
  }

  if (!employeeRange || !ALLOWED_EMPLOYEE_RANGE_VALUES.includes(employeeRange)) {
    cookieStore.set("submit_company_error", "Please select a valid company size range.", {
      path: "/submit-company",
      maxAge: 5,
    });
    redirect("/submit-company");
  }

  if (isPrivateEquity && peOwned) {
    cookieStore.set(
      "submit_company_error",
      "A company cannot be both a Private Equity firm and owned by Private Equity.",
      { path: "/submit-company", maxAge: 5 }
    );
    redirect("/submit-company");
  }

  if (peOwned && (!peOwnerId || !peOwnershipStart)) {
    cookieStore.set(
      "submit_company_error",
      "Private Equity owner and ownership start date are required when 'Owned by Private Equity' is checked.",
      { path: "/submit-company", maxAge: 5 }
    );
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

  const { data: requestData, error } = await supabase
    .from("company_requests")
    .insert({
      name,
      country,
      hq_region: hqRegion,
      hq_city: hqCity,
      website,
      description,
      why,
      user_id: user.id,
      is_private_equity: isPrivateEquity,
      industry: industry ?? undefined,
      size_employees: employeeRange ?? undefined,
    })
    .select("id")
    .single();

  if (error || !requestData) {
    console.error("[submitCompany] Supabase insert error:", error?.message);

    cookieStore.set("submit_company_error", "Failed to submit company for review.", {
      path: "/submit-company",
      maxAge: 5,
    });
    redirect("/submit-company");
  }

  if (peOwned && peOwnerId && peOwnershipStart) {
    const peOwnerIdInt = parseInt(peOwnerId, 10);
    if (isNaN(peOwnerIdInt)) {
      cookieStore.set("submit_company_error", "Invalid PE owner ID format.", {
        path: "/submit-company",
        maxAge: 5,
      });
      redirect("/submit-company");
    }
    const { error: peError } = await supabase.from("company_request_pe_owners").insert({
      company_request_id: requestData.id,
      pe_owner_id: peOwnerIdInt,
      ownership_start: peOwnershipStart,
      ownership_end: peOwnershipEnd || null,
    });

    if (peError) {
      console.error("[submitCompany] PE owner insert error:", peError.message);
    }
  }

  redirect("/submit-company/thank-you");
}
