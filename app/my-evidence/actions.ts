// app/my-evidence/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase-server";

export async function resubmitEvidence(formData: FormData): Promise<void> {
  const previousId = Number(formData.get("previous_evidence_id"));
  const title = String(formData.get("title") ?? "").trim();
  const summary = String(formData.get("summary") ?? "").trim();
  const contributor_note = String(formData.get("contributor_note") ?? "").trim();

  if (!Number.isFinite(previousId) || !title) {
    console.error("[resubmitEvidence] invalid input", { previousId, title });
    throw new Error("Invalid input");
  }

  const supabase = await supabaseServer();

  const { data: inserted, error: insertError } = await supabase
    .from("evidence")
    .insert({
      title,
      summary,
      contributor_note,
      status: "pending",
      resubmits_evidence_id: previousId,
    })
    .select()
    .single();

  if (insertError) {
    console.error("[resubmitEvidence] insert error:", insertError);
    throw new Error("Failed to create resubmission");
  }

  // Log the inserted id for debugging in Vercel logs
  console.info("[resubmitEvidence] inserted evidence id:", inserted?.id ?? null);

  // Optionally revalidate the listing page so new submission appears
  try {
    revalidatePath("/my-evidence");
  } catch (e) {
    console.warn("[resubmitEvidence] revalidatePath failed", e);
  }

  // IMPORTANT: do not return a value — form action must return void
}
