"use server";

import { supabaseServer } from "@/lib/supabase-server";
import { redirect } from "next/navigation";

export async function submitEvidence(formData: FormData) {
  const company_id = Number(formData.get("company_id"));
  const company_slug = String(formData.get("company_slug"));
  const title = String(formData.get("title"));
  const summary = String(formData.get("summary"));
  const category_id = Number(formData.get("category_id"));

  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { error } = await supabase.from("evidence").insert({
    company_id,
    user_id: user.id,
    title,
    summary,
    category_id,
    status: "pending",
  });

  if (error) {
    console.error("[submitEvidence]", error.message);
    redirect(`/company/${company_slug}/submit-evidence`);
  }

  redirect(`/company/${company_slug}/submit-evidence/thank-you`);
}
