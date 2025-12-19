import { supabase } from "@/lib/supabaseClient";

export default async function ModerationPage() {
  const { data: pendingEvidence, error } = await supabase
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

      {hasEvidence ? (
        <div style={{ marginTop: "2rem", padding: "1rem", border: "1px solid #ccc" }}>
          <h2>{item.title}</h2>
          <p><strong>Summary:</strong> {item.summary}</p>
          <p><strong>Entity Type:</strong> {item.entity_type}</p>
          <p><strong>Entity ID:</strong> {item.entity_id}</p>
          <p><strong>Submitted:</strong> {new Date(item.created_at).toLocaleString()}</p>
          {item.file_url && (
            <p>
              <strong>File:</strong>{" "}
              <a href={item.file_url} target="_blank" rel="noopener noreferrer">
                View file
              </a>
            </p>
          )}
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
