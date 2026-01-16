// app/my-evidence/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase-server";

/**
 * Server action to resubmit corrected evidence.
 * Adjust validation and DB fields to match your real schema.
 */
export async function resubmitEvidence(formData: FormData) {
  // Basic extraction and validation
  const previousId = Number(formData.get("previous_evidence_id"));
  const title = String(formData.get("title") ?? "").trim();
  const summary = String(formData.get("summary") ?? "").trim();
  const contributor_note = String(formData.get("contributor_note") ?? "").trim();

  if (!Number.isFinite(previousId) || !title) {
    throw new Error("Invalid input");
  }

  const supabase = await supabaseServer();

  // Insert a new evidence row copying relevant fields from previous
  const { data: inserted, error: insertError } = await supabase
    .from("evidence")
    .insert({
      title,
      summary,
      contributor_note,
      // copy or set other required fields as appropriate
      status: "pending",
      // If you want to link to the previous record:
      resubmits_evidence_id: previousId,
    })
    .select()
    .single();

  if (insertError) {
    console.error("[resubmitEvidence] insert error:", insertError);
    throw new Error("Failed to create resubmission");
  }

  // Optionally revalidate a path or trigger cache invalidation
  try {
    revalidatePath("/my-evidence");
  } catch (e) {
    // ignore if not configured
  }

  return { success: true, evidence: inserted };
}
