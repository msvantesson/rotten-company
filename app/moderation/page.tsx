export const dynamic = "force-dynamic";

import { supabase } from "@/lib/supabaseClient";
import { revalidatePath } from "next/cache";

export default async function ModerationPage() {
  // ✅ Server actions (Option A: immediate refresh)
  async function approveEvidence(formData: FormData) {
    "use server";

    const evidenceId = formData.get("evidenceId");
    if (typeof evidenceId !== "string") return;

    // Insert moderation vote
    const { error: voteError } = await supabase.from("moderation_votes").insert({
      evidence_id: evidenceId,
      vote: true, // boolean, matches schema
      reason: null,
    });

    if (voteError) {
      console.error("approveEvidence: vote insert error", voteError);
      return;
    }

    // Update evidence status
    const { error: updateError } = await supabase
      .from("evidence")
      .update({ status: "approved" })
      .eq("id", evidenceId);

    if (updateError) {
      console.error("approveEvidence: evidence update error", updateError);
      return;
    }

    revalidatePath("/moderation");
  }

  async function rejectEvidence(formData: FormData) {
    "use server";

    const evidenceId = formData.get("evidenceId");
    const reason = formData.get("reason");
    if (typeof evidenceId !== "string") return;

    const { error: voteError } = await supabase.from("moderation_votes").insert({
      evidence_id: evidenceId,
      vote: false, // boolean, matches schema
      reason: typeof reason === "string" ? reason : null,
    });

    if (voteError) {
      console.error("rejectEvidence: vote insert error", voteError);
      return;
    }

    const { error: updateError } = await supabase
      .from("evidence")
      .update({ status: "rejected" })
      .eq("id", evidenceId);

    if (updateError) {
      console.error("rejectEvidence: evidence update error", updateError);
      return;
    }

    revalidatePath("/moderation");
  }

  // ✅ Fetch pending evidence (now on every request, not at build time)
  const { data: pendingEvidence, error } = await supabase
    .from("evidence")
    .select("*")
    .eq("status", "pending");

  console.log("MODERATION: raw pendingEvidence", pendingEvidence);
  console.log("MODERATION: error", error);

  const hasEvidence = pendingEvidence && pendingEvidence.length > 0;

  const item = hasEvidence
    ? pendingEvidence[Math.floor(Math.random() * pendingEvidence.length)]
    : null;

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Moderation</h1>

      {error && (
        <div
          style={{
            marginTop: "1rem",
            padding: "0.5rem",
            background: "#ffe5e5",
            color: "#900",
            border: "1px solid #f99",
          }}
        >
          <strong>Error loading pending evidence:</strong> {error.message}
        </div>
      )}

      <p>Pending evidence count: {pendingEvidence?.length ?? 0}</p>

      {hasEvidence && item ? (
        <div
          style={{
            marginTop: "2rem",
            padding: "1rem",
            border: "1px solid #ccc",
          }}
        >
          <h2>{item.title}</h2>
          <p>
            <strong>Summary:</strong> {item.summary}
          </p>
          <p>
            <strong>Entity Type:</strong> {item.entity_type}
          </p>
          <p>
