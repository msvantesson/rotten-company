"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseService } from "@/lib/supabase-service";
import { supabaseServer } from "@/lib/supabase-server";
import { logDebug } from "@/lib/log";
import { getAssignedModerationItems } from "@/lib/getAssignedModerationItems";

/**
 * Result type returned by moderation server actions.
 */
export type ActionResult = {
  ok: boolean;
  error?: string;
};

/**
 * Get the authenticated user ID from the session.
 * Server-authoritative: never trust client-sent userId.
 */
async function getAuthenticatedUserId(): Promise<string | null> {
  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user.id;
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
 * Fetch user_id and assigned_moderator_id for an evidence item.
 * Used to enforce self-moderation and assignment rules in a single round-trip.
 */
async function fetchEvidenceMeta(
  supabase: ReturnType<typeof supabaseService>,
  evidenceId: number,
): Promise<{ userId: string | null; assignedModeratorId: string | null }> {
  const { data, error } = await supabase
    .from("evidence")
    .select("user_id, assigned_moderator_id")
    .eq("id", evidenceId)
    .maybeSingle();

  if (error || !data) {
    console.error("[moderation] fetchEvidenceMeta failed", {
      evidenceId,
      error,
    });
    return { userId: null, assignedModeratorId: null };
  }

  return {
    userId: data.user_id ?? null,
    assignedModeratorId: data.assigned_moderator_id ?? null,
  };
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
    return { ok: false, error: "Invalid evidence ID" };
  }

  // Server-authoritative: get moderator ID from the authenticated session
  const moderatorId = await getAuthenticatedUserId();
  if (!moderatorId) {
    return { ok: false, error: "Not authenticated" };
  }

  // Enforce "cannot moderate own evidence" (only when owner is known)
  // and that only the assigned moderator can approve — both in a single query.
  const { userId: ownerId, assignedModeratorId } = await fetchEvidenceMeta(supabase, evidenceId);
  if (ownerId && ownerId === moderatorId) {
    return {
      ok: false,
      error: "Moderators cannot approve their own submissions.",
    };
  }
  if (assignedModeratorId && assignedModeratorId !== moderatorId) {
    return { ok: false, error: "This item is assigned to a different moderator." };
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
    console.error("[moderation] approveEvidence update failed", updateError);
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
    return { ok: false, error: "Invalid evidence ID" };
  }

  // Server-authoritative: get moderator ID from the authenticated session
  const moderatorId = await getAuthenticatedUserId();
  if (!moderatorId) {
    return { ok: false, error: "Not authenticated" };
  }

  // Enforce "cannot moderate own evidence" (only when owner is known)
  // and that only the assigned moderator can reject — both in a single query.
  const { userId: ownerId, assignedModeratorId } = await fetchEvidenceMeta(supabase, evidenceId);
  if (ownerId && ownerId === moderatorId) {
    return {
      ok: false,
      error: "Moderators cannot reject their own submissions.",
    };
  }
  if (assignedModeratorId && assignedModeratorId !== moderatorId) {
    return { ok: false, error: "This item is assigned to a different moderator." };
  }

  if (!moderatorNote.trim()) {
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
    console.error("[moderation] rejectEvidence update failed", updateError);
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

type ClaimRow = { kind: "evidence" | "company_request" | "leader_tenure_request"; item_id: string };

/**
 * Assign the next moderation case (evidence or company_request) to the
 * currently signed-in moderator via the claim_next_moderation_item RPC.
 *
 * Returns { noPending: true } when no items are available so the client can
 * show "No pending cases" without a redirect.
 *
 * Returns { ok: false, reason: "already_assigned" } when the moderator already
 * has one or more pending assigned items, preventing multi-tab double-assignment.
 *
 * Redirects to the appropriate admin review page when a case is claimed.
 *
 * TODO: Remove logDebug calls once stabilized (MODERATION_DEBUG_LOGS).
 */
export async function assignNextCase(): Promise<
  { noPending: true } | { ok: false; reason: "already_assigned" } | void
> {
  const supabase = await supabaseServer();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  const userId = user?.id ?? null;

  // TODO: remove debug logging once stabilized
  logDebug("assign-next-case", "SSR auth result", {
    userPresent: !!user,
    userId,
    userError,
  });

  if (!userId) {
    redirect(`/login?reason=moderate&message=${encodeURIComponent("You must be signed in to access moderation.")}`);
  }

  const service = supabaseService();

  // Guard: refuse to assign if this moderator already has pending assigned items.
  // Use getAssignedModerationItems so the check is identical to /moderation SSR props.
  let alreadyAssignedCount = 0;
  try {
    const assigned = await getAssignedModerationItems(userId);
    alreadyAssignedCount = assigned.length;
  } catch (err) {
    // If we cannot determine assignment status, refuse to assign (safe default).
    console.error("[assign-next-case] could not check assigned items", err);
    return { ok: false, reason: "already_assigned" };
  }

  if (alreadyAssignedCount > 0) {
    return { ok: false, reason: "already_assigned" };
  }

  // Call claim_next_moderation_item RPC
  const { data, error: rpcError } = await service.rpc(
    "claim_next_moderation_item",
    { p_moderator_id: userId },
  );

  // TODO: remove debug logging once stabilized
  logDebug("assign-next-case", "claim_next_moderation_item result", {
    data,
    rpcError,
  });

  if (rpcError) {
    console.error("[assign-next-case] claim RPC error", rpcError);
    return { noPending: true };
  }

  const rawRow =
    Array.isArray(data) && data.length > 0 ? data[0] : null;

  // Validate the returned row has the expected shape before using it
  const row: ClaimRow | null =
    rawRow &&
    typeof rawRow === "object" &&
    (rawRow.kind === "evidence" || rawRow.kind === "company_request" || rawRow.kind === "leader_tenure_request") &&
    typeof rawRow.item_id === "string"
      ? (rawRow as ClaimRow)
      : null;

  // TODO: remove debug logging once stabilized
  logDebug("assign-next-case", "claimed row", { row });

  if (!row) {
    // Nothing available — caller will show "No pending cases"
    return { noPending: true };
  }

  if (row.kind === "evidence") {
    // TODO: remove debug logging once stabilized
    logDebug("assign-next-case", "redirecting to evidence", {
      id: row.item_id,
    });
    redirect(`/moderation/evidence/${row.item_id}`);
  }

  if (row.kind === "leader_tenure_request") {
    // TODO: remove debug logging once stabilized
    logDebug("assign-next-case", "redirecting to leader-tenure-request", {
      id: row.item_id,
    });
    redirect(`/moderation/leader-tenure-requests/${row.item_id}`);
  }

  // TODO: remove debug logging once stabilized
  logDebug("assign-next-case", "redirecting to company-request", {
    id: row.item_id,
  });
  redirect(`/moderation/company-requests/${row.item_id}`);
}
