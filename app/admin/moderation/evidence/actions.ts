"use server";

import { supabaseService } from "@/lib/supabase-service";
import { supabaseServer } from "@/lib/supabase-server";
import { redirect } from "next/navigation";

async function requireAdminOrThrow() {
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) throw new Error("Not authenticated");

  const { data: mod } = await supabase
    .from("moderators")
    .select("user_id")
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (!mod) throw new Error("Not authorized");

  return auth.user;
}

export async function approveEvidence(formData: FormData) {
  const user = await requireAdminOrThrow();
  const evidenceId = String(formData.get("evidenceId"));
  const note = String(formData.get("note") || "");

  const db = supabaseService();

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
  const user = await requireAdminOrThrow();
  const evidenceId = String(formData.get("evidenceId"));
  const note = String(formData.get("note"));

  if (!note) throw new Error("Rejection requires a note");

  const db = supabaseService();

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
