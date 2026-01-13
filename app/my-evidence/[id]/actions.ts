"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function resubmitEvidence(formData: FormData) {
  const supabase = await createClient();

  const previousEvidenceIdRaw = formData.get("previous_evidence_id");
  const previousEvidenceId = Number(previousEvidenceIdRaw);

  if (!Number.isFinite(previousEvidenceId)) {
    throw new Error("Invalid previous evidence id.");
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("You must be signed in.");
  }

  const { data: previous, error: prevError } = await supabase
    .from("evidence")
    .select(
      `
      id,
      status,
      entity_type,
      entity_id,
      company_id,
      company_request_id,
      leader_id,
      manager_id,
      owner_id,
      category,
      category_id,
      evidence_type
    `
    )
    .eq("id", previousEvidenceId)
    .eq("user_id", user.id)
    .single();

  if (prevError) throw new Error(prevError.message);
  if (!previous) throw new Error("Previous evidence not found.");
  if (previous.status !== "rejected") throw new Error("Only rejected evidence can be resubmitted.");

  const title = String(formData.get("title") ?? "").trim();
  const summary = String(formData.get("summary") ?? "").trim();
  const contributor_note = String(formData.get("contributor_note") ?? "").trim();

  if (!title) throw new Error("Title is required.");

  const { data: inserted, error: insertError } = await supabase
    .from("evidence")
    .insert({
      title,
      summary: summary || null,
      contributor_note: contributor_note || null,

      // keep the target identical
      entity_type: previous.entity_type,
      entity_id: previous.entity_id,
      company_id: previous.company_id,
      company_request_id: previous.company_request_id,
      leader_id: previous.leader_id,
      manager_id: previous.manager_id,
      owner_id: previous.owner_id,

      // keep classification identical (moderators can still re-route later)
      category: previous.category,
      category_id: previous.category_id,
      evidence_type: previous.evidence_type,

      user_id: user.id,
      status: "pending",
      resubmits_evidence_id: previous.id,
    })
    .select("id")
    .single();

  if (insertError) throw new Error(insertError.message);

  redirect(`/my-evidence/${inserted.id}`);
}
