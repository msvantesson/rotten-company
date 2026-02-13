"use client";

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
  canRequestNewCase: boolean; // still passed from page.tsx, but we'll just show it in debug text
};

export default function ModerationClient({
  evidence,
  moderatorId,
  gate,
  pendingAvailable,
  canRequestNewCase,
}: Props) {
  const hasAssigned = evidence.length > 0;
  const current = hasAssigned ? evidence[0] : null;

  return (
    <section className="space-y-6">
      {/* Info box explaining the flow */}
      <section className="rounded-md border bg-white p-4 space-y-3 text-sm">
        {!gate.allowed ? (
          <p className="text-neutral-700">
            Before helping with company requests, please moderate{" "}
            {gate.requiredModerations} evidence item
            {gate.requiredModerations === 1 ? "" : "s"} in total. You have
            completed {gate.userModerations}.
          </p>
        ) : (
          <p className="text-neutral-700">
            You’ve completed the required evidence moderations. Further work
            happens in{" "}
            <span className="font-medium">Company requests moderation</span>.
            Use the “Get a new company request” button on that page to pick up
            new cases.
          </p>
        )}

        <p className="text-xs text-neutral-500">
          Debug: pendingAvailable evidence (unassigned, not yours) ={" "}
          {pendingAvailable}, canRequestNewCase flag ={" "}
          {String(canRequestNewCase)} (not used here).
        </p>
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
              Item 1 of 1 • Assigned to you ({moderatorId})
            </p>
            <h2 className="text-lg font-semibold">{current.title}</h2>
            <p className="text-xs text-neutral-500">
              Submitted {new Date(current.created_at).toLocaleString()}
            </p>
          </div>

          {/* Keep your existing “view evidence / approve / reject” controls here */}
        </section>
      )}
    </section>
  );
}
