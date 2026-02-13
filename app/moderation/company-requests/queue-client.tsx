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
  assignedRequest,
  debug,
  gate,
  pendingCompanyRequests,
  canRequestNewCase,
}: {
  assignedRequest: EvidenceRequestRow | null;
  debug: DebugInfo;
  gate: GateStatus;
  pendingCompanyRequests: number; // now "pending evidence requests"
  canRequestNewCase: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const hasAssigned = !!assignedRequest;

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
          Pending evidence requests: {pendingCompanyRequests}
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
                ? "You have an assigned evidence request."
                : "You have no assigned evidence request yet."}
            </p>

            {showGetNewButton && (
              <button
                type="button"
                onClick={handleGetNewCase}
                disabled={!canRequestLocally || isPending}
                className="rounded-md bg-black px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
              >
                {isPending ? "Assigning…" : "Get next evidence request"}
              </button>
            )}
          </div>

          {hasAssigned && assignedRequest && (
            <div className="rounded-md border bg-white p-4 space-y-2 text-sm">
              <p className="text-xs uppercase tracking-wide text-neutral-500">
                Assigned evidence
              </p>
              <p className="font-medium">{assignedRequest.title}</p>
              {assignedRequest.summary && (
                <p className="text-xs text-neutral-600 line-clamp-3">
                  {assignedRequest.summary}
                </p>
              )}
              <p className="text-[11px] text-neutral-400">
                Created:{" "}
                {new Date(assignedRequest.created_at).toLocaleString()}
              </p>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
