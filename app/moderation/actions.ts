"use server";

import { supabaseServer } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function errRedirect(code: string) {
  revalidatePath("/moderation");
  redirect(`/moderation?error=${encodeURIComponent(code)}`);
}

export async function approveEvidence(formData: FormData) {
  const supabase = await supabaseServer();

  const evidenceId = String(formData.get("evidence_id") ?? "").trim();
  const moderatorNote = String(formData.get("moderator_note") ?? "").trim();

  console.log("APPROVE START", { evidenceId });

  if (!evidenceId) {
    console.error("APPROVE invalid evidenceId", { evidenceId });
    return errRedirect("invalid_evidence_id");
  }

  // Session check (no auth rate limit)
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    console.error("APPROVE not authenticated");
    return errRedirect("not_authenticated");
  }

  const user = session.user;

  // Preflight: can we even SEE this row?
  const { data: before, error: beforeError } = await supabase
    .from("evidence")
    .select("id,status")
    .eq("id", evidenceId)
    .maybeSingle();

  console.log("APPROVE preflight", { before, beforeError });

  if (beforeError) {
    console.error("APPROVE preflight error", beforeError);
    return errRedirect("preflight_failed");
  }

  if (!before) {
    // Either id mismatch OR RLS hiding the row
    console.error("APPROVE preflight no row", { evidenceId });
    return errRedirect("evidence_not_found_or_rls");
  }

  // Update
  const { error: updateError } = await supabase
    .from("evidence")
    .update({ status: "approved" })
    .eq("id", evidenceId);

  console.log("APPROVE update", { updateError });

  if (updateError) {
    console.error("APPROVE update failed", updateError);
    return errRedirect("update_failed");
  }

  // Record moderation action
  const { error: moderationError } = await supabase
    .from("moderation_actions")
    .insert({
      target_type: "evidence",
      target_id: evidenceId,
      action: "approve",
      moderator_note: moderatorNote,
      moderator_id: user.id,
    });

  console.log("APPROVE moderation log", { moderationError });

  if (moderationError) {
    console.error("APPROVE moderation insert failed", moderationError);
    return errRedirect("moderation_log_failed");
  }

  // Recalc
  const { error: recalcError } = await supabase.rpc(
    "recalculate_company_scores_for_evidence",
    { evidence_id: evidenceId }
  );

  console.log("APPROVE recalc", { recalcError });

  if (recalcError) {
    console.error("APPROVE recalc failed", recalcError);
    return errRedirect("recalc_failed");
  }

  // Postflight: did status change?
  const { data: after, error: afterError } = await supabase
    .from("evidence")
    .select("id,status")
    .eq("id", evidenceId)
    .maybeSingle();

  console.log("APPROVE postflight", { after, afterError });

  if (afterError) {
    console.error("APPROVE postflight error", afterError);
    return errRedirect("postflight_failed");
  }

  if (!after || after.status !== "approved") {
    console.error("APPROVE status not updated", { before, after });
    return errRedirect("status_not_updated_rls");
  }

  console.log("APPROVE DONE", { evidenceId });

  revalidatePath("/moderation");
  redirect("/moderation");
}

export async function rejectEvidence(formData: FormData) {
  const supabase = await supabaseServer();

  const evidenceId = String(formData.get("evidence_id") ?? "").trim();
  const moderatorNote = String(formData.get("moderator_note") ?? "").trim();

  console.log("REJECT START", { evidenceId });

  if (!evidenceId) {
    console.error("REJECT invalid evidenceId", { evidenceId });
    return errRedirect("invalid_evidence_id");
  }

  if (!moderatorNote) {
    console.error("REJECT missing moderator note");
    return errRedirect("moderator_note_required");
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    console.error("REJECT not authenticated");
    return errRedirect("not_authenticated");
  }

  const user = session.user;

  const { data: before, error: beforeError } = await supabase
    .from("evidence")
    .select("id,status")
    .eq("id", evidenceId)
    .maybeSingle();

  console.log("REJECT preflight", { before, beforeError });

  if (beforeError) {
    console.error("REJECT preflight error", beforeError);
    return errRedirect("preflight_failed");
  }

  if (!before) {
    console.error("REJECT preflight no row", { evidenceId });
    return errRedirect("evidence_not_found_or_rls");
  }

  const { error: updateError } = await supabase
    .from("evidence")
    .update({ status: "rejected" })
    .eq("id", evidenceId);

  console.log("REJECT update", { updateError });

  if (updateError) {
    console.error("REJECT update failed", updateError);
    return errRedirect("update_failed");
  }

  const { error: moderationError } = await supabase
    .from("moderation_actions")
    .insert({
      target_type: "evidence",
      target_id: evidenceId,
      action: "reject",
      moderator_note: moderatorNote,
      moderator_id: user.id,
    });

  console.log("REJECT moderation log", { moderationError });

  if (moderationError) {
    console.error("REJECT moderation insert failed", moderationError);
    return errRedirect("moderation_log_failed");
  }

  const { data: after, error: afterError } = await supabase
    .from("evidence")
    .select("id,status")
    .eq("id", evidenceId)
    .maybeSingle();

  console.log("REJECT postflight", { after, afterError });

  if (afterError) {
    console.error("REJECT postflight error", afterError);
    return errRedirect("postflight_failed");
  }

  if (!after || after.status !== "rejected") {
    console.error("REJECT status not updated", { before, after });
    return errRedirect("status_not_updated_rls");
  }

  console.log("REJECT DONE", { evidenceId });

  revalidatePath("/moderation");
  redirect("/moderation");
}
