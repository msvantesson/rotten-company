"use client";

import { useFormStatus } from "react-dom";

// ── Inner components that read the nearest form's pending state ───────────────

function ApproveFields({
  severityRequired,
  defaultSeverity,
}: {
  severityRequired: boolean;
  defaultSeverity: string;
}) {
  const { pending } = useFormStatus();

  return (
    <>
      <label style={{ fontSize: 13 }}>
        Severity{severityRequired ? " (required)" : " (optional)"}
        <select
          name="severity"
          required={severityRequired}
          defaultValue={defaultSeverity}
          style={{
            width: "100%",
            display: "block",
            marginTop: 4,
            padding: "4px 6px",
            fontSize: 13,
          }}
          disabled={pending}
        >
          <option value="">— select severity —</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </label>

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
          disabled={pending}
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
          cursor: pending ? "not-allowed" : "pointer",
          width: "100%",
          opacity: pending ? 0.6 : 1,
        }}
        disabled={pending}
      >
        {pending ? "Submitting…" : "Approve and send email"}
      </button>
    </>
  );
}

function RejectFields() {
  const { pending } = useFormStatus();

  return (
    <>
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
          disabled={pending}
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
          cursor: pending ? "not-allowed" : "pointer",
          width: "100%",
          opacity: pending ? 0.6 : 1,
        }}
        disabled={pending}
      >
        {pending ? "Submitting…" : "Reject and send email"}
      </button>
    </>
  );
}

// ── Public component rendered by the server page ─────────────────────────────

type AdminModerationFormsProps = {
  evidenceId: number;
  isPending: boolean;
  severityRequired: boolean;
  defaultSeverity: string;
  approveAction: (formData: FormData) => Promise<void>;
  rejectAction: (formData: FormData) => Promise<void>;
};

export default function AdminModerationForms({
  evidenceId,
  isPending,
  severityRequired,
  defaultSeverity,
  approveAction,
  rejectAction,
}: AdminModerationFormsProps) {
  return (
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
          border: "1px solid var(--border)",
          borderRadius: 8,
          padding: 16,
          background: "var(--surface)",
          opacity: !isPending ? 0.6 : 1,
          display: "flex",
          flexDirection: "column",
          minHeight: 340,
        }}
      >
        <h2 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 6px" }}>
          Approve
        </h2>
        <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--muted-foreground)" }}>
          Approving will mark this evidence as <strong>approved</strong> and
          send a confirmation email to the submitter. Any note you add will be
          included in the email and stored in the moderation log.
        </p>

        <form
          action={approveAction}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            flex: 1,
          }}
        >
          <input type="hidden" name="evidenceId" value={String(evidenceId)} />
          <ApproveFields
            severityRequired={severityRequired}
            defaultSeverity={defaultSeverity}
          />
        </form>
      </div>

      {/* Reject */}
      <div
        style={{
          border: "1px solid var(--border)",
          borderRadius: 8,
          padding: 16,
          background: "var(--surface)",
          opacity: !isPending ? 0.6 : 1,
          display: "flex",
          flexDirection: "column",
          minHeight: 340,
        }}
      >
        <h2 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 6px" }}>
          Reject
        </h2>
        <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--muted-foreground)" }}>
          Rejecting will mark this evidence as <strong>rejected</strong> and
          send a rejection email to the submitter. Your note is{" "}
          <strong>required</strong> and will be included in the email and
          moderation log.
        </p>

        <form
          action={rejectAction}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            flex: 1,
          }}
        >
          <input type="hidden" name="evidenceId" value={String(evidenceId)} />
          <RejectFields />
        </form>
      </div>
    </section>
  );
}
