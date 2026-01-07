export const dynamic = "force-dynamic";
export const revalidate = 0;

import { supabase } from "@/lib/supabaseClient";
import { revalidatePath } from "next/cache";

export default async function ModerationPage() {
  // -----------------------------
  // SERVER ACTION: APPROVE
  // -----------------------------
  async function approveEvidence(formData: FormData) {
    "use server";

    const evidenceId = formData.get("evidenceId");
    const categoryId = formData.get("categoryId");
    const severity = formData.get("severity");
    const managerName = formData.get("managerName");
    const managerReports = formData.get("managerReports");
    const entityType = formData.get("entityType");
    const entityId = formData.get("entityId");

    if (typeof evidenceId !== "string") return;

    // Insert moderation vote
    await supabase.from("moderation_votes").insert({
      evidence_id: evidenceId,
      vote: true,
      reason: null,
    });

    // Update evidence with moderator decisions
    await supabase
      .from("evidence")
      .update({
        status: "approved",
        category_id: categoryId ? Number(categoryId) : null,
        severity: severity ? Number(severity) : null,
        manager_name: managerName || null,
        manager_report_count: managerReports
          ? Number(managerReports)
          : null,
        entity_type: entityType || null,
        entity_id: entityId ? Number(entityId) : null,
      })
      .eq("id", evidenceId);

    revalidatePath("/moderation");
  }

  // -----------------------------
  // SERVER ACTION: REJECT
  // -----------------------------
  async function rejectEvidence(formData: FormData) {
    "use server";

    const evidenceId = formData.get("evidenceId");
    const reason = formData.get("reason");

    if (typeof evidenceId !== "string") return;

    await supabase.from("moderation_votes").insert({
      evidence_id: evidenceId,
      vote: false,
      reason: typeof reason === "string" ? reason : null,
    });

    await supabase
      .from("evidence")
      .update({ status: "rejected" })
      .eq("id", evidenceId);

    revalidatePath("/moderation");
  }

  // -----------------------------
  // FETCH PENDING EVIDENCE
  // -----------------------------
  const { data: pendingEvidence } = await supabase
    .from("evidence")
    .select("*")
    .eq("status", "pending");

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, base_weight")
    .order("name");

  // Pick a deterministic item instead of random to maintain React purity
  // Using the first item is simpler and more predictable for moderation
  const item =
    pendingEvidence && pendingEvidence.length > 0
      ? pendingEvidence[0]
      : null;

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Moderation Dashboard</h1>

      <p>Pending evidence count: {pendingEvidence?.length ?? 0}</p>

      {!item && (
        <div style={{ marginTop: "2rem", fontStyle: "italic", color: "#666" }}>
          No pending evidence to moderate.
        </div>
      )}

      {item && (
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
            <strong>Evidence Type:</strong> {item.evidence_type}
          </p>

          <p>
            <strong>Entity:</strong> {item.entity_type} #{item.entity_id}
          </p>

          <p>
            <strong>Submitted:</strong>{" "}
            {new Date(item.created_at).toLocaleString()}
          </p>

          {item.file_url && (
            <p>
              <strong>File:</strong>{" "}
              <a href={item.file_url} target="_blank">
                View file
              </a>
            </p>
          )}

          {/* -----------------------------
              CATEGORY + SEVERITY
          ------------------------------ */}
          <form action={approveEvidence} style={{ marginTop: "1rem" }}>
            <input type="hidden" name="evidenceId" value={item.id} />

            {/* Category */}
            <label>
              <strong>Category:</strong>
            </label>
            <select
              name="categoryId"
              defaultValue=""
              style={{ display: "block", marginBottom: "1rem" }}
            >
              <option value="">Select category</option>
              {categories?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Severity */}
            <label>
              <strong>Severity (1–5):</strong>
            </label>
            <input
              type="range"
              name="severity"
              min="1"
              max="5"
              defaultValue={3}
              style={{ width: "100%", marginBottom: "1rem" }}
            />

            {/* -----------------------------
                MANAGER METADATA
            ------------------------------ */}
            <label>
              <strong>Manager Name (optional):</strong>
            </label>
            <input
              type="text"
              name="managerName"
              defaultValue={item.manager_name || ""}
              style={{ width: "100%", marginBottom: "1rem" }}
            />

            <label>
              <strong>Manager Report Count (optional):</strong>
            </label>
            <input
              type="number"
              name="managerReports"
              defaultValue={item.manager_report_count || ""}
              style={{ width: "100%", marginBottom: "1rem" }}
            />

            {/* -----------------------------
                ENTITY CORRECTION
            ------------------------------ */}
            <label>
              <strong>Entity Type:</strong>
            </label>
            <select
              name="entityType"
              defaultValue={item.entity_type}
              style={{ display: "block", marginBottom: "1rem" }}
            >
              <option value="company">Company</option>
              <option value="leader">Leader</option>
              <option value="owner">Owner</option>
            </select>

            <label>
              <strong>Entity ID:</strong>
            </label>
            <input
              type="number"
              name="entityId"
              defaultValue={item.entity_id}
              style={{ width: "100%", marginBottom: "1rem" }}
            />

            {/* -----------------------------
                APPROVE BUTTON
            ------------------------------ */}
            <button
              style={{
                padding: "0.5rem 1rem",
                background: "#4caf50",
                color: "white",
                border: "none",
                cursor: "pointer",
              }}
            >
              Approve
            </button>
          </form>

          {/* -----------------------------
              REJECT FORM
          ------------------------------ */}
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
      )}
    </div>
  );
}
