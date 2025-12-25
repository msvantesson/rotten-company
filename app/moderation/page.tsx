export const dynamic = "force-dynamic";
export const revalidate = 0;

import { supabase } from "@/lib/supabaseClient";
import { revalidatePath } from "next/cache";

export default async function ModerationPage() {
  // ✅ Approve action
  async function approveEvidence(formData: FormData) {
    "use server";

    const evidenceId = formData.get("evidenceId");
    if (typeof evidenceId !== "string") return;

    const { error: voteError } = await supabase.from("moderation_votes").insert({
      evidence_id: evidenceId,
      vote: true,
      reason: null,
    });

    if (voteError) {
      console.error("approveEvidence: vote insert error", voteError);
      return;
    }

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

  // ✅ Reject action
  async function rejectEvidence(formData: FormData) {
    "use server";

    const evidenceId = formData.get("evidenceId");
    const reason = formData.get("reason");
    if (typeof evidenceId !== "string") return;

    const { error: voteError } = await supabase.from("moderation_votes").insert({
      evidence_id: evidenceId,
      vote: false,
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

  // ✅ Fetch pending evidence
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

          {/* ✅ NEW: Evidence Type */}
          <p>
            <strong>Evidence Type:</strong> {item.evidence_type}
          </p>

          <p>
            <strong>Entity Type:</strong> {item.entity_type}
          </p>

          <p>
            <strong>Entity ID:</strong> {item.entity_id}
          </p>

          <p>
            <strong>Submitted:</strong>{" "}
            {new Date(item.created_at).toLocaleString()}
          </p>

          {item.file_url && (
            <p>
              <strong>File:</strong>{" "}
              <a href={item.file_url} target="_blank" rel="noopener noreferrer">
                View file
              </a>
            </p>
          )}

          {/* ✅ Approve */}
          <form action={approveEvidence} style={{ marginTop: "1rem" }}>
            <input type="hidden" name="evidenceId" value={item.id} />
            <button
              style={{
                padding: "0.5rem 1rem",
                marginRight: "1rem",
                background: "#4caf50",
                color: "white",
                border: "none",
                cursor: "pointer",
              }}
            >
              Approve
            </button>
          </form>

          {/* ✅ Reject */}
          <form action={rejectEvidence} style={{ marginTop: "1rem" }}>
            <input type="hidden" name="evidenceId" value={item.id} />

            <textarea
              name="reason"
              placeholder="Rejection reason (optional)"
              style={{
                width: "100%",
                height: "80px",
                marginBottom: "0.5rem",
                padding: "0.5rem",
              }}
            />

            <button
              style={{
                padding: "0.5rem 1rem",
                background: "#f44336",
                color: "white",
                border: "none",
                cursor: "pointer",
              }}
            >
              Reject
            </button>
          </form>
        </div>
      ) : (
        <div style={{ marginTop: "2rem", fontStyle: "italic", color: "#666" }}>
          No pending evidence to moderate. You're all caught up.
        </div>
      )}

      <pre style={{ background: "#eee", padding: "1rem", marginTop: "2rem" }}>
        {JSON.stringify(pendingEvidence, null, 2)}
      </pre>
    </div>
  );
}
