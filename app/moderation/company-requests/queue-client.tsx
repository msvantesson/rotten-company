"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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
  const router = useRouter();
  const hasAssigned = !!assignedRequest;

  // Local flag so the button immediately disables after click,
  // even before the redirect finishes.
  const [canRequestLocally, setCanRequestLocally] =
    useState<boolean>(canRequestNewCase);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    setCanRequestLocally(canRequestNewCase);
  }, [canRequestNewCase]);

  // Client-side handler that calls the new claim API endpoint
  async function handleGetNewCase() {
    if (!canRequestLocally || isLoading) return;

    // Immediately prevent further clicks in this session
    setCanRequestLocally(false);
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/moderation/claim-next", {
        method: "POST",
      });

      const result = await response.json();

      if (!result.ok) {
        setErrorMessage(result.error || "Failed to claim item");
        setCanRequestLocally(canRequestNewCase); // Re-enable on error
        setIsLoading(false);
        return;
      }

      // Navigate based on the claimed item type
      const { kind, item_id } = result.data;
      
      if (kind === "evidence") {
        router.push(`/admin/moderation/evidence/${item_id}`);
      } else if (kind === "company_request") {
        // TODO: Create company_request detail page similar to evidence page
        // For now, redirect back to queue as a safe fallback to avoid 404
        // when browser session is stale (matching the behavior in actions.ts line 109)
        router.push("/moderation/company-requests");
      }
    } catch (err) {
      setErrorMessage("Network error while claiming item");
      setCanRequestLocally(canRequestNewCase); // Re-enable on error
      setIsLoading(false);
      console.error("[handleGetNewCase] error:", err);
    }
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

      {errorMessage && (
        <section className="rounded-md border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">{errorMessage}</p>
        </section>
      )}

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
                disabled={!canRequestLocally || isLoading}
                className="rounded-md bg-black px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
              >
                {isLoading ? "Assigning…" : "Get next evidence request"}
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
