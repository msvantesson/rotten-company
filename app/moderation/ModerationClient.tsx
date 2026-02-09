"use client";

import { useMemo, useState } from "react";

type Evidence = {
  id: number;
  title: string;
  created_at: string;
  assigned_moderator_id?: string | null;
};

type Props = {
  evidence: Evidence[];
  moderatorId: string;
};

export default function ModerationClient({
  evidence,
  moderatorId,
}: Props) {
  const myQueue = useMemo(
    () =>
      evidence.filter(
        (e) =>
          !e.assigned_moderator_id ||
          e.assigned_moderator_id === moderatorId
      ),
    [evidence, moderatorId]
  );

  const [index, setIndex] = useState(0);
  const current = myQueue[index] ?? null;

  if (!myQueue.length) {
    return (
      <p className="text-sm text-gray-500">
        No pending evidence assigned to you.
      </p>
    );
  }

  function next() {
    setIndex((i) => Math.min(i + 1, myQueue.length - 1));
  }

  function prev() {
    setIndex((i) => Math.max(i - 1, 0));
  }

  return (
    <div className="border rounded p-6 space-y-4">
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>
          Item {index + 1} of {myQueue.length}
        </span>
      </div>

      <div>
        <h2 className="text-lg font-semibold">{current.title}</h2>
        <p className="text-xs text-gray-400 mt-1">
          Submitted at {new Date(current.created_at).toLocaleString()}
        </p>

        <a
          href={`/my-evidence/${current.id}`}
          className="text-sm text-blue-600 hover:underline mt-2 inline-block"
        >
          View full evidence →
        </a>
      </div>

      <div className="flex gap-2 pt-4">
        <button
          type="button"
          onClick={prev}
          disabled={index === 0}
          className="px-3 py-1 rounded bg-gray-100 text-sm disabled:opacity-50"
        >
          Previous
        </button>

        <button
          type="button"
          onClick={next}
          disabled={index >= myQueue.length - 1}
          className="px-3 py-1 rounded bg-gray-100 text-sm disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}
