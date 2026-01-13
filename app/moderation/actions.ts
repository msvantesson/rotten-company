"use server";

import { supabaseService } from "@/lib/supabase-service";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function errRedirect(code: string) {
  revalidatePath("/moderation");
  redirect(`/moderation?error=${encodeURIComponent(code)}`);
}

export async function approveEvidence(formData: FormData) {
  const supabase = supabaseService();
  const evidenceId = String(formData.get("evidence_id") ?? "").trim();
  const moderatorNote = String(formData.get("moderator_note") ?? "").trim();

  if (!evidenceId) return errRedirect("invalid_evidence_id");

  const { data: before, error: beforeError } = await supabase
    .from("evidence")
    .select("id,status,company_id")
    .eq("id", evidenceId)
    .maybeSingle();

  if (beforeError || !before) return errRedirect("preflight_failed");

  const { error: updateError } = await supabase
    .from("evidence")
    .update({ status: "approved" })
    .eq("id", evidenceId);

  if (updateError) return errRedirect("update_failed");

  const { error: moderationError } = await supabase
    .from("moderation_actions")
    .insert({
      target_type: "evidence",
      target_id: evidenceId,
      action: "approve",
      moderator_note: moderatorNote || null,
      moderator_id: null, // now allowed
    });

  if (moderationError) return errRedirect("moderation_log_failed");

  const { error: recalcError } = await supabase.rpc(
    "recalculate_company_scores_for_evidence",
    { evidence_id: evidenceId }
  );

  if (recalcError) return errRedirect("recalc_failed");

  const { data: after, error: afterError } = await supabase
    .from("evidence")
    .select("id,status")
    .eq("id", evidenceId)
    .maybeSingle();

  if (afterError || !after || after.status !== "approved") {
    return errRedirect("status_not_updated");
  }

  revalidatePath("/moderation");
  redirect("/moderation");
}

export async function rejectEvidence(formData: FormData) {
  const supabase = supabaseService();
  const evidenceId = String(formData.get("evidence_id") ?? "").trim();
  const moderatorNote = String(formData.get("moderator_note") ?? "").trim();

  if (!evidenceId) return errRedirect("invalid_evidence_id");
  if (!moderatorNote) return errRedirect("moderator_note_required");

  const { data: before, error: beforeError } = await supabase
    .from("evidence")
    .select("id,status")
    .eq("id", evidenceId)
    .maybeSingle();

  if (beforeError || !before) return errRedirect("preflight_failed");

  const { error: updateError } = await supabase
    .from("evidence")
    .update({ status: "rejected" })
    .eq("id", evidenceId);

  if (updateError) return errRedirect("update_failed");

  const { error: moderationError } = await supabase
    .from("moderation_actions")
    .insert({
      target_type: "evidence",
      target_id: evidenceId,
      action: "reject",
      moderator_note: moderatorNote,
      moderator_id: null, // now allowed
    });

  if (moderationError) return errRedirect("moderation_log_failed");

  const { data: after, error: afterError } = await supabase
    .from("evidence")
    .select("id,status")
    .eq("id", evidenceId)
    .maybeSingle();

  if (afterError || !after || after.status !== "rejected") {
    return errRedirect("status_not_updated");
  }

  revalidatePath("/moderation");
  redirect("/moderation");
}
