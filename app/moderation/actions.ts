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
    console.error("[moderation] fetchSubmitterEmail failed", {
      evidenceId,
      error,
    });
    return { email: null, evidenceTitle: null };
  }

  const email = (data as any).users?.email ?? null;
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
 *
 * IMPORTANT:
 * Historical/synthetic evidence rows may have user_id = NULL.
 * In that case we cannot enforce "no self-moderation" by owner id.
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
    console.error("[moderation] fetchEvidenceOwnerId failed", {
      evidenceId,
      error,
    });
    return null;
  }

  return data.user_id ?? null;
}

/**
 * Insert a row into moderation_events for audit logging.
 */
async function insertModerationEvent(params: {
  evidenceId: number;
  moderatorId: string;
  action: "approved" | "rejected" | "assigned";
  note?: string | null;
}) {
  const supabase = supabaseService();
  const { evidenceId, moderatorId, action, note } = params;

  const { error } = await supabase.from("moderation_events").insert({
    evidence_id: evidenceId,
    moderator_id: moderatorId,
    action,
    note: note ?? null,
  });

  if (error) {
    console.error("[moderation] insertModerationEvent failed", {
      evidenceId,
      moderatorId,
      action,
      error,
    });
  }
}

/**
 * Approve evidence (main moderation flow).
 * Enforces: moderator cannot approve their own evidence (when owner is known).
 */
export async function approveEvidence(formData: FormData): Promise<ActionResult> {
  const supabase = supabaseService();

  const evidenceIdRaw = formData.get("evidence_id")?.toString() ?? null;
  const moderatorNote = formData.get("moderator_note")?.toString() ?? "";

  const evidenceId = evidenceIdRaw ? Number(evidenceIdRaw) : NaN;
  if (!evidenceId || Number.isNaN(evidenceId)) {
    console.warn("[moderation] approveEvidence: Invalid evidence ID", { evidenceIdRaw });
    return { ok: false, error: "Invalid evidence ID" };
  }

  // Get moderator ID from authenticated session
  const authSupabase = await supabaseServer();
  const { data: authData } = await authSupabase.auth.getUser();
  
  if (!authData?.user) {
    console.warn("[moderation] approveEvidence: Not authenticated");
    return { ok: false, error: "Not authenticated" };
  }

  const userId = authData.user.id;

  // Validate that the authenticated user is a moderator
  const { data: moderatorData, error: moderatorError } = await supabase
    .from("moderators")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (moderatorError || !moderatorData) {
    console.warn("[moderation] approveEvidence: User is not a moderator", { 
      userId, 
      error: moderatorError 
    });
    return { ok: false, error: "Not authorized as moderator" };
  }

  const moderatorId = moderatorData.user_id;

  // Enforce "cannot moderate own evidence" (only when owner is known)
  const ownerId = await fetchEvidenceOwnerId(supabase, evidenceId);
  if (ownerId && ownerId === moderatorId) {
    console.warn("[moderation] approveEvidence: Moderator cannot approve own submission", {
      evidenceId,
      moderatorId,
    });
    return {
      ok: false,
      error: "Moderators cannot approve their own submissions.",
    };
  }

  // Update evidence status
  const { error: updateError } = await supabase
    .from("evidence")
    .update({
      status: "approved",
      assigned_moderator_id: moderatorId,
      assigned_at: new Date().toISOString(),
    })
    .eq("id", evidenceId);

  if (updateError) {
    console.error("[moderation] approveEvidence update failed", { 
      evidenceId,
      moderatorId,
      error: updateError 
    });
    return { ok: false, error: "Failed to update evidence status" };
  }

  // Insert audit log entry
  await insertModerationEvent({
    evidenceId,
    moderatorId,
    action: "approved",
    note: moderatorNote,
  });

  // Notification (will no-op if submitter email cannot be resolved)
  const { email, evidenceTitle } = await fetchSubmitterEmail(supabase, evidenceId);

  const subject = "Your evidence was approved on Rotten Company";
  const body = [
    "Hi,",
    "",
    `Your evidence "${evidenceTitle ?? "(untitled)"}" has been approved by our moderators and is now live on Rotten Company.`,
    moderatorNote ? "" : null,
    moderatorNote ? `Moderator note: "${moderatorNote}"` : null,
    "",
    "— Rotten Company",
  ]
    .filter(Boolean)
    .join("\n");

  await enqueueNotification(supabase, email, subject, body, {
    type: "evidence_approved",
    evidence_id: evidenceId,
    moderator_id: moderatorId,
  });

  // Revalidate relevant paths
  revalidatePath("/moderation");
  revalidatePath("/my/evidence");
  return { ok: true };
}

