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
              <a
                href={item.file_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                View file
              </a>
            </p>
          )}

          {/* Step 4A: UI only */}
          <div style={{ marginTop: "2rem" }}>
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

            <div style={{ marginTop: "1rem" }}>
              <label>
                <strong>Rejection reason (optional):</strong>
              </label>
              <textarea
                style={{
                  width: "100%",
                  height: "80px",
                  marginTop: "0.5rem",
                  padding: "0.5rem",
                }}
                placeholder="Explain why this evidence should be rejected..."
              />
            </div>
          </div>
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
