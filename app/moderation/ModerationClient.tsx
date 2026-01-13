"use client";

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
  moderatorId?: string | null;
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
  moderatorId = null,
}: Props) {
  // quick client-side debug to confirm fresh props and re-renders
  console.debug("ModerationClient evidence count:", evidence.length, "moderatorId:", moderatorId);

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
              <div className="flex items-center gap-2">
                <SubmitButton label="Approve" />
                <span className="text-xs text-gray-400">Approve</span>
              </div>
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
              <div className="flex items-center gap-2">
                <SubmitButton label="Reject" />
                <span className="text-xs text-gray-400">Reject</span>
              </div>
            </form>
          </div>
        </section>
      ))}
    </>
  );
}
