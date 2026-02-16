import { getSsrUser } from "@/lib/get-ssr-user";
import { supabaseService } from "@/lib/supabase-service";
import { redirect } from "next/navigation";
import { approveEvidence, rejectEvidence } from "@/app/moderation/actions";

type ParamsShape = { id: string };

export default async function UnifiedModerationPage(props: {
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

  // Use defensive SSR auth
  const user = await getSsrUser();
  if (!user?.id) {
    return (
      <main style={{ padding: 32, maxWidth: 900, margin: "0 auto" }}>
        <p>You must be signed in to access moderation.</p>
      </main>
    );
  }

  const moderatorId = user.id;
  const supabase = supabaseService();

  // Ensure user is a moderator
  const { data: isModerator } = await supabase
    .from("moderators")
    .select("user_id")
    .eq("user_id", moderatorId)
    .maybeSingle();

  if (!isModerator) {
    return (
      <main style={{ padding: 32, maxWidth: 900, margin: "0 auto" }}>
        <p>You do not have moderator access.</p>
      </main>
    );
  }

  // ID parsing
  const itemId = parseInt(resolvedParams.id, 10);
  if (Number.isNaN(itemId) || itemId <= 0) {
    return <div>Invalid ID</div>;
  }

  // Try to fetch as evidence first
  const { data: evidence, error: evidenceError } = await supabase
    .from("evidence")
    .select("*, users ( email )")
    .eq("id", itemId)
    .maybeSingle();

  // If evidence exists, render evidence moderation UI
  if (evidence) {
    return renderEvidenceModeration({
      evidence,
      moderatorId,
      errorMessage,
    });
  }

  // If no evidence, try to fetch as company_request
  const { data: companyRequest, error: companyError } = await supabase
    .from("company_requests")
    .select("*, users ( email )")
    .eq("id", itemId)
    .maybeSingle();

  if (companyRequest) {
    return renderCompanyRequestModeration({
      companyRequest,
      moderatorId,
      errorMessage,
    });
  }

  // Neither found
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
      <div>Item not found (ID: {itemId})</div>
    </main>
  );
}

/* ──────────────────────────────────────────────
   Evidence Moderation UI
────────────────────────────────────────────── */

