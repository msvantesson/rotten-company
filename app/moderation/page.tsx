import { supabaseServer } from "@/lib/supabase-server";
import { approveEvidence, rejectEvidence } from "./actions";

export const fetchCache = "force-no-store";

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

  if (error) {
    return (
      <main style={{ padding: "2rem", maxWidth: 1000 }}>
        <h1>Moderation Dashboard</h1>
        <p style={{ color: "red" }}>Error loading moderation queue</p>
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
        <p style={{ opacity: 0.6 }}>No pending evidence to moderate.</p>
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
              {e.companies?.[0]?.
