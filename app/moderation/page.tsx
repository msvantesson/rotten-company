import { supabase } from "@/lib/supabaseClient";
import { revalidatePath } from "next/cache";

export default async function ModerationPage() {
  // ✅ Server actions (Option A: immediate refresh)
  async function approveEvidence(formData: FormData) {
    "use server";

    const evidenceId = formData.get("evidenceId");
    if (typeof evidenceId !== "string") return;

    // Insert moderation vote
    await supabase.from("moderation_votes").insert({
      evidence_id: evidenceId,
      vote: "approved",
      reason: null,
    });

    // Update evidence status
    await supabase
      .from("evidence")
      .update({ status: "approved" })
      .eq("id", evidenceId);

    revalidatePath("/moderation");
  }

  async function rejectEvidence(formData: FormData) {
    "use server";

    const evidenceId = formData.get("evidenceId");
    const reason = formData.get("reason");
    if (typeof evidenceId !== "string") return;

    await supabase.from("moderation_votes").insert({
      evidence_id: evidenceId,
      vote: "rejected",
      reason: typeof reason === "string" ? reason : null,
    });

    await supabase
      .from("evidence")
      .update({ status: "rejected" })
      .eq("id", evidenceId);

    revalidatePath("/moderation");
  }

  // ✅ Fetch pending evidence
  const { data: pendingEvidence } = await supabase
    .from("evidence")
    .select("*")
    .eq("status", "pending");

  const hasEvidence = pendingEvidence && pendingEvidence.length > 0;

  const item = hasEvidence
    ? pendingEvidence[Math.floor(Math.random() * pendingEvidence.length)]
    : null;

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Moderation</h1>
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
