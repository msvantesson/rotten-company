"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { assignNextCase } from "./actions";

type GateStatus = {
  pendingEvidence: number;
  requiredModerations: number;
  userModerations: number;
  allowed: boolean;
};

type AssignedItem = {
  kind: "evidence" | "company_request";
  id: string;
  title: string;
  created_at: string;
  href: string;
};

type Props = {
  moderatorId: string;
  gate: GateStatus;
  pendingCount: number;
  assignedItems: AssignedItem[];
};

export default function ModerationQueueClient({
  moderatorId,
  gate,
  pendingCount,
  assignedItems,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [noPending, setNoPending] = useState(false);
  const [alreadyAssigned, setAlreadyAssigned] = useState(false);
  // Disable locally after first click to prevent double-submit
  const [clicked, setClicked] = useState(false);

  const hasAssigned = assignedItems.length > 0;

  // Reset local state when SSR props change (e.g. navigating back)
  useEffect(() => {
    setNoPending(false);
    setClicked(false);
    setAlreadyAssigned(false);
  }, [pendingCount]);

  function handleAssignNext() {
    if (clicked || isPending || hasAssigned) return;
    setClicked(true);

    startTransition(async () => {
      const result = await assignNextCase();
      if (result && "noPending" in result && result.noPending) {
        setNoPending(true);
        setClicked(false);
      } else if (result && "reason" in result && result.reason === "already_assigned") {
        setAlreadyAssigned(true);
        setClicked(false);
      }
      // On redirect the component unmounts so no cleanup needed
    });
  }

  const canAssign = !clicked && !isPending && !noPending && !hasAssigned;

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
      </section>

      {/* Currently assigned items */}
      {assignedItems.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-neutral-700">
            Currently assigned to you
          </h2>
          {assignedItems.map((item) => (
            <div
              key={`${item.kind}-${item.id}`}
              className="rounded-md border bg-white p-4 space-y-2"
            >
              <div className="space-y-1">
                <p className="text-xs text-neutral-500 capitalize">
                  {item.kind === "company_request" ? "Company request" : "Evidence"}
                </p>
                <p className="text-sm font-medium">{item.title}</p>
                <p className="text-xs text-neutral-500">
                  Submitted {new Date(item.created_at).toLocaleString()}
                </p>
              </div>
              <Link
                href={item.href}
                className="inline-flex items-center rounded-md bg-black px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-900"
              >
                Review & moderate
              </Link>
            </div>
          ))}
        </section>
      )}

      {/* No pending cases state */}
      {noPending && (
        <section className="rounded-md border p-4 text-sm text-neutral-600">
          No pending cases.
        </section>
      )}

      {/* Assign next case button */}
      {!noPending && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={handleAssignNext}
            disabled={!canAssign}
            className="inline-flex items-center rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-neutral-900 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? "Assigning…" : "Assign next case"}
          </button>
          {(hasAssigned || alreadyAssigned) && (
            <p className="text-xs text-neutral-500">
              You already have a case assigned. Please review it before requesting a new one.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
