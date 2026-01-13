"use server";

import { supabaseServer } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function approveEvidence(formData: FormData) {
  const supabase = await supabaseServer();

  const evidenceId = Number(formData.get("evidence_id"));
  const moderatorNote = String(formData.get("moderator_note") ?? "").trim();

  console.log("APPROVE START", evidenceId);

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    throw new Error("Not authenticated");
  }

  const user = session.user;

  await supabase
    .from("evidence")
    .update({ status: "approved" })
    .eq("id", evidenceId);

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

  const evidenceId = Number(formData.get("evidence_id"));
  const moderatorNote = String(formData.get("moderator_note") ?? "").trim();

  console.log("REJECT START", evidenceId);

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    throw new Error("Not authenticated");
  }

  const user = session.user;

  await supabase
    .from("evidence")
    .update({ status: "rejected" })
    .eq("id", evidenceId);

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
