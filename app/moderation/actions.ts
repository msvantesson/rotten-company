"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseService } from "@/lib/supabase-service";

/**
 * Server actions for moderation (approve / reject).
 * - Validates moderator_id (requires a valid moderator for UI actions).
 * - Writes moderation_actions with source = 'ui'.
 * - Enqueues a notification job into notification_jobs for submitter email.
 * - Uses the service-role Supabase client for privileged writes.
 */

/* ---------- Types ---------- */

type ValidateResult =
  | { ok: true; id: string; reason: null }
  | { ok: false; id: null; reason: "missing" | "invalid" };

/* ---------- Helpers ---------- */

function errRedirect(code: string) {
  revalidatePath("/moderation");
  redirect(`/moderation?error=${encodeURIComponent(code)}`);
}

async function validateModeratorId(moderatorId: string | null): Promise<ValidateResult> {
  if (!moderatorId) {
    return { ok: false, id: null, reason: "missing" };
  }

  const supabase = supabaseService();
  const { data: user, error } = await supabase.from("users").select("id").eq("id", moderatorId).maybeSingle();

  if (error || !user) {
    console.error("[moderation] invalid moderator_id", { moderatorId, error });
    return { ok: false, id: null, reason: "invalid" };
  }

  return { ok: true, id: user.id as string, reason: null };
}

async function fetchSubmitterEmail(supabase: ReturnType<typeof supabaseService>, evidenceId: number) {
  const { data: ev, error: evErr } = await supabase
    .from("evidence")
    .select("id, user_id, title")
    .eq("id", evidenceId)
    .maybeSingle();

  if (evErr || !ev) {
    console.error("fetchSubmitterEmail: evidence fetch failed", evErr);
    return { email: null as string | null, evidenceTitle: null as string | null, userId: null as string | null };
  }

  const userId = ev.user_id;
  if (!userId) return { email: null, evidenceTitle: ev.title ?? null, userId: null };

  const { data: user, error: userErr } = await supabase.from("users").select("email").eq("id", userId).maybeSingle();

  if (userErr || !user) {
    console.error("fetchSubmitterEmail: user fetch failed", userErr);
    return { email: null, evidenceTitle: ev.title ?? null, userId };
  }

  return { email: user.email as string, evidenceTitle: ev.title ?? null, userId };
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

/* ---------- Server actions ---------- */

export async function approveEvidence(formData: FormData) {
  const supabase = supabaseService();
  const evidenceIdRaw = String(formData.get("evidence_id") ?? "").trim();
  const evidenceId = Number(evidenceIdRaw);
  const moderatorNote = String(formData.get("moderator_note") ?? "").trim();
  const moderatorIdRaw = String(formData.get("moderator_id") ?? "").trim() || null;

  if (!evidenceIdRaw || Number.isNaN(evidenceId)) return errRedirect("invalid_evidence_id");

  // validate moderator id
  const modCheck = await validateModeratorId(moderatorIdRaw);
  if (!modCheck.ok) {
    return errRedirect(modCheck.reason === "missing" ? "moderator_missing" : "moderator_invalid");
  }
  const moderatorId = modCheck.id;

  console.info("APPROVE START", { evidenceId, moderatorId });

  // preflight: fetch evidence
  const { data: before, error: beforeError } = await supabase
    .from("evidence")
    .select("id,status,company_id,user_id")
    .eq("id", evidenceId)
    .maybeSingle();

  if (beforeError || !before) {
    console.error("APPROVE preflight failed", beforeError);
    return errRedirect("preflight_failed");
  }

  // update evidence status
  const { error: updateError } = await supabase.from("evidence").update({ status: "approved" }).eq("id", evidenceId);

  if (updateError) {
    console.error("APPROVE update failed", updateError);
    return errRedirect("update_failed");
  }

  // insert moderation log
  const { error: moderationError } = await supabase.from("moderation_actions").insert({
    target_type: "evidence",
    target_id: evidenceId,
    action: "approve",
    moderator_note: moderatorNote || "approved",
    moderator_id: moderatorId,
    source: "ui",
  });

  if (moderationError) {
    console.error("APPROVE moderation insert failed", moderationError);
    return errRedirect("moderation_log_failed");
  }

  // enqueue notification for submitter
  const { email, evidenceTitle } = await fetchSubmitterEmail(supabase, evidenceId);
  if (email) {
    const subject = `Your submission was approved`;
    const body = `Hi,\n\nYour submission${evidenceTitle ? ` "${evidenceTitle}"` : ""} has been approved by our moderation team.\n\nThanks for contributing.\n\n— Rotten Company`;
    await enqueueNotification(supabase, email, subject, body, { evidenceId, action: "approve" });
  }

  // recalc (if applicable)
  const { error: recalcError } = await supabase.rpc("recalculate_company_scores_for_evidence", { evidence_id: evidenceId });
  if (recalcError) {
    console.error("APPROVE recalc failed", recalcError);
    return errRedirect("recalc_failed");
  }

  // postflight verification
  const { data: after, error: afterError } = await supabase.from("evidence").select("id,status").eq("id", evidenceId).maybeSingle();

  if (afterError || !after || after.status !== "approved") {
    console.error("APPROVE postflight failed", afterError);
    return errRedirect("status_not_updated");
  }

  console.info("APPROVE DONE", { evidenceId, moderatorId });

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

  // validate moderator id
  const modCheck = await validateModeratorId(moderatorIdRaw);
  if (!modCheck.ok) {
    return errRedirect(modCheck.reason === "missing" ? "moderator_missing" : "moderator_invalid");
  }
  const moderatorId = modCheck.id;

  console.info("REJECT START", { evidenceId, moderatorId });

  // preflight: fetch evidence
  const { data: before, error: beforeError } = await supabase
    .from("evidence")
    .select("id,status,company_id,user_id")
    .eq("id", evidenceId)
    .maybeSingle();

  if (beforeError || !before) {
    console.error("REJECT preflight failed", beforeError);
    return errRedirect("preflight_failed");
  }

  // update evidence status
  const { error: updateError } = await supabase.from("evidence").update({ status: "rejected" }).eq("id", evidenceId);

  if (updateError) {
    console.error("REJECT update failed", updateError);
    return errRedirect("update_failed");
  }

  // insert moderation log
  const { error: moderationError } = await supabase.from("moderation_actions").insert({
    target_type: "evidence",
    target_id: evidenceId,
    action: "reject",
    moderator_note: moderatorNote,
    moderator_id: moderatorId,
    source: "ui",
  });

  if (moderationError) {
    console.error("REJECT moderation insert failed", moderationError);
    return errRedirect("moderation_log_failed");
  }

  // enqueue notification for submitter
  const { email, evidenceTitle } = await fetchSubmitterEmail(supabase, evidenceId);
  if (email) {
    const subject = `Your submission was rejected`;
    const body = `Hi,\n\nYour submission${evidenceTitle ? ` "${evidenceTitle}"` : ""} has been rejected by our moderation team.\n\nReason: ${moderatorNote}\n\nIf you believe this is a mistake, please reply.\n\n— Rotten Company`;
    await enqueueNotification(supabase, email, subject, body, { evidenceId, action: "reject" });
  }

  // postflight verification
  const { data: after, error: afterError } = await supabase.from("evidence").select("id,status").eq("id", evidenceId).maybeSingle();

  if (afterError || !after || after.status !== "rejected") {
    console.error("REJECT postflight failed", afterError);
    return errRedirect("status_not_updated");
  }

  console.info("REJECT DONE", { evidenceId, moderatorId });

  revalidatePath("/moderation");
  redirect("/moderation");
}
