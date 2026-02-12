import { supabaseServer } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { approveEvidence, rejectEvidence } from "@/app/moderation/actions";

type ParamsShape = { id: string };

export default async function EvidenceReviewPage(props: {
  params: ParamsShape | Promise<ParamsShape>;
}) {
  const resolvedParams =
    props.params instanceof Promise ? await props.params : props.params;

  const supabase = await supabaseServer();

  // Auth
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return null;

  const moderatorId = auth.user.id;

  // Ensure user is a moderator
  const { data: isModerator } = await supabase
    .from("moderators")
    .select("user_id")
    .eq("user_id", moderatorId)
    .maybeSingle();

  if (!isModerator) return null;

  // Parse ID
  const evidenceId = parseInt(resolvedParams.id, 10);
  if (Number.isNaN(evidenceId) || evidenceId <= 0) {
    return <div>Invalid evidence ID</div>;
  }

  // Load evidence
  const { data: evidence, error } = await supabase
    .from("evidence")
    .select("*")
    .eq("id", evidenceId)
    .maybeSingle();

  if (error) {
    console.error("[admin-evidence] evidence query failed:", error.message);
    return <div>Error loading evidence</div>;
  }

  if (!evidence) {
    return <div>Evidence not found</div>;
  }

  const status: string = evidence.status ?? "pending";
  const isPending = status === "pending";
  const isSelfOwned = evidence.user_id === moderatorId;

  // Shared moderation actions

  async function handleApprove(formData: FormData) {
    "use server";

    if (!isPending) {
      redirect("/moderation");
    }

    const note = formData.get("note")?.toString() ?? "";

    const fd = new FormData();
    fd.set("evidence_id", String(evidenceId));
    fd.set("moderator_id", moderatorId);
    fd.set("moderator_note", note || "approved via admin detail page");

    // This will:
    // - update evidence status
    // - enqueue an email to the submitter (including your note)
    await approveEvidence(fd);

    // Back to queue, where item will disappear / move
    redirect("/moderation");
  }

  async function handleReject(formData: FormData) {
    "use server";

    if (!isPending) {
      redirect("/moderation");
    }

    const note = formData.get("note")?.toString() ?? "";

    const fd = new FormData();
    fd.set("evidence_id", String(evidenceId));
    fd.set("moderator_id", moderatorId);
    fd.set("moderator_note", note);

    // This will:
    // - mark evidence as rejected
    // - enqueue a rejection email including your note
    await rejectEvidence(fd);

    redirect("/moderation");
  }

  return (
    <main style={{ padding: 32, maxWidth: 900, margin: "0 auto" }}>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 4 }}>
          Moderate Evidence #{evidence.id}
        </h1>
        <p style={{ margin: 0, fontSize: 14, color: "#555" }}>
          Submitted by <code>{evidence.user_id}</code> · Current status:{" "}
          <strong>{status.toUpperCase()}</strong>
        </p>
      </header>

      {/* Summary card */}
      <section
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 8,
          padding: 16,
          marginBottom: 24,
          background: "#f9fafb",
        }}
      >
        <p style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 600 }}>
          {evidence.title || "Untitled evidence"}
        </p>
        <p style={{ margin: 0, fontSize: 13, color: "#6b7280" }}>
          ID: {evidence.id} · Created at:{" "}
          {new Date(evidence.created_at).toLocaleString()}
        </p>

        {evidence.file_url && (
          <p style={{ marginTop: 8, fontSize: 13 }}>
            <strong>File:</strong>{" "}
            <a
              href={evidence.file_url}
              target="_blank"
              rel="noreferrer"
              style={{ color: "#2563eb" }}
            >
              View uploaded file
            </a>
          </p>
        )}
      </section>

      {/* Self-moderation warning */}
      {isSelfOwned && (
        <section
          style={{
            marginBottom: 24,
            padding: 12,
            borderRadius: 6,
            border: "1px solid #fecaca",
            background: "#fef2f2",
            color: "#b91c1c",
            fontSize: 13,
          }}
        >
          You submitted this evidence, so you cannot moderate it. Another
          moderator must review this item.
        </section>
      )}

      {/* Already moderated */}
      {!isPending && !isSelfOwned && (
        <section
          style={{
            marginBottom: 24,
            padding: 12,
            borderRadius: 6,
            border: "1px solid #d4d4d4",
            background: "#f9fafb",
            fontSize: 13,
          }}
        >
          This evidence has already been{" "}
          <strong>{status.toLowerCase()}</strong>. No further moderation
          actions are available here.
        </section>
      )}

      {/* Actions */}
      {isPending && !isSelfOwned && (
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 24,
            marginBottom: 32,
          }}
        >
          {/* Approve */}
          <div
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              padding: 16,
            }}
          >
            <h2
              style={{
                fontSize: 16,
                fontWeight: 600,
                marginBottom: 8,
              }}
            >
              Approve
            </h2>
            <p style={{ fontSize: 13, color: "#4b5563", marginBottom: 8 }}>
              Approving will mark this evidence as{" "}
              <strong>approved</strong> and send a confirmation email to
              the submitter. Any note you add will be included in the email
              and stored in the moderation log.
            </p>
            <form action={handleApprove} style={{ display: "grid", gap: 8 }}>
              <label style={{ fontSize: 13 }}>
                Approval note (optional)
                <textarea
                  name="note"
                  placeholder="(Optional) Short note to include in the approval email"
                  style={{
                    width: "100%",
                    minHeight: 70,
                    display: "block",
                    marginTop: 4,
                  }}
                />
              </label>
              <button
                type="submit"
                style={{
                  marginTop: 4,
                  padding: "6px 12px",
                  fontSize: 14,
                  borderRadius: 4,
                  border: "none",
                  background: "#16a34a",
                  color: "white",
                  cursor: "pointer",
                }}
              >
                Approve and send email
              </button>
            </form>
          </div>

          {/* Reject */}
          <div
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              padding: 16,
            }}
          >
            <h2
              style={{
                fontSize: 16,
                fontWeight: 600,
                marginBottom: 8,
              }}
            >
              Reject
            </h2>
            <p style={{ fontSize: 13, color: "#4b5563", marginBottom: 8 }}>
              Rejecting will mark this evidence as{" "}
              <strong>rejected</strong> and send a rejection email to the
              submitter. Your note is <strong>required</strong> and will be
              included in the email and moderation log.
            </p>
            <form action={handleReject} style={{ display: "grid", gap: 8 }}>
              <label style={{ fontSize: 13 }}>
                Rejection reason (required)
                <textarea
                  name="note"
                  placeholder="Explain briefly why this evidence is being rejected. This text will be sent to the submitter."
                  required
                  style={{
                    width: "100%",
                    minHeight: 90,
                    display: "block",
                    marginTop: 4,
                  }}
                />
              </label>
              <button
                type="submit"
                style={{
                  marginTop: 4,
                  padding: "6px 12px",
                  fontSize: 14,
                  borderRadius: 4,
                  border: "none",
                  background: "#dc2626",
                  color: "white",
                  cursor: "pointer",
                }}
              >
                Reject and send email
              </button>
            </form>
          </div>
        </section>
      )}

      {/* Optional: technical JSON at the bottom instead of dominating the page */}
      <details>
        <summary style={{ cursor: "pointer", fontSize: 13 }}>
          Show technical details (raw JSON)
        </summary>
        <pre
          style={{
            background: "#111",
            color: "#0f0",
            padding: 16,
            overflowX: "auto",
            marginTop: 8,
            borderRadius: 4,
          }}
        >
          {JSON.stringify(evidence, null, 2)}
        </pre>
      </details>
    </main>
  );
}
