"use client";

import { useEffect, useState, useTransition } from "react";
import { assignNextCompanyRequest } from "./actions";

type CompanyRequestRow = {
  id: string;
  name: string;
  why: string | null;
  status: string;
  created_at: string;
  country: string | null;
  website: string | null;
  description: string | null;
  user_id: string | null;
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
  assignedRequest: CompanyRequestRow | null;
  debug: DebugInfo;
  gate: GateStatus;
  pendingCompanyRequests: number;
  canRequestNewCase: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const hasAssigned = !!assignedRequest;

  // Local flag so the button immediately disables after click,
  // even before the redirect finishes.
  const [canRequestLocally, setCanRequestLocally] =
    useState<boolean>(canRequestNewCase);

  useEffect(() => {
    // If the server says you *cannot* request a new case (e.g. because
    // you already have one), sync that down into local state.
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
    debug.isModerator &&
    gate.allowed &&
    !hasAssigned &&
    pendingCompanyRequests > 0;

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">
          Company requests moderation
        </h1>
        <p className="text-sm text-neutral-600">
          Read-only triage view for contributor requests to add new companies.
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
          Pending company requests: {pendingCompanyRequests}
        </p>
      </section>

      {!debug.isModerator && (
        <section className="rounded-md border bg-amber-50 p-4 text-sm text-amber-900">
          You are logged in, but not recognized as a moderator. Add your user id
          to the <code>moderators</code> table.
        </section>
      )}

      {debug.isModerator && (
        <section className="rounded-md border bg-white p-4 space-y-3 text-sm">
          {!gate.allowed ? (
            <p className="text-neutral-700">
              Company requests are optional extra work. First, help by
              moderating {gate.requiredModerations} evidence item
              {gate.requiredModerations === 1 ? "" : "s"} in the main{" "}
              <span className="font-medium">Moderation</span> queue.
            </p>
          ) : (
            <p className="text-neutral-700">
              You’ve completed the required evidence moderations. You can
              optionally pick up company request cases to review their details.
            </p>
          )}

          {showGetNewButton && (
            <button
              type="button"
              onClick={handleGetNewCase}
              disabled={!canRequestLocally || isPending}
              className="mt-1 inline-flex items-center rounded-md border px-3 py-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              {isPending ? "Assigning…" : "Get a new company request"}
            </button>
          )}

          {!showGetNewButton && gate.allowed && hasAssigned && (
            <p className="text-xs text-neutral-500">
              You already have an assigned company request below. Review its
              details before requesting another.
            </p>
          )}

          {!showGetNewButton &&
            gate.allowed &&
            !hasAssigned &&
            pendingCompanyRequests === 0 && (
              <p className="text-xs text-neutral-500">
                There are currently no pending company requests to assign.
              </p>
            )}
        </section>
      )}

      {debug.isModerator && !hasAssigned && pendingCompanyRequests === 0 && (
        <section className="rounded-md border p-4 text-sm text-neutral-600">
          No pending company requests right now.
        </section>
      )}

      {debug.isModerator && hasAssigned && assignedRequest && (
        <section className="space-y-3 rounded-md border bg-white p-4">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">{assignedRequest.name}</h2>
            <p className="text-xs text-neutral-500">
              Submitted{" "}
              {new Date(assignedRequest.created_at).toLocaleString()}
            </p>
          </div>

          {assignedRequest.country && (
            <p className="text-xs text-neutral-600">
              Country: {assignedRequest.country}
            </p>
          )}

          {assignedRequest.website && (
            <p className="text-xs text-neutral-600">
              Website:{" "}
              <a
                href={assignedRequest.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline"
              >
                {assignedRequest.website}
              </a>
            </p>
          )}

          {assignedRequest.why && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-neutral-600">
                Why this company?
              </p>
              <p className="text-sm text-neutral-800 whitespace-pre-wrap">
                {assignedRequest.why}
              </p>
            </div>
          )}

          {assignedRequest.description && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-neutral-600">
                Additional details
              </p>
              <p className="text-sm text-neutral-800 whitespace-pre-wrap">
                {assignedRequest.description}
              </p>
            </div>
          )}

          <p className="text-xs text-neutral-500 italic">
            This page is read-only. Admins can use this context when deciding
            whether and how to create a new company entry.
          </p>
        </section>
      )}
    </main>
  );
}
