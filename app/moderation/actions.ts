"use server";

import { supabaseService } from "@/lib/supabase-service";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function errRedirect(code: string) {
  revalidatePath("/moderation");
  redirect(`/moderation?error=${encodeURIComponent(code)}`);
}

async function enqueueNotification(supabase: ReturnType<typeof supabaseService>, email: string | null, subject: string, body: string, metadata: object = {}) {
  if (!email) return null;
  const { error } = await supabase
    .from("notification_jobs")
    .insert({
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

async function fetchSubmitterEmail(supabase: ReturnType<typeof supabaseService>, evidenceId: number) {
  const { data: ev, error: evErr } = await supabase
    .from("evidence")
    .select("id, user_id, title")
    .eq("id", evidenceId)
    .maybeSingle();

  if (evErr || !ev) {
    console.error("fetchSubmitterEmail: evidence fetch failed", evErr);
    return { email: null, evidenceTitle: null, userId: null };
  }

  const userId = ev.user_id;
  if (!userId) return { email: null, evidenceTitle: ev.title ?? null, userId: null };

  const { data: user, error: userErr } = await supabase
    .from("users")
    .select("email")
    .eq("id", userId)
    .maybeSingle();

  if (userErr || !user) {
    console.error("fetchSubmitterEmail: user fetch failed", userErr);
    return { email: null, evidenceTitle: ev.title ?? null, userId };
  }

  return { email: user.email as string, evidenceTitle: ev.title ?? null, userId };
}

export async function approveEvidence(formData: FormData) {
  const supabase = supabaseService();
  const evidenceId = Number(String(formData.get("evidence_id") ?? "").trim());
  const moderatorNote = String(formData.get("moderator_note") ?? "").trim();
  const moderatorIdRaw = String(formData.get("moderator_id") ?? "").trim() || null;

  if (!evidenceId) return errRedirect("invalid_evidence_id");

  // validate moderatorId (reuse your validateModeratorId logic)
  // ... (omitted here for brevity) ...

  // preflight fetch evidence (you already do this)
  const { data: before, error: beforeError } = await supabase
    .from("evidence")
    .select("id,status,company_id,user_id")
    .eq("id", evidenceId)
    .maybeSingle();

  if (beforeError || !before) return errRedirect("preflight_failed");

  // update evidence status
  const { error: updateError } = await supabase
    .from("evidence")
    .update({ status: "approved" })
    .eq("id", evidenceId);

  if (updateError) return errRedirect("update_failed");

  // insert moderation log
  const { error: moderationError } = await supabase
    .from("moderation_actions")
    .insert({
      target_type: "evidence",
      target_id: evidenceId,
      action: "approve",
      moderator_note: moderatorNote || "approved",
      moderator_id: moderatorIdRaw,
      source: "ui",
    });

  if (moderationError) return errRedirect("moderation_log_failed");

  // enqueue notification for submitter
  const { email, evidenceTitle } = await fetchSubmitterEmail(supabase, evidenceId);
  if (email) {
    const subject = `Your submission was approved`;
    const body = `Hi,\n\nYour submission${evidenceTitle ? ` "${evidenceTitle}"` : ""} has been approved by our moderation team.\n\nThanks for contributing.\n\n— Rotten Company`;
    await enqueueNotification(supabase, email, subject, body, { evidenceId, action: "approve" });
  }

  // recalc and postflight as before
  const { error: recalcError } = await supabase.rpc("recalculate_company_scores_for_evidence", { evidence_id: evidenceId });
  if (recalcError) return errRedirect("recalc_failed");

  const { data: after, error: afterError } = await supabase
    .from("evidence")
    .select("id,status")
    .eq("id", evidenceId)
    .maybeSingle();

  if (afterError || !after || after.status !== "approved") return errRedirect("status_not_updated");

  revalidatePath("/moderation");
  redirect("/moderation");
}

export async function rejectEvidence(formData: FormData) {
  const supabase = supabaseService();
  const evidenceId = Number(String(formData.get("evidence_id") ?? "").trim());
  const moderatorNote = String(formData.get("moderator_note") ?? "").trim();
  const moderatorIdRaw = String(formData.get("moderator_id") ?? "").trim() || null;

  if (!evidenceId) return errRedirect("invalid_evidence_id");
  if (!moderatorNote) return errRedirect("moderator_note_required");

  // validate moderatorId (reuse your validateModeratorId logic)
  // ... (omitted here for brevity) ...

  const { data: before, error: beforeError } = await supabase
    .from("evidence")
    .select("id,status,company_id,user_id")
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
      moderator_id: moderatorIdRaw,
      source: "ui",
    });

  if (moderationError) return errRedirect("moderation_log_failed");

  // enqueue notification for submitter
  const { email, evidenceTitle } = await fetchSubmitterEmail(supabase, evidenceId);
  if (email) {
    const subject = `Your submission was rejected`;
    const body = `Hi,\n\nYour submission${evidenceTitle ? ` "${evidenceTitle}"` : ""} has been rejected by our moderation team.\n\nReason: ${moderatorNote}\n\nIf you believe this is a mistake, please reply.\n\n— Rotten Company`;
    await enqueueNotification(supabase, email, subject, body, { evidenceId, action: "reject" });
  }

  const { data: after, error: afterError } = await supabase
    .from("evidence")
    .select("id,status")
    .eq("id", evidenceId)
    .maybeSingle();

  if (afterError || !after || after.status !== "rejected") return errRedirect("status_not_updated");

  revalidatePath("/moderation");
  redirect("/moderation");
}
