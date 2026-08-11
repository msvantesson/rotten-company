"use server";

import { supabaseServer } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { severityLabelToNumber } from "@/lib/severity-mapping";
import { normalizeEvidenceTimelineInput } from "@/lib/evidence-timeline";

export async function submitEvidence(formData: FormData) {
  const company_id = Number(formData.get("company_id"));
  const company_slug = String(formData.get("company_slug"));
  const title = String(formData.get("title"));
  const summary = String(formData.get("summary"));
  const category_id = Number(formData.get("category_id"));
  const severity_suggested_raw = formData.get("severity_suggested")?.toString() ?? null;
  const severity_suggested = severityLabelToNumber(severity_suggested_raw);
  const timelineResult = normalizeEvidenceTimelineInput({
    event_start_date: formData.get("event_start_date")?.toString() ?? null,
    event_start_precision: formData.get("event_start_precision")?.toString() ?? null,
    event_end_date: formData.get("event_end_date")?.toString() ?? null,
    event_end_precision: formData.get("event_end_precision")?.toString() ?? null,
    event_is_ongoing: formData.get("event_is_ongoing")?.toString() ?? null,
    resolution_status: formData.get("resolution_status")?.toString() ?? null,
    resolution_date: formData.get("resolution_date")?.toString() ?? null,
    resolution_date_precision: formData.get("resolution_date_precision")?.toString() ?? null,
  });
  if (!timelineResult.ok) {
    redirect(
      `/company/${company_slug}/submit-evidence?error=${encodeURIComponent(
        timelineResult.error,
      )}`,
    );
  }

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
    event_start_date: timelineResult.data.event_start_date,
    event_start_precision: timelineResult.data.event_start_precision,
    event_end_date: timelineResult.data.event_end_date,
    event_end_precision: timelineResult.data.event_end_precision,
    event_is_ongoing: timelineResult.data.event_is_ongoing,
    resolution_status: timelineResult.data.resolution_status,
    resolution_date: timelineResult.data.resolution_date,
    resolution_date_precision: timelineResult.data.resolution_date_precision,
  });

  if (error) {
    console.error("[submitEvidence]", error.message);
    redirect(`/company/${company_slug}/submit-evidence`);
  }

  redirect(`/company/${company_slug}/submit-evidence/thank-you`);
}
