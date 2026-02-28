"use client";

import { useState, useTransition } from "react";
import { assignNextLeaderTenureRequest } from "./leader-tenure-requests/actions";

type Props = {
  pendingCount: number;
  hasAssignedItem: boolean;
};

export default function LeaderTenureRequestsQueueSection({
  pendingCount,
  hasAssignedItem,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [noPending, setNoPending] = useState(false);
  const [clicked, setClicked] = useState(false);

  if (pendingCount === 0 && !hasAssignedItem) return null;

  function handleAssignNext() {
    if (clicked || isPending || hasAssignedItem) return;
    setClicked(true);

    startTransition(async () => {
      await assignNextLeaderTenureRequest();
      // If redirect didn't happen (no items), show feedback
      setNoPending(true);
      setClicked(false);
    });
  }

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">CEO Tenure Requests</h2>

      <div className="rounded-md border bg-white p-4 text-sm space-y-3">
        <p className="text-neutral-700">
          <span className="font-medium">Pending (excluding yours):</span>{" "}
          {pendingCount} unassigned CEO tenure request{pendingCount === 1 ? "" : "s"}
        </p>

        {hasAssignedItem && (
          <p className="text-xs text-neutral-500">
            You already have a CEO tenure request assigned. Review it before requesting a new one.
          </p>
        )}

        {noPending && (
          <p className="text-sm text-neutral-600">No pending CEO tenure requests.</p>
        )}

        {!noPending && (
          <button
            type="button"
            onClick={handleAssignNext}
            disabled={isPending || clicked || hasAssignedItem || pendingCount === 0}
            className="inline-flex items-center rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-neutral-900 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? "Assigning…" : "Assign next CEO tenure request"}
          </button>
        )}
      </div>
    </section>
  );
}
