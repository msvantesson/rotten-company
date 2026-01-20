"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseService } from "@/lib/supabase-service";

type ValidateResult =
  | { ok: true; id: string; reason: null }
  | { ok: false; id: null; reason: "missing" | "invalid" };

function errRedirect(code: string) {
  revalidatePath("/moderation");
  redirect(`/moderation?error=${encodeURIComponent(code)}`);
}

async function validateModeratorId(moderatorId: string | null): Promise<ValidateResult> {
  if (!moderatorId) {
    return { ok: false, id: null, reason: "missing" };
  }

  const supabase = supabaseService();
  const { data: user, error } = await supabase
    .from("users")
    .select("id")
    .eq("id", moderatorId)
    .maybeSingle();

  if (error || !user) {
    console.error("[moderation] invalid moderator_id", { moderatorId, error });
    return { ok: false, id: null, reason: "invalid" };
  }

  return { ok: true, id: user.id as string, reason: null };
}

async function fetchSubmitterEmail(
  supabase: ReturnType<typeof supabaseService>,
  evidenceId: number
) {
  const { data: ev, error: evErr } = await supabase
    .from("evidence")
    .select("id, user_id, title")
    .eq("id", evidenceId)
    .maybeSingle();

  if (evErr || !ev) {
    console.error("fetchSubmitterEmail: evidence fetch failed", evErr);
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
    console.error("fetchSubmitterEmail: user fetch failed", userErr);
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
  if (!email) return null;

  const { error } = await supabase.from("notification_jobs").insert({
    recipient_email: email,
    subject,
    body,
    metadata,
    status: "pending",
  });

  if (error) {
    console.error("enqueueNotification failed", error);
    return null;
  }

  return true;
}

export async function approveEvidence(formData: FormData) {
  const supabase = supabaseService();
  const evidenceIdRaw = String(formData.get("evidence_id") ?? "").trim();
  const evidenceId = Number(evidenceIdRaw);
  const moderatorNote = String(formData.get("moderator_note") ?? "").trim();
  const moderatorIdRaw = String(formData.get("moderator_id") ?? "").trim() || null;

  if (!evidenceIdRaw || Number.isNaN(evidenceId)) return errRedirect("invalid_evidence_id");

  const modCheck = await validateModeratorId(moderatorIdRaw);
  if (!modCheck.ok) {
    return errRedirect(modCheck.reason === "missing" ? "moderator_missing" : "moderator_invalid");
  }
  const moderatorId = modCheck.id;

  const { error: updateError } = await supabase
    .from("evidence")
    .update({
      status: "approved",
      assigned_moderator_id: null,
    })
    .eq("id", evidenceId);

  if (updateError) {
    console.error("APPROVE update failed", updateError);
    return errRedirect("update_failed");
  }

  const { error: moderationError } = await supabase.from("moderation_actions").insert({
    target_type: "evidence",
    target_id: String(evidenceId),
    action: "approve",
    moderator_note: moderatorNote || "approved",
    moderator_id: moderatorId,
    source: "ui",
  });

  if (moderationError) {
    console.error("APPROVE moderation insert failed", moderationError);
    return errRedirect("moderation_log_failed");
  }

  const { email, evidenceTitle } = await fetchSubmitterEmail(supabase, evidenceId);
  if (email) {
    await enqueueNotification(
      supabase,
      email,
      "Your submission was approved",
      `Hi,\n\nYour submission${evidenceTitle ? ` "${evidenceTitle}"` : ""} has been approved.\n\n— Rotten Company`,
      { evidenceId, action: "approve" }
    );
  }

  revalidatePath("/moderation");
  redirect("/moderation");
}

export async function rejectEvidence(formData: FormData) {
  const supabase = supabaseService();
  const evidenceIdRaw = String(formData.get("evidence_id") ?? "").trim();
  const evidenceId = Number(evidenceIdRaw);
  const moderatorNote = String(formData.get("moderator_note") ?? "").trim();
  const moderatorIdRaw = String(formData.get("moderator_id") ?? "").trim() || null;

  if (!evidenceIdRaw || Number.isNaN(evidenceId)) return errRedirect("invalid_evidence_id");
  if (!moderatorNote) return errRedirect("moderator_note_required");

  const modCheck = await validateModeratorId(moderatorIdRaw);
  if (!modCheck.ok) {
    return errRedirect(modCheck.reason === "missing" ? "moderator_missing" : "moderator_invalid");
  }
  const moderatorId = modCheck.id;

  const { error: updateError } = await supabase
    .from("evidence")
    .update({
      status: "rejected",
      assigned_moderator_id: null,
    })
    .eq("id", evidenceId);

  if (updateError) {
    console.error("REJECT update failed", updateError);
    return errRedirect("update_failed");
  }

  const { error: moderationError } = await supabase.from("moderation_actions").insert({
    target_type: "evidence",
    target_id: String(evidenceId),
    action: "reject",
    moderator_note: moderatorNote,
    moderator_id: moderatorId,
    source: "ui",
  });

  if (moderationError) {
    console.error("REJECT moderation insert failed", moderationError);
    return errRedirect("moderation_log_failed");
  }

  const { email, evidenceTitle } = await fetchSubmitterEmail(supabase, evidenceId);
  if (email) {
    await enqueueNotification(
      supabase,
      email,
      "Your submission was rejected",
      `Hi,\n\nYour submission${evidenceTitle ? ` "${evidenceTitle}"` : ""} was rejected.\n\nReason: ${moderatorNote}\n\n— Rotten Company`,
      { evidenceId, action: "reject" }
    );
  }

  revalidatePath("/moderation");
  redirect("/moderation");
}
