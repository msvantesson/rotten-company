"use client";

import { useState } from "react";

type Evidence = {
  id: number;
  title: string;
  summary: string | null;
  contributor_note: string | null;
  created_at: string;
  assigned_moderator_id?: string | null;
};

type Props = {
  evidence: Evidence[];
  approveEvidence: (formData: FormData) => Promise<void>;
  rejectEvidence: (formData: FormData) => Promise<void>;
  moderatorId: string;
};

export default function ModerationClient({
  evidence,
  approveEvidence,
  rejectEvidence,
  moderatorId,
}: Props) {
  const [note, setNote] = useState("");

  if (!evidence.length) {
    return <p className="text-sm text-gray-500">No pending evidence.</p>;
  }

  return (
    <ul className="space-y-4">
      {evidence.map((ev) => {
        const claimedByOther =
          ev.assigned_moderator_id &&
          ev.assigned_moderator_id !== moderatorId;

        return (
          <li
            key={ev.id}
            className={`border rounded p-4 ${
              claimedByOther ? "opacity-60 bg-gray-50" : ""
            }`}
          >
            <h3 className="font-semibold">{ev.title}</h3>

            {ev.summary && (
              <p className="text-sm text-gray-700 mt-1">{ev.summary}</p>
            )}

            {ev.contributor_note && (
              <p className="text-xs text-gray-500 mt-2">
                Contributor note: {ev.contributor_note}
              </p>
            )}

            {claimedByOther ? (
              <p className="mt-3 text-xs text-gray-500 italic">
                Claimed by another moderator
              </p>
            ) : (
              <form className="mt-4 space-y-2">
                <input type="hidden" name="evidence_id" value={ev.id} />
                <input type="hidden" name="moderator_id" value={moderatorId} />

                <textarea
                  name="moderator_note"
                  placeholder="Moderator note (required for rejection)"
                  className="w-full border rounded p-2 text-sm"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />

                <div className="flex gap-2">
                  <button
                    formAction={approveEvidence}
                    className="px-3 py-1 rounded bg-green-600 text-white text-sm"
                  >
                    Approve
                  </button>

                  <button
                    formAction={rejectEvidence}
                    className="px-3 py-1 rounded bg-red-600 text-white text-sm"
                  >
                    Reject
                  </button>
                </div>
              </form>
            )}
          </li>
        );
      })}
    </ul>
  );
}
