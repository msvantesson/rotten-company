"use server";

import { revalidatePath } from "next/cache";
import { supabaseService } from "@/lib/supabase-service";

export type ActionResult =
  | { ok: true }
  | { ok: false; error: string };

async function validateModeratorId(moderatorId: string | null) {
  if (!moderatorId) return null;

  const supabase = supabaseService();
  const { data, error } = await supabase
    .from("users")
    .select("id")
    .eq("id", moderatorId)
    .maybeSingle();

  if (error || !data?.id) {
    console.error("[moderation] invalid moderator_id", { moderatorId, error });
    return null;
  }

  return data.id as string;
}

async function fetchSubmitterEmail(
  supabase: ReturnType<typeof supabaseService>,
  evidenceId: number
) {
  const { data: ev, error: evErr } = await supabase
    .from("evidence")
    .select("user_id, title")
    .eq("id", evidenceId)
    .maybeSingle();

  if (evErr || !ev) {
    console.error("[moderation] fetchSubmitterEmail evidence fetch failed", evErr);
    return { email: null, evidenceTitle: null };
  }

  if (!ev.user_id) {
    return { email: null, evidenceTitle: ev.title ?? null };
  }

  const { data: user, error: userErr } = await supabase
    .from("users")
    .select("email")
    .eq("id", ev.user_id)
    .maybeSingle();

  if (userErr || !user) {
    console.error("[moderation] fetchSubmitterEmail user fetch failed", userErr);
    return { email: null, evidenceTitle: ev.title ?? null };
  }

  return { email: user.email as string, evidenceTitle: ev.title ?? null };
}

async function enqueueNotification(
  supabase: ReturnType<typeof supabaseService>,
  email: string | null,
  subject: string,
  body: string,
  metadata: object = {}
) {
  if (!email) return;

  const { error } = await supabase.from("notification_jobs").insert({
    recipient_email: email,
    subject,
    body,
    metadata,
    status: "pending",
  });

  if (error) {
    console.error("[moderation] enqueueNotification failed", error);
  }
}

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
    evidenceId
  );

  await enqueueNotification(
    supabase,
    email,
    "Your submission was approved",
    `Hi,\n\nYour submission${
      evidenceTitle ? ` "${evidenceTitle}"` : ""
    } has been approved.\n\n— Rotten Company`,
    { evidenceId, action: "approve" }
  );

  revalidatePath("/moderation");
  return { ok: true };
}

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

  const { email, evidenceTitle } = await fetchSubmitterEmail(
    supabase,
    evidenceId
  );

  await enqueueNotification(
    supabase,
    email,
    "Your submission was rejected",
    `Hi,\n\nYour submission${
      evidenceTitle ? ` "${evidenceTitle}"` : ""
    } was rejected.\n\nReason: ${moderatorNote}\n\n— Rotten Company`,
    { evidenceId, action: "reject" }
  );

  revalidatePath("/moderation");
  return { ok: true };
}

// Phase 1: not yet wired into the client, but ready when we want real skip semantics.
export async function skipEvidence(
  evidenceId: number,
  moderatorId: string
): Promise<ActionResult> {
  const supabase = supabaseService();

  const validModerator = await validateModeratorId(moderatorId);
  if (!validModerator) {
    return { ok: false, error: "invalid_moderator" };
  }

  const { error: updateError } = await supabase
    .from("evidence")
    .update({ assigned_moderator_id: null })
    .eq("id", evidenceId);

  if (updateError) {
    console.error("[moderation] SKIP update failed", updateError);
    return { ok: false, error: "update_failed" };
  }

  const { error: moderationError } = await supabase
    .from("moderation_actions")
    .insert({
      target_type: "evidence",
      target_id: String(evidenceId),
      action: "skip",
      moderator_note: "skipped",
      moderator_id: moderatorId,
      source: "ui",
    });

  if (moderationError) {
    console.error("[moderation] SKIP moderation insert failed", moderationError);
    return { ok: false, error: "moderation_log_failed" };
  }

  revalidatePath("/moderation");
  return { ok: true };
}
