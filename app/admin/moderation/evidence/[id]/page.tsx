import { getSsrUser } from "@/lib/get-ssr-user";
import { supabaseService } from "@/lib/supabase-service";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

type ParamsShape = { id: string };

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

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

  // Defensive auth
  const user = await getSsrUser();
  if (!user) return null;

  const moderatorId = user.id;

  const service = supabaseService();

  // Ensure user is a moderator
  const { data: isModerator } = await service
    .from("moderators")
    .select("user_id")
    .eq("user_id", moderatorId)
    .maybeSingle();

  if (!isModerator) return null;

  // Try to parse ID
  const itemId = resolvedParams.id;

  // First, try to load as evidence
  const { data: evidence } = await service
    .from("evidence")
    .select("*, users ( email )")
    .eq("id", itemId)
    .maybeSingle();

  if (evidence) {
    // Render evidence moderation UI
    return renderEvidenceUI({
      evidence,
      moderatorId,
      errorMessage,
      service,
    });
  }

  // If no evidence, try to load as company_request
  const { data: companyRequest } = await service
    .from("company_requests")
    .select("*, users ( email )")
    .eq("id", itemId)
    .maybeSingle();

  if (companyRequest) {
    // Render company_request moderation UI
    return renderCompanyRequestUI({
      companyRequest,
      moderatorId,
      errorMessage,
      service,
    });
  }

  // Neither found
  return <div>Item not found</div>;
}

async function renderEvidenceUI({
  evidence,
  moderatorId,
  errorMessage,
  service,
}: {
  evidence: any;
  moderatorId: string;
  errorMessage: string | null;
  service: ReturnType<typeof supabaseService>;
}) {
  const evidenceId = evidence.id;
  const status: string = evidence.status ?? "pending";
  const isPending = status === "pending";
  const isSelfOwned = evidence.user_id === moderatorId;
  const submitterEmail = evidence.users?.email ?? "(unknown submitter)";

  // Moderation history
  const { data: events } = await service
    .from("moderation_events")
    .select("action, note, moderator_id, created_at")
    .eq("evidence_id", evidenceId)
    .order("created_at", { ascending: false });

  // Optional company request context
  let companyRequestId: string | null = null;
  let companyName: string | null = null;

  if (evidence.company_request_id) {
    const { data: companyReq } = await service
      .from("company_requests")
      .select("id, name")
      .eq("id", evidence.company_request_id)
      .maybeSingle();

    if (companyReq) {
      companyRequestId = companyReq.id;
      companyName = companyReq.name ?? null;
    }
  }

  // Server actions
  async function handleApprove(formData: FormData) {
    "use server";

    const user = await getSsrUser();
    if (!user) {
      redirect(`/admin/moderation/evidence/${evidenceId}?error=Not+authenticated`);
    }

    const service = supabaseService();
    const note = formData.get("note")?.toString() ?? "";

    // Validate moderator
    const { data: isMod } = await service
      .from("moderators")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!isMod) {
      redirect(`/admin/moderation/evidence/${evidenceId}?error=Not+a+moderator`);
    }

    // Fetch evidence
    const { data: ev } = await service
      .from("evidence")
      .select("id, status, user_id, title")
      .eq("id", evidenceId)
      .maybeSingle();

    if (!ev || ev.status !== "pending") {
      redirect(`/admin/moderation/evidence/${evidenceId}?error=Cannot+approve+this+evidence`);
    }

    if (ev.user_id && ev.user_id === user.id) {
      redirect(`/admin/moderation/evidence/${evidenceId}?error=Cannot+approve+own+evidence`);
    }

    // Update evidence
    const { error: updateErr } = await service
      .from("evidence")
      .update({
        status: "approved",
        assigned_moderator_id: user.id,
        assigned_at: new Date().toISOString(),
      })
      .eq("id", evidenceId);

    if (updateErr) {
      redirect(
        `/admin/moderation/evidence/${evidenceId}?error=${encodeURIComponent(updateErr.message)}`,
      );
    }

    // Log action
    await service.from("moderation_events").insert({
      evidence_id: evidenceId,
      moderator_id: user.id,
      action: "approved",
      note: note || "approved via admin detail page",
    });

    // Enqueue notification
    const { data: submitterData } = await service
      .from("evidence")
      .select("user_id, title, users ( email )")
      .eq("id", evidenceId)
      .single();

    const email = (submitterData as any)?.users?.email;
    if (email) {
      await service.from("notification_jobs").insert({
        recipient_email: email,
        subject: "Your evidence was approved on Rotten Company",
        body: `Hi,\n\nYour evidence "${ev.title ?? "(untitled)"}" has been approved by our moderators and is now live on Rotten Company.\n${note ? `\nModerator note: "${note}"\n` : ""}\n— Rotten Company`,
        metadata: {
          type: "evidence_approved",
          evidence_id: evidenceId,
          moderator_id: user.id,
        },
      });
    }

    revalidatePath("/moderation");
    revalidatePath("/my/evidence");
    redirect("/moderation");
  }

  async function handleReject(formData: FormData) {
    "use server";

    const user = await getSsrUser();
    if (!user) {
      redirect(`/admin/moderation/evidence/${evidenceId}?error=Not+authenticated`);
    }

    const service = supabaseService();
    const note = formData.get("note")?.toString() ?? "";

    if (!note.trim()) {
      redirect(`/admin/moderation/evidence/${evidenceId}?error=Rejection+reason+required`);
    }

    // Validate moderator
    const { data: isMod } = await service
      .from("moderators")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!isMod) {
      redirect(`/admin/moderation/evidence/${evidenceId}?error=Not+a+moderator`);
    }

    // Fetch evidence
    const { data: ev } = await service
      .from("evidence")
      .select("id, status, user_id, title")
      .eq("id", evidenceId)
      .maybeSingle();

    if (!ev || ev.status !== "pending") {
      redirect(`/admin/moderation/evidence/${evidenceId}?error=Cannot+reject+this+evidence`);
    }

    if (ev.user_id && ev.user_id === user.id) {
      redirect(`/admin/moderation/evidence/${evidenceId}?error=Cannot+reject+own+evidence`);
    }

    // Update evidence
    const { error: updateErr } = await service
      .from("evidence")
      .update({
        status: "rejected",
        assigned_moderator_id: user.id,
        assigned_at: new Date().toISOString(),
      })
      .eq("id", evidenceId);

    if (updateErr) {
      redirect(
        `/admin/moderation/evidence/${evidenceId}?error=${encodeURIComponent(updateErr.message)}`,
      );
    }

    // Log action
    await service.from("moderation_events").insert({
      evidence_id: evidenceId,
      moderator_id: user.id,
      action: "rejected",
      note,
    });

    // Enqueue notification
    const { data: submitterData } = await service
      .from("evidence")
      .select("user_id, title, users ( email )")
      .eq("id", evidenceId)
      .single();

    const email = (submitterData as any)?.users?.email;
    if (email) {
      await service.from("notification_jobs").insert({
        recipient_email: email,
        subject: "Your evidence was rejected on Rotten Company",
        body: `Hi,\n\nYour evidence "${ev.title ?? "(untitled)"}" was reviewed by our moderators but was not approved.\n\nReason for rejection:\n${note}\n\n— Rotten Company`,
        metadata: {
          type: "evidence_rejected",
          evidence_id: evidenceId,
          moderator_id: user.id,
        },
      });
    }

    revalidatePath("/moderation");
    revalidatePath("/my/evidence");
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

      {/* Related company request panel */}
      {companyRequestId && (
        <section
          style={{
            border: "1px solid #d1d5db",
            borderRadius: 8,
            padding: 12,
            marginBottom: 24,
            background: "#f3f4f6",
          }}
        >
          <p style={{ margin: 0, fontSize: 13 }}>
            <strong>Related company request:</strong>{" "}
            <a
              href={`/admin/moderation/evidence/${companyRequestId}`}
              style={{ color: "#2563eb" }}
            >
              {companyName || `Request #${companyRequestId}`}
            </a>
          </p>
        </section>
      )}

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

