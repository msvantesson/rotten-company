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
      <label className="text-sm">
        Severity{severityRequired ? " (required)" : " (optional)"}
        <select
          name="severity"
          required={severityRequired}
          defaultValue={defaultSeverity}
          className="mt-1 w-full rounded border px-2 py-1 text-sm"
          disabled={pending}
        >
          <option value="">— select severity —</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </label>
      <label className="text-sm">
        Note (optional)
        <textarea
          name="moderator_note"
          placeholder="Optional note for the submitter"
          className="mt-1 w-full rounded border px-2 py-1 text-sm min-h-[60px]"
          disabled={pending}
        />
      </label>
      <button
        type="submit"
        className={`mt-auto rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 ${pending ? "opacity-60 cursor-not-allowed" : ""}`}
        disabled={pending}
      >
        {pending ? "Submitting…" : "Approve"}
      </button>
    </>
  );
}

function RejectFields() {
  const { pending } = useFormStatus();

  return (
    <>
      <label className="text-sm">
        Rejection reason (required)
        <textarea
          name="moderator_note"
          placeholder="Explain why this evidence is being rejected"
          required
          className="mt-1 w-full rounded border px-2 py-1 text-sm min-h-[70px]"
          disabled={pending}
        />
      </label>
      <button
        type="submit"
        className={`mt-auto rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 ${pending ? "opacity-60 cursor-not-allowed" : ""}`}
        disabled={pending}
      >
        {pending ? "Submitting…" : "Reject"}
      </button>
    </>
  );
}

// ── Public component rendered by the server page ─────────────────────────────

type ModerationFormsProps = {
  evidenceId: number;
  severityRequired: boolean;
  defaultSeverity: string;
  approveAction: (formData: FormData) => Promise<void>;
  rejectAction: (formData: FormData) => Promise<void>;
};

export default function ModerationForms({
  evidenceId,
  severityRequired,
  defaultSeverity,
  approveAction,
  rejectAction,
}: ModerationFormsProps) {
  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* Approve */}
      <div className="rounded-md border border-border bg-surface p-4 flex flex-col gap-3">
        <h2 className="text-base font-semibold">Approve</h2>
        <p className="text-sm text-neutral-600">
          Mark as <strong>approved</strong>. The submitter will be notified.
        </p>
        <form action={approveAction} className="flex flex-col gap-2 flex-1">
          <input type="hidden" name="evidence_id" value={String(evidenceId)} />
          <ApproveFields
            severityRequired={severityRequired}
            defaultSeverity={defaultSeverity}
          />
        </form>
      </div>

      {/* Reject */}
      <div className="rounded-md border border-border bg-surface p-4 flex flex-col gap-3">
        <h2 className="text-base font-semibold">Reject</h2>
        <p className="text-sm text-neutral-600">
          Mark as <strong>rejected</strong>. A reason is required.
        </p>
        <form action={rejectAction} className="flex flex-col gap-2 flex-1">
          <input type="hidden" name="evidence_id" value={String(evidenceId)} />
          <RejectFields />
        </form>
      </div>
    </section>
  );
}
