// Client Component: shows the moderation UI and a client-side debug log.
// Replace your existing ModerationClient with this file.

"use client";

import React, { useEffect } from "react";
import { useFormStatus } from "react-dom";

type EvidenceRow = {
  id: number;
  title: string;
  summary: string | null;
  contributor_note: string | null;
  created_at: string | null;
};

type Props = {
  evidence: EvidenceRow[];
  approveEvidence: (formData: FormData) => void;
  rejectEvidence: (formData: FormData) => void;
  moderatorId: string | null;
};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      style={{ pointerEvents: pending ? "none" : "auto", zIndex: 50 }}
      className={`px-3 py-1 rounded text-white focus:outline-none focus:ring-2 focus:ring-offset-1 ${
        label === "Approve" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"
      } ${pending ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      {pending ? "Submitting…" : label}
    </button>
  );
}

export default function ModerationClient({
  evidence,
  approveEvidence,
  rejectEvidence,
  moderatorId,
}: Props) {
  // Client-side console log to confirm the value passed from SSR
  useEffect(() => {
    console.log("[moderation] client received moderatorId:", moderatorId);
  }, [moderatorId]);

  return (
    <>
      <a
        href="https://www.yahoo.com"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block mb-4 text-blue-600 underline"
      >
        Test external link (Yahoo)
      </a>

      {/* Visible client debug banner */}
      <div className="mb-4 p-3 rounded border bg-blue-50 text-sm">
        <div>Client moderatorId: <strong>{moderatorId ?? "null"}</strong></div>
        <div className="text-xs text-gray-600">Check browser console for the client log: <code>[moderation] client received moderatorId</code></div>
      </div>

      <p className="text-sm text-gray-500 mb-6">Pending evidence count: {evidence.length}</p>

      {evidence.length === 0 && <p className="text-gray-500">No pending evidence.</p>}

      {evidence.map((e) => (
        <section key={e.id} className="border border-gray-200 rounded-lg p-4 mb-6 relative">
          <header className="mb-2">
            <strong>{e.title}</strong>
            <div className="text-xs text-gray-500">
              {e.created_at ? new Date(e.created_at).toLocaleString() : "Unknown date"}
            </div>
          </header>

          {e.summary && (
            <p className="text-sm mb-2">
              <strong>Submitter summary:</strong> {e.summary}
            </p>
          )}

          {e.contributor_note && (
            <div className="text-sm bg-gray-50 border-l-4 border-gray-300 p-2 mb-3">
              <strong>Private note:</strong> {e.contributor_note}
            </div>
          )}

          <div className="flex gap-4">
            <form action={approveEvidence} className="flex-1" aria-label={`Approve evidence ${e.id}`}>
              <input type="hidden" name="evidence_id" value={e.id} />
              <input type="hidden" name="moderator_id" value={moderatorId ?? ""} />
              <textarea
                name="moderator_note"
                rows={2}
                placeholder="Optional approval note"
                className="w-full border rounded p-1 mb-2 text-sm"
                aria-label="Optional approval note"
              />
              <SubmitButton label="Approve" />
            </form>

            <form action={rejectEvidence} className="flex-1" aria-label={`Reject evidence ${e.id}`}>
              <input type="hidden" name="evidence_id" value={e.id} />
              <input type="hidden" name="moderator_id" value={moderatorId ?? ""} />
              <textarea
                name="moderator_note"
                required
                rows={3}
                placeholder="Reason for rejection"
                className="w-full border rounded p-1 mb-2 text-sm"
                aria-label="Reason for rejection"
              />
              <SubmitButton label="Reject" />
            </form>
          </div>
        </section>
      ))}
    </>
  );
}
