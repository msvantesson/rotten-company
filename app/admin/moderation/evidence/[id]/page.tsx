import { supabaseServer } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { approveEvidence, rejectEvidence } from "@/app/moderation/actions";

type ParamsShape = { id: string };

export default async function EvidenceReviewPage(props: {
  params: ParamsShape | Promise<ParamsShape>;
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const resolvedParams =
    props.params instanceof Promise ? await props.params : props.params;

  const errorMessageRaw =
    typeof props.searchParams?.error === "string"
      ? props.searchParams.error
      : undefined;
  const errorMessage = errorMessageRaw
    ? decodeURIComponent(errorMessageRaw)
    : null;

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

  // ID parsing
  const evidenceId = parseInt(resolvedParams.id, 10);
  if (Number.isNaN(evidenceId) || evidenceId <= 0) {
    return <div>Invalid evidence ID</div>;
  }

  // Evidence + submitter email
  const { data: evidence, error } = await supabase
    .from("evidence")
    .select("*, users ( email )")
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
  const submitterEmail =
    (evidence as any).users?.email ?? "(unknown submitter)";

  // Moderation history
  const { data: events } = await supabase
    .from("moderation_events")
    .select("action, note, moderator_id, created_at")
    .eq("evidence_id", evidenceId)
    .order("created_at", { ascending: false });

  // Optional company request context
  let companyName: string | null = null;
  let companySlug: string | null = null;

  if (evidence.company_request_id) {
    const { data: companyReq, error: companyErr } = await supabase
      .from("company_requests")
      .select("company_name, slug")
      .eq("id", evidence.company_request_id)
      .maybeSingle();

    if (!companyErr && companyReq) {
      companyName = (companyReq as any).company_name ?? null;
      companySlug = (companyReq as any).slug ?? null;
    }
  }

  // Actions

  async function handleApprove(formData: FormData) {
    "use server";

    if (!isPending) {
      redirect("/moderation");
    }

    const note = formData.get("note")?.toString() ?? "";

    const fd = new FormData();
    fd.set("evidence_id", String(evidenceId));
    fd.set("moderator_note", note || "approved via admin detail page");

    const result = await approveEvidence(fd);

    if (!result.ok) {
      redirect(
        `/admin/moderation/evidence/${evidenceId}?error=${encodeURIComponent(
          result.error ?? "Unknown error",
        )}`,
      );
    }

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
    fd.set("moderator_note", note);

    const result = await rejectEvidence(fd);

    if (!result.ok) {
      redirect(
        `/admin/moderation/evidence/${evidenceId}?error=${encodeURIComponent(
          result.error ?? "Unknown error",
        )}`,
      );
    }

    redirect("/moderation");
  }

  return (
    <main style={{ padding: 32, maxWidth: 900, margin: "0 auto" }}>
      <a
        href="/moderation"
        style={{
          display: "inline-block",
          marginBottom: 12,
          fontSize: 13,
          color: "#2563eb",
        }}
      >
        ← Back to moderation queue
      </a>

      {errorMessage && (
        <section
          style={{
            marginBottom: 16,
            padding: 10,
            borderRadius: 6,
            border: "1px solid #fecaca",
            background: "#fef2f2",
            color: "#b91c1c",
            fontSize: 13,
          }}
        >
          {errorMessage}
        </section>
      )}

      <header style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 4 }}>
          Moderate Evidence #{evidence.id}
        </h1>
        <p style={{ margin: 0, fontSize: 14, color: "#555" }}>
          Submitted by <strong>{submitterEmail}</strong>{" "}
          <span style={{ color: "#9ca3af" }}>({evidence.user_id})</span> ·
          Current status: <strong>{status.toUpperCase()}</strong>
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

        {companyName && (
          <p style={{ margin: "8px 0 0", fontSize: 13 }}>
            <strong>Company:</strong>{" "}
            {companySlug ? (
              <a
                href={`/company/${companySlug}`}
                target="_blank"
                rel="noreferrer"
                style={{ color: "#2563eb" }}
              >
                {companyName}
              </a>
            ) : (
              companyName
            )}
          </p>
        )}

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

      {/* Moderation history */}
      {events && events.length > 0 && (
        <section
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            padding: 16,
            marginBottom: 24,
            background: "#ffffff",
          }}
        >
          <h2
            style={{
              fontSize: 14,
              fontWeight: 600,
              margin: "0 0 8px",
            }}
          >
            Moderation history
          </h2>
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              fontSize: 13,
            }}
          >
            {events.map((evt) => (
              <li
                key={`${evt.moderator_id}-${evt.created_at}-${evt.action}`}
                style={{ marginBottom: 6 }}
              >
                <strong>{evt.action}</strong> by{" "}
                <code>{evt.moderator_id}</code> at{" "}
                {new Date(evt.created_at as any).toLocaleString()}
                {evt.note && (
                  <>
                    {" "}
                    –{" "}
                    <span style={{ color: "#4b5563" }}>
                      {evt.note}
                    </span>
                  </>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Self-moderation notice */}
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
          This evidence was submitted by you. Moderators can never review or
          change their own submissions. Because this item is already{" "}
          <strong>{status.toLowerCase()}</strong>, its moderation decision
          cannot be changed here.
        </section>
      )}

      {/* Already moderated (for non‑self‑owned items) */}
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
              <strong>approved</strong> and send a confirmation email to the
              submitter. Any note you add will be included in the email and
              stored in the moderation log.
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
              Rejecting will mark this evidence as <strong>rejected</strong> and
              send a rejection email to the submitter. Your note is{" "}
              <strong>required</strong> and will be included in the email and
              moderation log.
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

      {/* Technical JSON */}
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
