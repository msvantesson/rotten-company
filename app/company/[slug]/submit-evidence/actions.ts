"use server";

import { supabaseServer } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { severityLabelToNumber } from "@/lib/severity-mapping";

export async function submitEvidence(formData: FormData) {
  const company_id = Number(formData.get("company_id"));
  const company_slug = String(formData.get("company_slug"));
  const title = String(formData.get("title"));
  const summary = String(formData.get("summary"));
  const category_id = Number(formData.get("category_id"));
  const severity_suggested_raw = formData.get("severity_suggested")?.toString() ?? null;
  const severity_suggested = severityLabelToNumber(severity_suggested_raw);

  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Ensure user exists in "users" table (prevents FK violation on evidence insert)
  await supabase.from("users").upsert(
    {
      id: user.id,
      email: user.email,
      name: user.user_metadata?.full_name ?? null,
      avatar_url: user.user_metadata?.avatar_url ?? null,
      moderation_credits: 0,
    },
    { onConflict: "id" },
  );

  const { error } = await supabase.from("evidence").insert({
    company_id,
    user_id: user.id,
    title,
    summary,
    category_id,
    status: "pending",
    severity_suggested,
  });

  if (error) {
    console.error("[submitEvidence]", error.message);
    redirect(`/company/${company_slug}/submit-evidence`);
  }

  redirect(`/company/${company_slug}/submit-evidence/thank-you`);
}
