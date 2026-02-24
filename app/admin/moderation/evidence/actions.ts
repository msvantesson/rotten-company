"use server";

import { supabaseService } from "@/lib/supabase-service";
import { supabaseServer } from "@/lib/supabase-server";
import { redirect } from "next/navigation";

async function getAuthenticatedUserOrThrow() {
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) throw new Error("Not authenticated");
  return auth.user;
}

export async function approveEvidence(formData: FormData) {
  const user = await getAuthenticatedUserOrThrow();
  const evidenceId = String(formData.get("evidenceId"));
  const note = String(formData.get("note") || "");

  const db = supabaseService();

  // Enforce: only the assigned moderator can approve
  const { data: ev } = await db
    .from("evidence")
    .select("assigned_moderator_id, user_id")
    .eq("id", evidenceId)
    .maybeSingle();
  if (ev?.assigned_moderator_id && ev.assigned_moderator_id !== user.id) {
    redirect(`/admin/moderation/evidence/${evidenceId}?error=${encodeURIComponent("This item is assigned to a different moderator.")}`);
  }
  // Cannot approve own submission
  if (ev?.user_id && ev.user_id === user.id) {
    redirect(`/admin/moderation/evidence/${evidenceId}?error=${encodeURIComponent("You cannot approve your own submission.")}`);
  }

  await db.from("evidence").update({ status: "approved" }).eq("id", evidenceId);

  await db.from("moderation_actions").insert({
    moderator_id: user.id,
    target_type: "evidence",
    target_id: evidenceId,
    action: "approve",
    moderator_note: note,
    source: "ui",
  });

  // Redirect somewhere that exists in prod
  redirect("/moderation/current");
}

export async function rejectEvidence(formData: FormData) {
  const user = await getAuthenticatedUserOrThrow();
  const evidenceId = String(formData.get("evidenceId"));
  const note = String(formData.get("note"));

  if (!note) throw new Error("Rejection requires a note");

  const db = supabaseService();

  // Enforce: only the assigned moderator can reject
  const { data: ev } = await db
    .from("evidence")
    .select("assigned_moderator_id, user_id")
    .eq("id", evidenceId)
    .maybeSingle();
  if (ev?.assigned_moderator_id && ev.assigned_moderator_id !== user.id) {
    redirect(`/admin/moderation/evidence/${evidenceId}?error=${encodeURIComponent("This item is assigned to a different moderator.")}`);
  }
  // Cannot reject own submission
  if (ev?.user_id && ev.user_id === user.id) {
    redirect(`/admin/moderation/evidence/${evidenceId}?error=${encodeURIComponent("You cannot reject your own submission.")}`);
  }

  await db.from("evidence").update({ status: "rejected" }).eq("id", evidenceId);

  await db.from("moderation_actions").insert({
    moderator_id: user.id,
    target_type: "evidence",
    target_id: evidenceId,
    action: "reject",
    moderator_note: note,
    source: "ui",
  });

  // Redirect somewhere that exists in prod
  redirect("/moderation/current");
}