/**
 * Reject evidence (main moderation flow).
 * Enforces: moderator cannot reject their own evidence (when owner is known).
 */
export async function rejectEvidence(formData: FormData): Promise<ActionResult> {
  const supabase = supabaseService();

  const evidenceIdRaw = formData.get("evidence_id")?.toString() ?? null;
  const moderatorNote = formData.get("moderator_note")?.toString() ?? "";

  const evidenceId = evidenceIdRaw ? Number(evidenceIdRaw) : NaN;
  if (!evidenceId || Number.isNaN(evidenceId)) {
    console.warn("[moderation] rejectEvidence: Invalid evidence ID", { evidenceIdRaw });
    return { ok: false, error: "Invalid evidence ID" };
  }

  // Get moderator ID from authenticated session
  const authSupabase = await supabaseServer();
  const { data: authData } = await authSupabase.auth.getUser();
  
  if (!authData?.user) {
    console.warn("[moderation] rejectEvidence: Not authenticated");
    return { ok: false, error: "Not authenticated" };
  }

  const userId = authData.user.id;

  // Validate that the authenticated user is a moderator
  const { data: moderatorData, error: moderatorError } = await supabase
    .from("moderators")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (moderatorError || !moderatorData) {
    console.warn("[moderation] rejectEvidence: User is not a moderator", { 
      userId, 
      error: moderatorError 
    });
    return { ok: false, error: "Not authorized as moderator" };
  }

  const moderatorId = moderatorData.user_id;

  // Enforce "cannot moderate own evidence" (only when owner is known)
  const ownerId = await fetchEvidenceOwnerId(supabase, evidenceId);
  if (ownerId && ownerId === moderatorId) {
    console.warn("[moderation] rejectEvidence: Moderator cannot reject own submission", {
      evidenceId,
      moderatorId,
    });
    return {
      ok: false,
      error: "Moderators cannot reject their own submissions.",
    };
  }

  if (!moderatorNote.trim()) {
    console.warn("[moderation] rejectEvidence: Rejection reason required", {
      evidenceId,
      moderatorId,
    });
    return {
      ok: false,
      error: "Rejection reason is required.",
    };
  }

  const { error: updateError } = await supabase
    .from("evidence")
    .update({
      status: "rejected",
      assigned_moderator_id: moderatorId,
      assigned_at: new Date().toISOString(),
    })
    .eq("id", evidenceId);

  if (updateError) {
    console.error("[moderation] rejectEvidence update failed", {
      evidenceId,
      moderatorId,
      error: updateError,
    });
    return { ok: false, error: "Failed to update evidence status" };
  }

  // Insert audit log entry
  await insertModerationEvent({
    evidenceId,
    moderatorId,
    action: "rejected",
    note: moderatorNote,
  });

  const { email, evidenceTitle } = await fetchSubmitterEmail(supabase, evidenceId);

  const subject = "Your evidence was rejected on Rotten Company";
  const body = [
    "Hi,",
    "",
    `Your evidence "${evidenceTitle ?? "(untitled)"}" was reviewed by our moderators but was not approved.`,
    "",
    "Reason for rejection:",
    moderatorNote,
    "",
    "— Rotten Company",
  ].join("\n");

  await enqueueNotification(supabase, email, subject, body, {
    type: "evidence_rejected",
    evidence_id: evidenceId,
    moderator_id: moderatorId,
  });

  revalidatePath("/moderation");
  revalidatePath("/my/evidence");
  return { ok: true };
}
