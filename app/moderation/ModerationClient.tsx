"use client";

import Link from "next/link";

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
}: Props) {
  const hasAssigned = evidence.length > 0;
  const current = hasAssigned ? evidence[0] : null;

  return (
    <section className="space-y-6">
      {/* Info box explaining the flow */}
      <section className="rounded-md border bg-white p-4 space-y-3 text-sm">
        {!gate.allowed ? (
          <p className="text-neutral-700">
            Before helping with extra evidence requests, please moderate{" "}
            {gate.requiredModerations} evidence item
            {gate.requiredModerations === 1 ? "" : "s"} in total. You have
            completed {gate.userModerations}.
          </p>
        ) : (
          <p className="text-neutral-700">
            You&apos;ve completed the required evidence moderations. You can
            continue working through items assigned to you here, and optionally
            pick up extra cases in{" "}
            <span className="font-medium">Evidence requests moderation</span>.
          </p>
        )}

        <p className="text-xs text-neutral-500">
          Debug: pendingAvailable evidence (unassigned, not yours) ={" "}
          {pendingAvailable}.
        </p>
      </section>

      {/* No assigned evidence */}
      {!hasAssigned && (
        <section className="rounded-md border p-4 text-sm text-neutral-600">
          No pending evidence assigned to you.
        </section>
      )}

      {/* Assigned evidence card with link to full moderation UI */}
      {hasAssigned && current && (
        <section className="rounded-md border bg-white p-4 space-y-3">
          <div className="space-y-1">
            <p className="text-xs text-neutral-500">
              Item 1 of 1 • Assigned to you ({moderatorId})
            </p>
            <h2 className="text-lg font-semibold">{current.title}</h2>
            <p className="text-xs text-neutral-500">
              Submitted {new Date(current.created_at).toLocaleString()}
            </p>
          </div>

          <div className="pt-2">
            <Link
              href={`/admin/moderation/evidence/${current.id}`}
              className="inline-flex items-center rounded-md bg-black px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-900"
            >
              View evidence &amp; moderate
            </Link>
          </div>
        </section>
      )}
    </section>
  );
}
