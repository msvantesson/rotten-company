export const dynamic = "force-dynamic";
export const dynamicParams = true;
export const fetchCache = "force-no-store";

import { supabaseServer } from "@/lib/supabase-server";
import { approveEvidence, rejectEvidence } from "./actions";

export default async function ModerationPage() {
  const supabase = await supabaseServer();

  const { data: evidence, error } = await supabase
    .from("evidence")
    .select(`
      id,
      title,
      summary,
      contributor_note,
      created_at,
      companies ( name ),
      company_requests ( name ),
      users ( email )
    `)
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (error || !evidence) {
    return (
      <main style={{ padding: "2rem", maxWidth: 1000 }}>
        <h1>Moderation Dashboard</h1>
        <p style={{ color: "red" }}>Error loading moderation queue.</p>
      </main>
    );
  }

  return (
    <main style={{ padding: "2rem", maxWidth: 1000 }}>
      <h1>Moderation Dashboard</h1>

      <p style={{ opacity: 0.6 }}>
        Pending evidence count: {evidence.length}
      </p>

      {evidence.length === 0 && (
        <p style={{ opacity: 0.6 }}>
          No pending evidence to moderate.
        </p>
      )}

      {evidence.map((e) => (
        <section
          key={e.id}
          style={{
            border: "1px solid #ddd",
            borderRadius: 8,
            padding: "1.5rem",
            marginBottom: "2rem",
          }}
        >
          <header style={{ marginBottom: "1rem" }}>
            <strong>{e.title}</strong>

            <div style={{ opacity: 0.7 }}>
              Target:{" "}
              {e.companies?.[0]?.name ||
                e.company_requests?.[0]?.name ||
                "Unknown"}
            </div>

            <div style={{ fontSize: 12, opacity: 0.5 }}>
              Submitted by {e.users?.[0]?.email || "Unknown"} ·{" "}
              {e.created_at
                ? new Date(e.created_at).toLocaleString()
                : "Unknown date"}
            </div>
          </header>

          {/* PUBLIC SUMMARY */}
          {e.summary && (
            <p>
              <strong>Submitter summary (public if approved):</strong>{" "}
              {e.summary}
            </p>
          )}

          {/* PRIVATE CONTRIBUTOR NOTE */}
          {e.contributor_note && (
            <div
              style={{
                marginTop: "0.75rem",
                padding: "0.75rem",
                background: "#f9fafb",
                borderLeft: "4px solid #e5e7eb",
                fontSize: "0.9rem",
              }}
            >
              <strong>
                Submitter note 
