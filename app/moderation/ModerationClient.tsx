"use client";

import { useTransition } from "react";
import { assignNextEvidence } from "./actions";

type EvidenceRow = {
  id: number;
  title: string;
  created_at: string;
  assigned_moderator_id: string | null;
  user_id: string | null;
};

type ModerationGateStatus = {
  pendingEvidence: number;
  requiredModerations: number;
  userModerations: number;
  allowed: boolean;
};

type Props = {
  evidence: EvidenceRow[];
  moderatorId: string;
  gate: ModerationGateStatus;
  pendingAvailable: number;
  canRequestNewCase: boolean;
};

export default function ModerationClient({
  evidence,
  moderatorId,
  gate,
  pendingAvailable,
  canRequestNewCase,
}: Props) {
  const [isAssigning, startAssign] = useTransition();

  const hasAssigned = evidence.length > 0;
  const current = hasAssigned ? evidence[0] : null;

  function handleGetNewCase() {
    if (!canRequestNewCase || isAssigning) return;
    startAssign(() => {
      void assignNextEvidence();
    });
  }

  return (
    <section className="space-y-6">
      {/* Gate info + “get new case” button */}
      <section className="rounded-md border bg-white p-4 space-y-3 text-sm">
        {!gate.allowed ? (
          <p className="text-neutral-700">
            Before picking up cases, please help by moderating{" "}
            {gate.requiredModerations} evidence item
            {gate.requiredModerations === 1 ? "" : "s"} in total. Your
            completed moderations: {gate.userModerations}.
          </p>
        ) : (
          <p className="text-neutral-700">
            You’ve completed the required evidence moderations. You can
            optionally pick up evidence cases to review their details.
          </p>
        )}

        <button
          type="button"
          onClick={handleGetNewCase}
          disabled={!canRequestNewCase || isAssigning}
          className="inline-flex items-center rounded-md border px-3 py-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
        >
          {isAssigning ? "Assigning…" : "Get a new evidence item"}
        </button>

        {!canRequestNewCase && gate.allowed && hasAssigned && (
          <p className="text-xs text-neutral-500">
            You already have an assigned evidence item below. Complete that
            review before requesting another.
          </p>
        )}

        {!canRequestNewCase &&
          gate.allowed &&
          !hasAssigned &&
          pendingAvailable === 0 && (
            <p className="text-xs text-neutral-500">
              There are currently no pending evidence items to assign.
            </p>
          )}
      </section>

      {/* No assigned evidence */}
      {!hasAssigned && (
        <section className="rounded-md border p-4 text-sm text-neutral-600">
          No pending evidence assigned to you.
        </section>
      )}

      {/* Assigned evidence card – keep your existing approve/reject UI here */}
      {hasAssigned && current && (
        <section className="rounded-md border bg-white p-4 space-y-3">
          <div className="space-y-1">
            <p className="text-xs text-neutral-500">
              Item 1 of 1 • Assigned to you
            </p>
            <h2 className="text-lg font-semibold">{current.title}</h2>
            <p className="text-xs text-neutral-500">
              Submitted {new Date(current.created_at).toLocaleString()}
            </p>
          </div>

          {/* TODO: preserve your existing “View evidence” + Approve / Reject controls here */}
        </section>
      )}
    </section>
  );
}
