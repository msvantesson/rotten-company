"use client";

import { useEffect, useState, useTransition } from "react";
import { assignNextCase } from "./actions";

type GateStatus = {
  pendingEvidence: number;
  requiredModerations: number;
  userModerations: number;
  allowed: boolean;
};

type Props = {
  moderatorId: string;
  gate: GateStatus;
  pendingCount: number;
};

export default function ModerationQueueClient({
  moderatorId,
  gate,
  pendingCount,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [noPending, setNoPending] = useState(false);
  // Disable locally after first click to prevent double-submit
  const [clicked, setClicked] = useState(false);

  // Reset local state when SSR props change (e.g. navigating back)
  useEffect(() => {
    setNoPending(false);
    setClicked(false);
  }, [pendingCount]);

  function handleAssignNext() {
    if (clicked || isPending) return;
    setClicked(true);

    startTransition(async () => {
      const result = await assignNextCase();
      if (result && "noPending" in result && result.noPending) {
        setNoPending(true);
        setClicked(false);
      }
      // On redirect the component unmounts so no cleanup needed
    });
  }

  const canAssign = !clicked && !isPending && !noPending;

  return (
    <section className="space-y-6">
      {/* Gate status info */}
      <section className="rounded-md border bg-white p-4 space-y-3 text-sm">
        {!gate.allowed ? (
          <p className="text-neutral-700">
            To unlock all moderation features, please moderate{" "}
            {gate.requiredModerations} evidence item
            {gate.requiredModerations === 1 ? "" : "s"} in total. You have
            completed {gate.userModerations}.
          </p>
        ) : (
          <p className="text-neutral-700">
            You&apos;ve completed the required moderations. Assign the next
            pending case below.
          </p>
        )}

        {/* TODO: remove debug info once stabilized */}
        {process.env.NODE_ENV !== "production" && (
          <p className="text-xs text-neutral-500">
            Debug: pendingCount={pendingCount}, moderatorId={moderatorId},
            gate.allowed={String(gate.allowed)}, gate.userModerations=
            {gate.userModerations}/{gate.requiredModerations}
          </p>
        )}
      </section>

      {/* No pending cases state */}
      {noPending && (
        <section className="rounded-md border p-4 text-sm text-neutral-600">
          No pending cases.
        </section>
      )}

      {/* Assign next case button */}
      {!noPending && (
        <div>
          <button
            type="button"
            onClick={handleAssignNext}
            disabled={!canAssign}
            className="inline-flex items-center rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-neutral-900 disabled:opacity-50"
          >
            {isPending ? "Assigning…" : "Assign next case"}
          </button>
        </div>
      )}
    </section>
  );
}
