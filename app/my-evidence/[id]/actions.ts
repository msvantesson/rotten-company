"use server";

import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase-server";

export async function resubmitEvidence(formData: FormData) {
  const supabase = await supabaseServer();

  const previousId = Number(formData.get("previous_evidence_id"));

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !Number.isFinite(previousId)) {
    throw new Error("Invalid request");
  }

  const { data: previous } = await supabase
    .from("evidence")
    .select("*")
    .eq("id", previousId)
    .eq("user_id", user.id)
    .single();

  if (!previous || previous.status !== "rejected") {
    throw new Error("Only rejected evidence can be resubmitted");
  }

  const { data: inserted, error: insertError } = await supabase
    .from("evidence")
    .insert({
      title: formData.get("title"),
      summary: formData.get("summary"),
      contributor_note: formData.get("contributor_note"),
      entity_type: previous.entity_type,
      entity_id: previous.entity_id,
      company_id: previous.company_id,
      company_request_id: previous.company_request_id,
      category: previous.category,
      category_id: previous.category_id,
      evidence_type: previous.evidence_type,
      user_id: user.id,
      status: "pending",
      resubmits_evidence_id: previous.id,
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    throw new Error("Failed to create resubmitted evidence");
  }

  redirect(`/my-evidence/${inserted.id}`);
}