function renderEvidenceModeration({
  evidence,
  moderatorId,
  errorMessage,
}: {
  evidence: any;
  moderatorId: string;
  errorMessage: string | null;
}) {
  const status: string = evidence.status ?? "pending";
  const isPending = status === "pending";
  const isSelfOwned = evidence.user_id === moderatorId;
  const submitterEmail =
    evidence.users?.email ?? "(unknown submitter)";

  // Server actions for evidence
  async function handleApprove(formData: FormData) {
    "use server";

    const evidenceId = evidence.id;

    if (!isPending) {
      redirect("/moderation");
    }

    const note = formData.get("note")?.toString() ?? "";

    const fd = new FormData();
    fd.set("evidence_id", String(evidenceId));
    fd.set("moderator_id", moderatorId);
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

    const evidenceId = evidence.id;

    if (!isPending) {
      redirect("/moderation");
    }

    const note = formData.get("note")?.toString() ?? "";

    const fd = new FormData();
    fd.set("evidence_id", String(evidenceId));
    fd.set("moderator_id", moderatorId);
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

      {/* Company panel if evidence has company_id */}
      {evidence.company_id && <CompanyPanel companyId={evidence.company_id} itemId={evidence.id} />}

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

/* ──────────────────────────────────────────────
   Company Request Moderation UI
────────────────────────────────────────────── */

function renderCompanyRequestModeration({
  companyRequest,
  moderatorId,
  errorMessage,
}: {
  companyRequest: any;
  moderatorId: string;
  errorMessage: string | null;
}) {
  const status: string = companyRequest.status ?? "pending";
  const isPending = status === "pending";
  const isSelfOwned = companyRequest.user_id === moderatorId;
  const submitterEmail = companyRequest.users?.email ?? "(unknown submitter)";

  // Server actions for company requests
  async function handleApproveCompany(formData: FormData) {
    "use server";

    const requestId = companyRequest.id;

    if (!isPending) {
      redirect("/moderation");
    }

    const note = formData.get("note")?.toString() ?? "";

    // Call the approve API
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace("/rest/v1", "") || ""}/api/moderation/company-requests/approve`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: requestId,
          moderator_note: note || null,
        }),
      },
    );

    if (!res.ok) {
      const error = await res.text();
      redirect(
        `/admin/moderation/evidence/${requestId}?error=${encodeURIComponent(error || "Approval failed")}`,
      );
    }

    redirect("/moderation");
  }

  async function handleRejectCompany(formData: FormData) {
    "use server";

    const requestId = companyRequest.id;

    if (!isPending) {
      redirect("/moderation");
    }

    const note = formData.get("note")?.toString() ?? "";

    if (!note.trim()) {
      redirect(
        `/admin/moderation/evidence/${requestId}?error=${encodeURIComponent("Rejection reason is required")}`,
      );
      return;
    }

    // Call the reject API
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace("/rest/v1", "") || ""}/api/moderation/company-requests/reject`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: requestId,
          moderator_note: note,
        }),
      },
    );

    if (!res.ok) {
      const error = await res.text();
      redirect(
        `/admin/moderation/evidence/${requestId}?error=${encodeURIComponent(error || "Rejection failed")}`,
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
          Moderate Company Request #{companyRequest.id}
        </h1>
        <p style={{ margin: 0, fontSize: 14, color: "#555" }}>
          Submitted by <strong>{submitterEmail}</strong>{" "}
          <span style={{ color: "#9ca3af" }}>({companyRequest.user_id})</span> ·
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
          {companyRequest.name || "Untitled company"}
        </p>
        <p style={{ margin: 0, fontSize: 13, color: "#6b7280" }}>
          ID: {companyRequest.id} · Created at:{" "}
          {new Date(companyRequest.created_at).toLocaleString()}
        </p>

        {companyRequest.country && (
          <p style={{ margin: "8px 0 0", fontSize: 13 }}>
            <strong>Country:</strong> {companyRequest.country}
          </p>
        )}

        {companyRequest.website && (
          <p style={{ marginTop: 8, fontSize: 13 }}>
            <strong>Website:</strong>{" "}
            <a
              href={companyRequest.website}
              target="_blank"
              rel="noreferrer"
              style={{ color: "#2563eb" }}
            >
              {companyRequest.website}
            </a>
          </p>
        )}

        {companyRequest.description && (
          <p style={{ marginTop: 8, fontSize: 13 }}>
            <strong>Description:</strong> {companyRequest.description}
          </p>
        )}
      </section>

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
          This company request was submitted by you. Moderators can never review or
          change their own submissions.
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
          This company request has already been{" "}
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
              Approving will create a new company and mark this request as{" "}
              <strong>approved</strong>. A confirmation email will be sent to the
              submitter.
            </p>
            <form action={handleApproveCompany} style={{ display: "grid", gap: 8 }}>
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
                Approve and create company
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
              Rejecting will mark this request as <strong>rejected</strong> and
              send a rejection email to the submitter. Your note is{" "}
              <strong>required</strong> and will be included in the email.
            </p>
            <form action={handleRejectCompany} style={{ display: "grid", gap: 8 }}>
              <label style={{ fontSize: 13 }}>
                Rejection reason (required)
                <textarea
                  name="note"
                  placeholder="Explain briefly why this company request is being rejected. This text will be sent to the submitter."
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
          {JSON.stringify(companyRequest, null, 2)}
        </pre>
      </details>
    </main>
  );
}

/* ──────────────────────────────────────────────
   Company Panel (for evidence with company_id)
────────────────────────────────────────────── */

async function CompanyPanel({ companyId, itemId }: { companyId: number; itemId: number }) {
  const supabase = supabaseService();

  const { data: company } = await supabase
    .from("companies")
    .select("id, name, slug")
    .eq("id", companyId)
    .maybeSingle();

  if (!company) return null;

  return (
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
        Related Company
      </h2>
      <p style={{ fontSize: 13, marginBottom: 8 }}>
        <strong>Company:</strong>{" "}
        <a
          href={`/company/${company.slug}`}
          target="_blank"
          rel="noreferrer"
          style={{ color: "#2563eb" }}
        >
          {company.name}
        </a>
      </p>
      <p style={{ fontSize: 13 }}>
        <a
          href={`#company-${companyId}`}
          style={{ color: "#2563eb" }}
        >
          View company moderation section below
        </a>
      </p>
    </section>
  );
}
