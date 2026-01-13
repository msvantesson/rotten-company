"use server";

import { supabaseServer } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

/**
 * Approve evidence
 */
export async function approveEvidence(formData: FormData) {
  const supabase = await supabaseServer();

  const evidenceId = Number(formData.get("evidence_id"));
  const moderatorNote = String(formData.get("moderator_note") ?? "").trim();

  if (!Number.isFinite(evidenceId)) {
    throw new Error("Invalid evidence id");
  }

  // Auth user (must be moderator — enforced by RLS)
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Not authenticated");
  }

  // 1) Approve evidence
  const { error: updateError } = await supabase
    .from("evidence")
    .update({ status: "approved" })
    .eq("id", evidenceId);

  if (updateError) {
    throw new Error("Failed to approve evidence");
  }

  // 2) Record moderation action (immutable audit log)
  const { error: moderationError } = await supabase
    .from("moderation_actions")
    .insert({
      target_type: "evidence",
      target_id: evidenceId,
      action: "approve",
      moderator_note: moderatorNote, // MUST NOT be null
      moderator_id: user.id,
    });

  if (moderationError) {
    throw new Error("Failed to record moderation action");
  }

  // 3) Trigger score recalculation
  const { error: recalcError } = await supabase.rpc(
    "recalculate_company_scores_for_evidence",
    { evidence_id: evidenceId }
  );

  if (recalcError) {
    throw new Error("Failed to recalculate scores");
  }

  revalidatePath("/moderation");
}

/**
 * Reject evidence
 */
export async function rejectEvidence(formData: FormData) {
  const supabase = await supabaseServer();

  const evidenceId = Number(formData.get("evidence_id"));
  const moderatorNote = String(formData.get("moderator_note") ?? "").trim();

  if (!Number.isFinite(evidenceId)) {
    throw new Error("Invalid evidence id");
  }

  if (!moderatorNote) {
    throw new Error("Moderator note required for rejection");
  }

  // Auth user (must be moderator — enforced by RLS)
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Not authenticated");
  }

  // 1) Reject evidence
  const { error: updateError } = await supabase
    .from("evidence")
    .update({ status: "rejected" })
    .eq("id", evidenceId);

  if (updateError) {
    throw new Error("Failed to reject evidence");
  }

  // 2) Record moderation action (immutable audit log)
  const { error: moderationError } = await supabase
    .from("moderation_actions")
    .insert({
      target_type: "evidence",
      target_id: evidenceId,
      action: "reject",
      moderator_note: moderatorNote,
      moderator_id: user.id,
    });

  if (moderationError) {
    throw new Error("Failed to record moderation action");
  }

  revalidatePath("/moderation");
}
