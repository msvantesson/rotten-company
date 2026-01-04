"use client";

import { useState } from "react";

type CategoryBreakdownRow = {
  category_id: number;
  category_name: string;
  evidence_count: number;
  avg_score: number | null;
  flavor: string;
};

export function ScoreDebugPanel({
  score,
  breakdown,
}: {
  score: number | null;
  breakdown: CategoryBreakdownRow[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-6 border border-dashed border-neutral-300 rounded-md p-3 bg-neutral-50 text-xs text-neutral-700">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="font-semibold text-neutral-800 underline underline-offset-2"
      >
        {open ? "Hide score debug" : "Show score debug"}
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          <div>
            <div className="font-semibold">Overall Rotten Score</div>
            <pre className="mt-1 bg-white border border-neutral-200 rounded p-2 overflow-x-auto">
              {JSON.stringify({ score }, null, 2)}
            </pre>
          </div>

          <div>
            <div className="font-semibold">Category Breakdown</div>
            <pre className="mt-1 bg-white border border-neutral-200 rounded p-2 overflow-x-auto max-h-64">
              {JSON.stringify(breakdown, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
