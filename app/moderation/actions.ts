"use server";

import { supabaseServer } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function approveEvidence(formData: FormData) {
  const supabase = await supabaseServer();

  // 🔴 IMPORTANT: ID IS A STRING
  const evidenceId = String(formData.get("evidence_id"));
  const moderatorNote = String(formData.get("moderator_note") ?? "").trim();

  console.log("APPROVE START", evidenceId);

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    throw new Error("Not authenticated");
  }

  const user = session.user;

  const { data: updated, error: updateError } = await supabase
    .from("evidence")
    .update({ status: "approved" })
    .eq("id", evidenceId)
    .select();

  console.log("UPDATED ROWS", updated);

  if (updateError || !updated || updated.length === 0) {
    throw new Error("Evidence update failed");
  }

  await supabase
    .from("moderation_actions")
    .insert({
      target_type: "evidence",
      target_id: evidenceId,
      action: "approve",
      moderator_note: moderatorNote,
      moderator_id: user.id,
    });

  await supabase.rpc(
    "recalculate_company_scores_for_evidence",
    { evidence_id: evidenceId }
  );

  console.log("APPROVE DONE", evidenceId);

  revalidatePath("/moderation");
  redirect("/moderation");
}

export async function rejectEvidence(formData: FormData) {
  const supabase = await supabaseServer();

  // 🔴 IMPORTANT: ID IS A STRING
  const evidenceId = String(formData.get("evidence_id"));
  const moderatorNote = String(formData.get("moderator_note") ?? "").trim();

  console.log("REJECT START", evidenceId);

  if (!moderatorNote) {
    throw new Error("Moderator note required");
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    throw new Error("Not authenticated");
  }

  const user = session.user;

  const { data: updated, error: updateError } = await supabase
    .from("evidence")
    .update({ status: "rejected" })
    .eq("id", evidenceId)
    .select();

  console.log("UPDATED ROWS", updated);

  if (updateError || !updated || updated.length === 0) {
    throw new Error("Evidence update failed");
  }

  await supabase
    .from("moderation_actions")
    .insert({
      target_type: "evidence",
      target_id: evidenceId,
      action: "reject",
      moderator_note: moderatorNote,
      moderator_id: user.id,
    });

  console.log("REJECT DONE", evidenceId);

  revalidatePath("/moderation");
  redirect("/moderation");
}
