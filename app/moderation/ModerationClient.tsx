"use client";

type EvidenceRow = {
  id: number;
  title: string;
  summary: string | null;
  contributor_note: string | null;
  created_at: string | null;
};

type ModerationClientProps = {
  evidence: EvidenceRow[];
  approveEvidence: (formData: FormData) => void;
  rejectEvidence: (formData: FormData) => void;
};

export default function ModerationClient({
  evidence,
  approveEvidence,
  rejectEvidence,
}: ModerationClientProps) {
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

      <p className="text-sm text-gray-500 mb-6">
        Pending evidence count: {evidence.length}
      </p>

      {evidence.length === 0 && (
        <p className="text-gray-500">No pending evidence.</p>
      )}

      {evidence.map((e) => (
        <section
          key={e.id}
          className="border border-gray-200 rounded-lg p-4 mb-6"
        >
          <header className="mb-2">
            <strong>{e.title}</strong>
            <div className="text-xs text-gray-500">
              {e.created_at
                ? new Date(e.created_at).toLocaleString()
                : "Unknown date"}
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
            <form action={approveEvidence} className="flex-1">
              <input type="hidden" name="evidence_id" value={e.id} />
              <textarea
                name="moderator_note"
                rows={2}
                placeholder="Optional approval note"
                className="w-full border rounded p-1 mb-2 text-sm"
              />
              <button
                type="submit"
                className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
              >
                Approve
              </button>
            </form>

            <form action={rejectEvidence} className="flex-1">
              <input type="hidden" name="evidence_id" value={e.id} />
              <textarea
                name="moderator_note"
                required
                rows={3}
                placeholder="Reason for rejection"
                className="w-full border rounded p-1 mb-2 text-sm"
              />
              <button
                type="submit"
                className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
              >
                Reject
              </button>
            </form>
          </div>
        </section>
      ))}
    </>
  );
}
