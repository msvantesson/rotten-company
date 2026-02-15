import { supabaseServer } from "@/lib/supabase-server";
import { supabaseService } from "@/lib/supabase-service";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

type ParamsShape = { id: string };

export default async function CompanyRequestReviewPage(props: {
  params: ParamsShape | Promise<ParamsShape>;
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const resolvedParams =
    props.params instanceof Promise ? await props.params : props.params;

  const errorMessageRaw =
    typeof props.searchParams?.error === "string"
      ? props.searchParams.error
      : undefined;
  const errorMessage = errorMessageRaw ? decodeURIComponent(errorMessageRaw) : null;

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
  const requestId = resolvedParams.id;
  if (!requestId) {
    return <div>Invalid request ID</div>;
  }

  // Fetch company request + submitter email
  const { data: companyRequest, error } = await supabase
    .from("company_requests")
    .select("*, users ( email )")
    .eq("id", requestId)
    .maybeSingle();

  if (error) {
    console.error(
      "[admin-company-request] company request query failed:",
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
    (companyRequest as any).users?.email ?? "(unknown submitter)";

  // Moderation history from moderation_actions table
  const { data: actions } = await supabase
    .from("moderation_actions")
    .select("action, moderator_note, moderator_id, created_at")
    .eq("target_type", "company_request")
    .eq("target_id", requestId)
    .order("created_at", { ascending: false });

  // Actions

  async function handleApprove(formData: FormData) {
    "use server";

    if (!isPending) {
      redirect("/moderation/company-requests");
    }

    const note = formData.get("note")?.toString() ?? "";

    // Use supabaseService for mutations
    const service = supabaseService();

    // Validate moderator
    const { data: modRow } = await service
      .from("moderators")
      .select("user_id")
      .eq("user_id", moderatorId)
      .maybeSingle();

    if (!modRow) {
      redirect(
        `/admin/moderation/company-requests/${requestId}?error=${encodeURIComponent(
          "Invalid moderator",
        )}`,
      );
    }

    // Fetch current request to validate
    const { data: cr, error: crErr } = await service
      .from("company_requests")
      .select("id, name, country, website, description, status, user_id")
      .eq("id", requestId)
      .maybeSingle();

    if (crErr || !cr) {
      redirect(
        `/admin/moderation/company-requests/${requestId}?error=${encodeURIComponent(
          "Company request not found",
        )}`,
      );
    }

    if (cr.status !== "pending") {
      redirect(
        `/admin/moderation/company-requests/${requestId}?error=${encodeURIComponent(
          "Request is not pending",
        )}`,
      );
    }

    // Create company (slug-safe)
    function slugify(input: string) {
      return input
        .toLowerCase()
        .trim()
        .replace(/['"]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 80);
    }

    const baseSlug = slugify(cr.name);
    let slug = baseSlug || `company-${requestId.slice(0, 8)}`;

    for (let i = 0; i < 20; i++) {
      const { data: existing } = await service
        .from("companies")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();

      if (!existing) break;

      if (i >= 19) {
        // Fallback to timestamp if we've exhausted attempts
        slug = `${baseSlug}-${Date.now()}`;
      } else {
        slug = `${baseSlug}-${i + 2}`;
      }
    }

    const { data: company, error: companyErr } = await service
      .from("companies")
      .insert({
        name: cr.name,
        country: cr.country,
        slug,
        industry: null,
      })
      .select("id, slug")
      .single();

    if (companyErr || !company) {
      redirect(
        `/admin/moderation/company-requests/${requestId}?error=${encodeURIComponent(
          `Failed to create company: ${companyErr?.message ?? "unknown"}`,
        )}`,
      );
    }

    // Update request
    const { data: updated, error: updateErr } = await service
      .from("company_requests")
      .update({
        status: "approved",
        moderator_id: moderatorId,
        decision_reason: note || "approved via admin detail page",
        moderated_at: new Date().toISOString(),
      })
      .eq("id", requestId)
      .eq("status", "pending")
      .select("id");

    if (updateErr) {
      redirect(
        `/admin/moderation/company-requests/${requestId}?error=${encodeURIComponent(
          `Failed to update request: ${updateErr.message}`,
        )}`,
      );
    }

    if (!updated || updated.length === 0) {
      redirect(
        `/admin/moderation/company-requests/${requestId}?error=${encodeURIComponent(
          "Request update blocked or already processed",
        )}`,
      );
    }

    // Moderation log
    await service.from("moderation_actions").insert({
      moderator_id: moderatorId,
      target_type: "company_request",
      target_id: requestId,
      action: "approve",
      moderator_note: note || "Approved",
      source: "ui",
    });

    // Fetch contributor email
    let contributorEmail: string | null = null;

    if (cr.user_id) {
      const { data: userRow } = await service
        .from("users")
        .select("email")
        .eq("id", cr.user_id)
        .maybeSingle();

      contributorEmail = userRow?.email ?? null;
    }

    // Enqueue notification
    if (contributorEmail) {
      const emailBody = [
        "Hi,",
        "",
        `Your request to add "${cr.name}" has been approved and is now live on Rotten Company.`,
        "",
        `Slug: ${company.slug}`,
        ...(note ? ["", `Moderator note: "${note}"`] : []),
        "",
        "— Rotten Company",
      ].join("\n");

      await service.from("notification_jobs").insert({
        recipient_email: contributorEmail,
        subject: "Your company request was approved",
        body: emailBody,
        metadata: { requestId, action: "approve" },
        status: "pending",
      });
    }

    revalidatePath("/moderation/company-requests");
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
        `/admin/moderation/company-requests/${requestId}?error=${encodeURIComponent(
          "Rejection reason is required",
        )}`,
      );
    }

    // Use supabaseService for mutations
    const service = supabaseService();

    // Validate moderator
    const { data: modRow } = await service
      .from("moderators")
      .select("user_id")
      .eq("user_id", moderatorId)
      .maybeSingle();

    if (!modRow) {
      redirect(
        `/admin/moderation/company-requests/${requestId}?error=${encodeURIComponent(
          "Invalid moderator",
        )}`,
      );
    }

    // Fetch current request to validate
    const { data: cr, error: crErr } = await service
      .from("company_requests")
      .select("id, status, name, user_id")
      .eq("id", requestId)
      .maybeSingle();

    if (crErr || !cr) {
      redirect(
        `/admin/moderation/company-requests/${requestId}?error=${encodeURIComponent(
          "Company request not found",
        )}`,
      );
    }

    if (cr.status !== "pending") {
      redirect(
        `/admin/moderation/company-requests/${requestId}?error=${encodeURIComponent(
          "Request is not pending",
        )}`,
      );
    }

    // Update request
    const { data: updated, error: updateErr } = await service
      .from("company_requests")
      .update({
        status: "rejected",
        moderator_id: moderatorId,
        decision_reason: note,
        moderated_at: new Date().toISOString(),
      })
      .eq("id", requestId)
      .eq("status", "pending")
      .select("id");

    if (updateErr) {
      redirect(
        `/admin/moderation/company-requests/${requestId}?error=${encodeURIComponent(
          `Failed to update request: ${updateErr.message}`,
        )}`,
      );
    }

    if (!updated || updated.length === 0) {
      redirect(
        `/admin/moderation/company-requests/${requestId}?error=${encodeURIComponent(
          "Request update blocked or already processed",
        )}`,
      );
    }

    // Moderation log
    await service.from("moderation_actions").insert({
      moderator_id: moderatorId,
      target_type: "company_request",
      target_id: requestId,
      action: "reject",
      moderator_note: note,
      source: "ui",
    });

    // Fetch contributor email
    let contributorEmail: string | null = null;

    if (cr.user_id) {
      const { data: userRow } = await service
        .from("users")
        .select("email")
        .eq("id", cr.user_id)
        .maybeSingle();

      contributorEmail = userRow?.email ?? null;
    }

    // Enqueue notification
    if (contributorEmail) {
      await service.from("notification_jobs").insert({
        recipient_email: contributorEmail,
        subject: "Your company request was rejected",
        body: `Hi,

Your request to add "${cr.name}" was rejected.

Reason:
${note}

— Rotten Company`,
        metadata: { requestId, action: "reject" },
        status: "pending",
      });
    }

    revalidatePath("/moderation/company-requests");
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
          <p style={{ marginTop: 8, fontSize: 13 }}>
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
            {actions.map((action) => (
              <li
                key={`${action.moderator_id}-${action.created_at}-${action.action}`}
                style={{ marginBottom: 6 }}
              >
                <strong>{action.action}</strong> by{" "}
                <code>{action.moderator_id}</code> at{" "}
                {new Date(action.created_at as any).toLocaleString()}
                {action.moderator_note && (
                  <>
                    {" "}
                    –{" "}
                    <span style={{ color: "#4b5563" }}>
                      {action.moderator_note}
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
          or change their own submissions.
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
              Approving will create a new company in the database, mark this
              request as <strong>approved</strong>, and send a confirmation email
              to the submitter. Any note you add will be included in both the
              email and the moderation log.
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
              Rejecting will mark this company request as{" "}
              <strong>rejected</strong> and send a rejection email to the
              submitter. Your note is <strong>required</strong> and will be
              included in the email and moderation log.
            </p>
            <form action={handleReject} style={{ display: "grid", gap: 8 }}>
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
