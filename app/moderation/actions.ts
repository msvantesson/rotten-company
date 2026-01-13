"use server";

import { supabaseServer } from "@/lib/supabase-server";

export async function rejectEvidence(formData: FormData) {
  const supabase = await supabaseServer();

  const evidenceId = Number(formData.get("evidence_id"));
  const moderatorNote = String(formData.get("moderator_note") ?? "").trim();

  if (!Number.isFinite(evidenceId)) {
    throw new Error("Invalid evidence id");
  }

  if (!moderatorNote) {
    throw new Error("Moderator note is required");
  }

  // Auth user (must be moderator — enforced by RLS)
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Not authenticated");
  }

  // 1) Update evidence status
  const { error: updateError } = await supabase
    .from("evidence")
    .update({ status: "rejected" })
    .eq("id", evidenceId);

  if (updateError) {
    throw new Error("Failed to update evidence status");
  }

  // 2) Insert moderation action (immutable audit log)
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
}
