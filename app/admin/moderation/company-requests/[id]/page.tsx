import { supabaseServer } from "@/lib/supabase-server";
import { supabaseService } from "@/lib/supabase-service";
import { redirect } from "next/navigation";

type ParamsShape = { id: string };

export default async function CompanyRequestDetailPage(props: {
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

  // Use cookie-scoped client for auth
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

  // Use service role for data fetch to avoid RLS issues
  const service = supabaseService();

  // Fetch company_requests row
  const { data: companyRequest, error } = await service
    .from("company_requests")
    .select("*, users ( email )")
    .eq("id", resolvedParams.id)
    .maybeSingle();

  if (error) {
    console.error(
      "[admin-company-request] company_requests query failed:",
      error.message,
    );
    return <div>Error loading company request</div>;
  }

  if (!companyRequest) {
    return <div>Company request not found</div>;
  }

  const status: string = companyRequest.status ?? "pending";
  const isPending = status === "pending";
  const isSelfOwned = companyRequest.user_id === moderatorId;
  const submitterEmail =
    (companyRequest as { users?: { email?: string } }).users?.email ??
    "(unknown submitter)";

  // Moderation history
  const { data: actions } = await service
    .from("moderation_actions")
    .select("action, moderator_note, moderator_id, created_at")
    .eq("target_type", "company_request")
    .eq("target_id", resolvedParams.id)
    .order("created_at", { ascending: false });

  // Actions

  async function handleApprove(formData: FormData) {
    "use server";

    if (!isPending) {
      redirect("/moderation/company-requests");
    }

    const note = formData.get("note")?.toString() ?? "";

    // Call the API route to handle approval
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const response = await fetch(
      `${baseUrl}/api/moderation/company-requests/approve`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: resolvedParams.id,
          moderator_note: note || "approved via admin detail page",
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      redirect(
        `/admin/moderation/company-requests/${resolvedParams.id}?error=${encodeURIComponent(
          errorText || "Approval failed",
        )}`,
      );
    }

    redirect("/moderation/company-requests");
  }

  async function handleReject(formData: FormData) {
    "use server";

    if (!isPending) {
      redirect("/moderation/company-requests");
    }

    const note = formData.get("note")?.toString() ?? "";

    if (!note.trim()) {
      redirect(
        `/admin/moderation/company-requests/${resolvedParams.id}?error=${encodeURIComponent(
          "Rejection note is required",
        )}`,
      );
    }

    // Call the API route to handle rejection
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const response = await fetch(
      `${baseUrl}/api/moderation/company-requests/reject`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: resolvedParams.id,
          moderator_note: note,
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      redirect(
        `/admin/moderation/company-requests/${resolvedParams.id}?error=${encodeURIComponent(
          errorText || "Rejection failed",
        )}`,
      );
    }

    redirect("/moderation/company-requests");
  }

  return (
    <main style={{ padding: 32, maxWidth: 900, margin: "0 auto" }}>
      <a
        href="/moderation/company-requests"
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
          Moderate Company Request
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
          {companyRequest.name || "Untitled company request"}
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

      {/* Moderation history */}
      {actions && actions.length > 0 && (
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
            {actions.map((act) => (
              <li
                key={`${act.moderator_id}-${act.created_at}-${act.action}`}
                style={{ marginBottom: 6 }}
              >
                <strong>{act.action}</strong> by{" "}
                <code>{act.moderator_id}</code> at{" "}
                {new Date(act.created_at).toLocaleString()}
                {act.moderator_note && (
                  <>
                    {" "}
                    –{" "}
                    <span style={{ color: "#4b5563" }}>
                      {act.moderator_note}
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
          This company request was submitted by you. Moderators can never review
          or change their own submissions. Because this item is already{" "}
          <strong>{status.toLowerCase()}</strong>, its moderation decision cannot
          be changed here.
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
          This company request has already been{" "}
          <strong>{status.toLowerCase()}</strong>. No further moderation actions
          are available here.
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
              Approving will create the company and mark this request as{" "}
              <strong>approved</strong>. A confirmation email will be sent to the
              submitter.
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
              Rejecting will mark this request as <strong>rejected</strong> and
              send a rejection email to the submitter. Your note is{" "}
              <strong>required</strong> and will be included in the email.
            </p>
            <form action={handleReject} style={{ display: "grid", gap: 8 }}>
              <label style={{ fontSize: 13 }}>
                Rejection reason (required)
                <textarea
                  name="note"
                  placeholder="Explain briefly why this request is being rejected. This text will be sent to the submitter."
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
