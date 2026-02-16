"use client";

import { useEffect, useState, useTransition } from "react";
import { assignNextCompanyRequest } from "./actions";

type EvidenceRequestRow = {
  id: number;
  title: string;
  summary: string | null;
  status: string;
  created_at: string;
  user_id: string | null;
  company_id: number | null;
  evidence_type: string | null;
};

type CompanyRequestRow = {
  id: string;
  name: string;
  status: string;
  created_at: string;
};

type AssignedItem =
  | { kind: "evidence"; data: EvidenceRequestRow }
  | { kind: "company_request"; data: CompanyRequestRow }
  | null;

type DebugInfo = {
  ssrUserPresent: boolean;
  ssrUserId: string | null;
  isModerator: boolean;
};

type GateStatus = {
  pendingEvidence: number;
  requiredModerations: number;
  userModerations: number;
  allowed: boolean;
};

export default function CompanyRequestsQueue({
  assignedItem,
  debug,
  gate,
  pendingCompanyRequests,
  canRequestNewCase,
  errorCode,
}: {
  assignedItem: AssignedItem;
  debug: DebugInfo;
  gate: GateStatus;
  pendingCompanyRequests: number; // now "pending evidence requests"
  canRequestNewCase: boolean;
  errorCode: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  const hasAssigned = !!assignedItem;

  // Map error codes to friendly messages
  const getErrorMessage = (code: string | null): string | null => {
    if (!code) return null;
    switch (code) {
      case "no-eligible-items":
        return "No eligible moderation items available at this time. Please check back later.";
      case "claim-failed":
        return "Failed to claim the next item. Please try again.";
      case "self-moderation-prevented":
        return "You were assigned your own submission. The system has automatically unassigned it. Please try again to get a different item.";
      case "only-self-submissions":
        return "All available items in the queue were submitted by you. You cannot moderate your own submissions. Please check back later when other items are available.";
      default:
        return "An error occurred. Please try again.";
    }
  };

  const errorMessage = getErrorMessage(errorCode);

  // Local flag so the button immediately disables after click,
  // even before the redirect finishes.
  const [canRequestLocally, setCanRequestLocally] =
    useState<boolean>(canRequestNewCase);

  useEffect(() => {
    setCanRequestLocally(canRequestNewCase);
  }, [canRequestNewCase]);

  function handleGetNewCase() {
    if (!canRequestLocally || isPending) return;

    // Immediately prevent further clicks in this session
    setCanRequestLocally(false);

    startTransition(() => {
      void assignNextCompanyRequest();
    });
  }

  const showGetNewButton =
    debug.isModerator && gate.allowed && !hasAssigned && pendingCompanyRequests > 0;

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">
          Evidence requests moderation
        </h1>
        <p className="text-sm text-neutral-600">
          Optional extra evidence items you can help moderate, after the main
          moderation queue.
        </p>
      </header>

      {errorMessage && (
        <section className="rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-800">
          {errorMessage}
        </section>
      )}

      <section className="rounded-md border bg-white p-4 space-y-2">
        <p className="text-sm font-medium">Debug</p>
        <p className="text-xs text-neutral-600">
          SSR user present: {String(debug.ssrUserPresent)}
        </p>
        <p className="text-xs text-neutral-600">
          SSR user id: {debug.ssrUserId ?? "null"}
        </p>
        <p className="text-xs text-neutral-600">
          isModerator: {String(debug.isModerator)}
        </p>
        <p className="text-xs text-neutral-600">
          Evidence gate: {gate.userModerations} of {gate.requiredModerations}{" "}
          required moderations ({gate.allowed ? "unlocked" : "locked"})
        </p>
        <p className="text-xs text-neutral-600">
          Pending items (company + evidence requests): {pendingCompanyRequests}
        </p>
      </section>

      {!debug.isModerator && (
        <p className="text-sm text-neutral-600">
          You need to be a moderator to access evidence requests.
        </p>
      )}

      {debug.isModerator && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-neutral-700">
              {hasAssigned
                ? "You have an assigned moderation item."
                : "You have no assigned moderation item yet."}
            </p>

            {showGetNewButton && (
              <button
                type="button"
                onClick={handleGetNewCase}
                disabled={!canRequestLocally || isPending}
                className="rounded-md bg-black px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
              >
                {isPending ? "Assigning…" : "Get next item"}
              </button>
            )}
          </div>

          {hasAssigned && assignedItem && (
            <div className="rounded-md border bg-white p-4 space-y-2 text-sm">
              <p className="text-xs uppercase tracking-wide text-neutral-500">
                {assignedItem.kind === "evidence"
                  ? "Assigned evidence"
                  : "Assigned company request"}
              </p>
              <p className="font-medium">
                {assignedItem.kind === "evidence"
                  ? assignedItem.data.title
                  : assignedItem.data.name}
              </p>
              {assignedItem.kind === "evidence" &&
                assignedItem.data.summary && (
                  <p className="text-xs text-neutral-600 line-clamp-3">
                    {assignedItem.data.summary}
                  </p>
                )}
              <p className="text-[11px] text-neutral-400">
                Created:{" "}
                {new Date(assignedItem.data.created_at).toLocaleString()}
              </p>
              <a
                href={
                  assignedItem.kind === "evidence"
                    ? `/admin/moderation/evidence/${assignedItem.data.id}`
                    : `/admin/moderation/company-requests/${assignedItem.data.id}`
                }
                className="inline-block mt-2 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
              >
                Open assigned item
              </a>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
