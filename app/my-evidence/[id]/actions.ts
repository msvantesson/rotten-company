"use server";

import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase-server";
import {
  buildResubmittedEvidenceInsertPayload,
  type PreviousEvidenceRow,
} from "@/lib/build-resubmitted-evidence";

export async function resubmitEvidence(formData: FormData) {
  const supabase = await supabaseServer();

  const previousId = Number(formData.get("previous_evidence_id"));

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !Number.isFinite(previousId)) {
    throw new Error("Invalid request");
  }

  // Ensure user exists in "users" table (prevents FK violation on evidence insert)
  await supabase.from("users").upsert(
    {
      id: user.id,
      email: user.email,
      name: user.user_metadata?.full_name ?? null,
      avatar_url: user.user_metadata?.avatar_url ?? null,
      moderation_credits: 0,
    },
    { onConflict: "id" },
  );

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
    .insert(
      buildResubmittedEvidenceInsertPayload(
        previous as PreviousEvidenceRow,
        formData,
        user.id,
      ),
    )
    .select("id")
    .single();

  if (insertError || !inserted) {
    throw new Error("Failed to create resubmitted evidence");
  }

  redirect(`/my-evidence/${inserted.id}`);
}