async function renderCompanyRequestUI({
  companyRequest,
  moderatorId,
  errorMessage,
  service,
}: {
  companyRequest: any;
  moderatorId: string;
  errorMessage: string | null;
  service: ReturnType<typeof supabaseService>;
}) {
  const requestId = companyRequest.id;
  const status: string = companyRequest.status ?? "pending";
  const isPending = status === "pending";
  const isSelfOwned = companyRequest.user_id === moderatorId;
  const submitterEmail = companyRequest.users?.email ?? "(unknown submitter)";

  // Moderation history
  const { data: actions } = await service
    .from("moderation_actions")
    .select("action, moderator_note, moderator_id, created_at")
    .eq("target_type", "company_request")
    .eq("target_id", requestId)
    .order("created_at", { ascending: false });

  // Server actions
  async function handleApproveCompanyRequest(formData: FormData) {
    "use server";

    const user = await getSsrUser();
    if (!user) {
      redirect(`/admin/moderation/evidence/${requestId}?error=Not+authenticated`);
    }

    const service = supabaseService();
    const note = formData.get("note")?.toString() ?? null;

    // Validate moderator
    const { data: isMod } = await service
      .from("moderators")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!isMod) {
      redirect(`/admin/moderation/evidence/${requestId}?error=Not+a+moderator`);
    }

    // Fetch request
    const { data: cr } = await service
      .from("company_requests")
      .select("id, name, country, website, description, status, user_id")
      .eq("id", requestId)
      .maybeSingle();

    if (!cr || cr.status !== "pending") {
      redirect(`/admin/moderation/evidence/${requestId}?error=Request+not+pending`);
    }

    // Create company with slug
    const baseSlug = slugify(cr.name);
    let slug = baseSlug || `company-${requestId.slice(0, 8)}`;

    for (let i = 0; i < 10; i++) {
      const { data: existing } = await service
        .from("companies")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();

      if (!existing) break;
      slug = `${baseSlug}-${i + 2}`;
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
        `/admin/moderation/evidence/${requestId}?error=${encodeURIComponent(companyErr?.message ?? "Failed to create company")}`,
      );
    }

    // Update request
    const { data: updated, error: updateErr } = await service
      .from("company_requests")
      .update({
        status: "approved",
        moderator_id: user.id,
        decision_reason: note,
        moderated_at: new Date().toISOString(),
      })
      .eq("id", requestId)
      .eq("status", "pending")
      .select("id");

    if (updateErr || !updated || updated.length === 0) {
      redirect(
        `/admin/moderation/evidence/${requestId}?error=${encodeURIComponent(updateErr?.message ?? "Request update blocked")}`,
      );
    }

    // Log action
    await service.from("moderation_actions").insert({
      moderator_id: user.id,
      target_type: "company_request",
      target_id: requestId,
      action: "approve",
      moderator_note: note ?? "Approved",
      source: "ui",
    });

    // Enqueue notification
    const { data: userRow } = await service
      .from("users")
      .select("email")
      .eq("id", cr.user_id)
      .maybeSingle();

    const email = userRow?.email ?? null;
    if (email) {
      await service.from("notification_jobs").insert({
        recipient_email: email,
        subject: "Your company request was approved",
        body: `Hi,\n\nYour request to add "${cr.name}" has been approved and is now live on Rotten Company.\n\nSlug: ${company.slug}\n\n— Rotten Company`,
        metadata: { requestId, action: "approve" },
        status: "pending",
      });
    }

    revalidatePath("/moderation");
    redirect("/moderation");
  }

  async function handleRejectCompanyRequest(formData: FormData) {
    "use server";

    const user = await getSsrUser();
    if (!user) {
      redirect(`/admin/moderation/evidence/${requestId}?error=Not+authenticated`);
    }

    const service = supabaseService();
    const note = formData.get("note")?.toString() ?? "";

    if (!note.trim()) {
      redirect(`/admin/moderation/evidence/${requestId}?error=Rejection+reason+required`);
    }

    // Validate moderator
    const { data: isMod } = await service
      .from("moderators")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!isMod) {
      redirect(`/admin/moderation/evidence/${requestId}?error=Not+a+moderator`);
    }

    // Fetch request
    const { data: cr } = await service
      .from("company_requests")
      .select("id, status, name, user_id")
      .eq("id", requestId)
      .maybeSingle();

    if (!cr || cr.status !== "pending") {
      redirect(`/admin/moderation/evidence/${requestId}?error=Request+not+pending`);
    }

    // Update request
    const { data: updated, error: updateErr } = await service
      .from("company_requests")
      .update({
        status: "rejected",
        moderator_id: user.id,
        decision_reason: note,
        moderated_at: new Date().toISOString(),
      })
      .eq("id", requestId)
      .eq("status", "pending")
      .select("id");

    if (updateErr || !updated || updated.length === 0) {
      redirect(
        `/admin/moderation/evidence/${requestId}?error=${encodeURIComponent(updateErr?.message ?? "Request update blocked")}`,
      );
    }

    // Log action
    await service.from("moderation_actions").insert({
      moderator_id: user.id,
      target_type: "company_request",
      target_id: requestId,
      action: "reject",
      moderator_note: note,
      source: "ui",
    });

    // Enqueue notification
    const { data: userRow } = await service
      .from("users")
      .select("email")
      .eq("id", cr.user_id)
      .maybeSingle();

    const email = userRow?.email ?? null;
    if (email) {
      await service.from("notification_jobs").insert({
        recipient_email: email,
        subject: "Your company request was rejected",
        body: `Hi,\n\nYour request to add "${cr.name}" was rejected.\n\nReason:\n${note}\n\n— Rotten Company`,
        metadata: { requestId, action: "reject" },
        status: "pending",
      });
    }

    revalidatePath("/moderation");
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
          {companyRequest.name || "Untitled company request"}
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
          <p style={{ marginTop: 4, fontSize: 13 }}>
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
          <p style={{ marginTop: 4, fontSize: 13 }}>
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
                {new Date(act.created_at as any).toLocaleString()}
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
          This company request was submitted by you. Moderators can never review or
          change their own submissions. Because this item is already{" "}
          <strong>{status.toLowerCase()}</strong>, its moderation decision
          cannot be changed here.
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
            <form action={handleApproveCompanyRequest} style={{ display: "grid", gap: 8 }}>
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
            <form action={handleRejectCompanyRequest} style={{ display: "grid", gap: 8 }}>
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
