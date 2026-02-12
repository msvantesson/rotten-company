"use server";

import { revalidatePath } from "next/cache";
import { supabaseService } from "@/lib/supabase-service";
import { supabaseServer } from "@/lib/supabase-server";

/**
 * Result type returned by moderation server actions.
 */
export type ActionResult = {
  ok: boolean;
  error?: string;
};

/**
 * Validate a moderator ID coming from formData.
 * Ensures the ID is a real moderator in the database.
 */
async function validateModeratorId(raw: string | null): Promise<string | null> {
  if (!raw) return null;

  const supabase = supabaseService();
  const { data, error } = await supabase
    .from("moderators")
    .select("user_id")
    .eq("user_id", raw)
    .maybeSingle();

  if (error || !data) {
    console.error("[moderation] validateModeratorId failed", { raw, error });
    return null;
  }

  return data.user_id;
}

/**
 * Fetch submitter email + evidence title for notifications.
 */
async function fetchSubmitterEmail(
  supabase: ReturnType<typeof supabaseService>,
  evidenceId: number,
): Promise<{ email: string | null; evidenceTitle: string | null }> {
  const { data, error } = await supabase
    .from("evidence")
    .select("title, user_id, users ( email )")
    .eq("id", evidenceId)
    .single();

  if (error || !data) {
    console.error("[moderation] fetchSubmitterEmail failed", { evidenceId, error });
    return { email: null, evidenceTitle: null };
  }

  // If you have a foreign key from evidence.user_id to users.id with a join alias
  const email =
    (data as any).users?.email ??
    null;

  const evidenceTitle = (data as any).title ?? null;

  return { email, evidenceTitle };
}

/**
 * Enqueue an email notification in notification_jobs.
 */
async function enqueueNotification(
  supabase: ReturnType<typeof supabaseService>,
  recipientEmail: string | null,
  subject: string,
  body: string,
  metadata: Record<string, any>,
) {
  if (!recipientEmail) return;

  const { error } = await supabase.from("notification_jobs").insert({
    recipient_email: recipientEmail,
    subject,
    body,
    metadata,
  });

  if (error) {
    console.error("[moderation] enqueueNotification failed", error);
  }
}

/**
 * Fetch the owner (submitter) of a piece of evidence.
 * Used to enforce that moderators cannot act on their own submissions.
 */
async function fetchEvidenceOwnerId(
  supabase: ReturnType<typeof supabaseService>,
  evidenceId: number,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("evidence")
    .select("user_id")
    .eq("id", evidenceId)
    .maybeSingle();

  if (error || !data) {
    console.error("[moderation] fetchEvidenceOwnerId failed", { evidenceId, error });
    return null;
  }

  return data.user_id ?? null;
}

/**
 * Approve evidence (main moderation flow).
 * NOW enforces: moderator cannot approve their own evidence.
 */
export async function approveEvidence(formData: FormData): Promise<ActionResult> {
  const supabase = supabaseService();

  const evidenceIdRaw = String(formData.get("evidence_id") ?? "").trim();
  const evidenceId = Number(evidenceIdRaw);
  const moderatorNote = String(formData.get("moderator_note") ?? "").trim();
  const moderatorIdRaw =
    String(formData.get("moderator_id") ?? "").trim() || null;

  if (!evidenceIdRaw || Number.isNaN(evidenceId)) {
    return { ok: false, error: "invalid_evidence_id" };
  }

  const moderatorId = await validateModeratorId(moderatorIdRaw);
  if (!moderatorId) {
    return { ok: false, error: "invalid_moderator" };
  }

  // 🚫 Prevent self‑moderation: moderator cannot approve their own evidence.
  const ownerId = await fetchEvidenceOwnerId(supabase, evidenceId);
  if (ownerId && ownerId === moderatorId) {
    return { ok: false, error: "cannot_moderate_own_evidence" };
  }

  const { error: updateError } = await supabase
    .from("evidence")
    .update({
      status: "approved",
      assigned_moderator_id: null,
    })
    .eq("id", evidenceId);

  if (updateError) {
    console.error("[moderation] APPROVE update failed", updateError);
    return { ok: false, error: "update_failed" };
  }

  const { error: moderationError } = await supabase
    .from("moderation_actions")
    .insert({
      target_type: "evidence",
      target_id: String(evidenceId),
      action: "approve",
      moderator_note: moderatorNote || "approved",
      moderator_id: moderatorId,
      source: "ui",
    });

  if (moderationError) {
    console.error("[moderation] APPROVE moderation insert failed", moderationError);
    return { ok: false, error: "moderation_log_failed" };
  }

  const { email, evidenceTitle } = await fetchSubmitterEmail(
    supabase,
    evidenceId,
  );

  await enqueueNotification(
    supabase,
    email,
    "Your submission was approved",
    `Hi,

Your submission${
      evidenceTitle ? ` "${evidenceTitle}"` : ""
    } has been approved.

— Rotten Company`,
    { evidenceId, action: "approve" },
  );

  revalidatePath("/moderation");
  return { ok: true };
}

/**
 * Reject evidence (main moderation flow).
 * NOW enforces: moderator cannot reject their own evidence.
 */
export async function rejectEvidence(formData: FormData): Promise<ActionResult> {
  const supabase = supabaseService();

  const evidenceIdRaw = String(formData.get("evidence_id") ?? "").trim();
  const evidenceId = Number(evidenceIdRaw);
  const moderatorNote = String(formData.get("moderator_note") ?? "").trim();
  const moderatorIdRaw =
    String(formData.get("moderator_id") ?? "").trim() || null;

  if (!evidenceIdRaw || Number.isNaN(evidenceId)) {
    return { ok: false, error: "invalid_evidence_id" };
  }

  if (!moderatorNote) {
    return { ok: false, error: "moderator_note_required" };
  }

  const moderatorId = await validateModeratorId(moderatorIdRaw);
  if (!moderatorId) {
    return { ok: false, error: "invalid_moderator" };
  }

  // 🚫 Prevent self‑moderation: moderator cannot reject their own evidence.
  const ownerId = await fetchEvidenceOwnerId(supabase, evidenceId);
  if (ownerId && ownerId === moderatorId) {
    return { ok: false, error: "cannot_moderate_own_evidence" };
  }

  // 1. Fetch submitter email BEFORE status update
  const { email, evidenceTitle } = await fetchSubmitterEmail(
    supabase,
    evidenceId,
  );

  // 2. Update evidence status
  const { error: updateError } = await supabase
    .from("evidence")
    .update({
      status: "rejected",
      assigned_moderator_id: null,
    })
    .eq("id", evidenceId);

  if (updateError) {
    console.error("[moderation] REJECT update failed", updateError);
    return { ok: false, error: "update_failed" };
  }

  // 3. Log moderation action
  const { error: moderationError } = await supabase
    .from("moderation_actions")
    .insert({
      target_type: "evidence",
      target_id: String(evidenceId),
      action: "reject",
      moderator_note: moderatorNote,
      moderator_id: moderatorId,
      source: "ui",
    });

  if (moderationError) {
    console.error("[moderation] REJECT moderation insert failed", moderationError);
    return { ok: false, error: "moderation_log_failed" };
  }

  // 4. Enqueue rejection notification
  await enqueueNotification(
    supabase,
    email,
    "Your submission was rejected",
    `Hi,

Your submission${
      evidenceTitle ? ` "${evidenceTitle}"` : ""
    } has been rejected.

Moderator note:
${moderatorNote}

— Rotten Company`,
    { evidenceId, action: "reject" },
  );

  revalidatePath("/moderation");
  return { ok: true };
}
