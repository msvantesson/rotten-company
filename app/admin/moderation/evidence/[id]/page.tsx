import { supabaseServer } from "@/lib/supabase-server";
import {
  approveEvidence,
  rejectEvidence,
} from "@/app/admin/moderation/evidence/actions";

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
  const submitterEmail = (evidence as any).users?.email ?? "(unknown submitter)";

  // Moderation history
  const { data: events } = await supabase
    .from("moderation_events")
    .select("action, note, moderator_id, created_at")
    .eq("evidence_id", evidenceId)
    .order("created_at", { ascending: false });

  // Company context (either a company request or an approved company)
  let companyName: string | null = null;
  let companySlug: string | null = null;
  let companyCountry: string | null = null;
  let companyIndustry: string | null = null;

  // 1) Company request context (if evidence was submitted against a requested company)
  if (evidence.company_request_id) {
    const { data: companyReq, error: companyErr } = await supabase
      .from("company_requests")
      // If your table doesn't have country/industry, remove them here.
      .select("name, slug, country, industry")
      .eq("id", evidence.company_request_id)
      .maybeSingle();

    if (!companyErr && companyReq) {
      companyName = (companyReq as any).name ?? null;
      companySlug = (companyReq as any).slug ?? null;
      companyCountry = (companyReq as any).country ?? null;
      companyIndustry = (companyReq as any).industry ?? null;
    }
  }

  // 2) Approved company context (if evidence is linked to a real company)
  if (!companyName) {
    const linkedCompanyId =
      (evidence.entity_type === "company" ? evidence.entity_id : null) ??
      evidence.company_id ??
      null;

    if (linkedCompanyId) {
      const { data: c, error: cErr } = await supabase
        .from("companies")
        .select("name, slug, country, industry")
        .eq("id", linkedCompanyId)
        .maybeSingle();

      if (!cErr && c) {
        companyName = (c as any).name ?? null;
        companySlug = (c as any).slug ?? null;
        companyCountry = (c as any).country ?? null;
        companyIndustry = (c as any).industry ?? null;
      }
    }
  }

  // Category label (optional nicety)
  let categoryName: string | null = null;
  const categoryId =
    typeof evidence.category_id === "number"
      ? evidence.category_id
      : typeof evidence.category === "number"
        ? evidence.category
        : null;

  if (categoryId) {
    const { data: cat } = await supabase
      .from("categories")
      .select("name")
      .eq("id", categoryId)
      .maybeSingle();

    categoryName = (cat as any)?.name ?? null;
  }

  const severityValue =
    (typeof evidence.severity_suggested === "number"
      ? evidence.severity_suggested
      : null) ??
    (typeof evidence.severity === "number" ? evidence.severity : null);

  return (
    <main
      style={{
        maxWidth: 960,
        margin: "0 auto",
        padding: "24px 16px",
        overflowX: "hidden",
      }}
    >
      <a
        href="/moderation/current"
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
          <span style={{ color: "#9ca3af" }}>({evidence.user_id})</span> · Current
          status: <strong>{status.toUpperCase()}</strong>
          {isSelfOwned ? (
            <span style={{ marginLeft: 8, color: "#b45309" }}>
              (Warning: you are the submitter)
            </span>
          ) : null}
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
        <div style={{ display: "grid", gap: 10 }}>
          {/* Evidence type */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#6b7280" }}>
              Evidence Type
            </div>
            <div style={{ fontSize: 14, color: "#111827" }}>
              {evidence.evidence_type
                ? String(evidence.evidence_type)
                : "(not set)"}
            </div>
          </div>

          {/* Title */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#6b7280" }}>
              Title
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, color: "#111827" }}>
              {evidence.title || "Untitled evidence"}
            </div>
          </div>

          {/* Summary */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#6b7280" }}>
              Summary
            </div>

            <div
              style={{
                marginTop: 6,
                padding: 12,
                borderRadius: 8,
                border: "1px solid #e5e7eb",
                background: "#ffffff",
                fontSize: 14,
                color: "#111827",
                whiteSpace: "pre-wrap",
                lineHeight: 1.5,
                maxHeight: 260,
                overflow: "auto",
                maxWidth: "100%",

                // prevent long unbroken strings from stretching layout
                overflowWrap: "anywhere",
                wordBreak: "break-word",
              }}
            >
              {evidence.summary && String(evidence.summary).trim().length > 0
                ? evidence.summary
                : "(No summary provided)"}
            </div>
          </div>

          {/* Category / Severity (responsive) */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 12,
              alignItems: "start",
            }}
          >
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#6b7280" }}>
                Category
              </div>
              <div style={{ fontSize: 14, color: "#111827" }}>
                {categoryName ??
                  (categoryId ? `Category #${categoryId}` : "(not set)")}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#6b7280" }}>
                Severity (1 = low, 5 = severe)
              </div>
              <div style={{ fontSize: 14, color: "#111827" }}>
                {severityValue ?? "(not set)"}
              </div>
            </div>
          </div>

          {/* Company */}
          {(companyName || companySlug || companyCountry || companyIndustry) && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#6b7280" }}>
                Company
              </div>
              <div style={{ fontSize: 14, color: "#111827" }}>
                {companySlug ? (
                  <a
                    href={`/company/${companySlug}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: "#2563eb" }}
                  >
                    {companyName ?? companySlug}
                  </a>
                ) : (
                  companyName ?? "(unknown)"
                )}
              </div>

              {(companyCountry || companyIndustry) && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: 8,
                    marginTop: 6,
                    fontSize: 13,
                    color: "#6b7280",
                  }}
                >
                  <div>
                    {companyCountry ? `Country: ${companyCountry}` : ""}
                  </div>
                  <div>
                    {companyIndustry ? `Industry: ${companyIndustry}` : ""}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Metadata */}
          <div style={{ fontSize: 13, color: "#6b7280" }}>
            ID: {evidence.id} · Created at:{" "}
            {new Date(evidence.created_at).toLocaleString()}
          </div>

          {/* File */}
          {evidence.file_url && (
            <div style={{ fontSize: 13 }}>
              <strong>File:</strong>{" "}
              <a
                href={evidence.file_url}
                target="_blank"
                rel="noreferrer"
                style={{ color: "#2563eb" }}
              >
                View uploaded file
              </a>
            </div>
          )}
        </div>
      </section>

      {/* Approve/Reject actions (responsive + aligned buttons) */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 16,
          marginBottom: 24,
        }}
      >
        {/* Approve */}
        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            padding: 16,
            background: "#ffffff",
            opacity: !isPending ? 0.6 : 1,

            display: "flex",
            flexDirection: "column",
            minHeight: 340,
          }}
        >
          <h2 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 6px" }}>
            Approve
          </h2>
          <p style={{ margin: "0 0 12px", fontSize: 13, color: "#555" }}>
            Approving will mark this evidence as <strong>approved</strong> and
            send a confirmation email to the submitter. Any note you add will be
            included in the email and stored in the moderation log.
          </p>

          <form
            action={approveEvidence}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              flex: 1,
            }}
          >
            <input type="hidden" name="evidenceId" value={String(evidenceId)} />

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
                disabled={!isPending}
              />
            </label>

            <button
              type="submit"
              style={{
                marginTop: "auto",
                padding: "10px 12px",
                fontSize: 14,
                borderRadius: 6,
                border: "none",
                background: "#16a34a",
                color: "white",
                cursor: isPending ? "pointer" : "not-allowed",
                width: "100%",
              }}
              disabled={!isPending}
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
            background: "#ffffff",
            opacity: !isPending ? 0.6 : 1,

            display: "flex",
            flexDirection: "column",
            minHeight: 340,
          }}
        >
          <h2 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 6px" }}>
            Reject
          </h2>
          <p style={{ margin: "0 0 12px", fontSize: 13, color: "#555" }}>
            Rejecting will mark this evidence as <strong>rejected</strong> and
            send a rejection email to the submitter. Your note is{" "}
            <strong>required</strong> and will be included in the email and
            moderation log.
          </p>

          <form
            action={rejectEvidence}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              flex: 1,
            }}
          >
            <input type="hidden" name="evidenceId" value={String(evidenceId)} />

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
                disabled={!isPending}
              />
            </label>

            <button
              type="submit"
              style={{
                marginTop: "auto",
                padding: "10px 12px",
                fontSize: 14,
                borderRadius: 6,
                border: "none",
                background: "#dc2626",
                color: "white",
                cursor: isPending ? "pointer" : "not-allowed",
                width: "100%",
              }}
              disabled={!isPending}
            >
              Reject and send email
            </button>
          </form>
        </div>
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
          <h2 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 8px" }}>
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
                key={`${evt.created_at}-${evt.action}-${evt.moderator_id}`}
                style={{
                  padding: "10px 0",
                  borderTop: "1px solid #f3f4f6",
                }}
              >
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <strong style={{ textTransform: "uppercase" }}>
                    {evt.action}
                  </strong>
                  <span style={{ color: "#6b7280" }}>
                    {new Date(evt.created_at).toLocaleString()}
                  </span>
                  <span style={{ color: "#9ca3af" }}>
                    moderator: {evt.moderator_id}
                  </span>
                </div>
                {evt.note ? (
                  <div style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>
                    {evt.note}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
