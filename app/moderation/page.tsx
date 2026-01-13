export const dynamic = "force-dynamic";
export const revalidate = 0;

import { supabaseServer } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

export default async function ModerationPage() {
  const supabase = await supabaseServer();

  // -----------------------------
  // SERVER ACTION: APPROVE
  // -----------------------------
  async function approveEvidence(formData: FormData) {
    "use server";

    const supabase = await supabaseServer();

    const evidenceId = formData.get("evidenceId");
    const categoryId = formData.get("categoryId");
    const severity = formData.get("severity");
    const managerName = formData.get("managerName");
    const managerReports = formData.get("managerReports");
    const entityType = formData.get("entityType");
    const entityId = formData.get("entityId");

    if (typeof evidenceId !== "string") return;

    await supabase.from("moderation_votes").insert({
      evidence_id: evidenceId,
      vote: true,
      reason: null,
    });

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

    const supabase = await supabaseServer();

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

  const item =
    pendingEvidence && pendingEvidence.length > 0
      ? pendingEvidence[Math.floor(Math.random() * pendingEvidence.length)]
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
          {/* your UI unchanged */}
        </div>
      )}
    </div>
  );
}
