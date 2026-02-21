import { headers } from "next/headers";
import { supabaseServer } from "@/lib/supabase-server";
import { supabaseService } from "@/lib/supabase-service";
import { canModerate, getModerationGateStatus } from "@/lib/moderation-guards";
import { logDebug } from "@/lib/log";
import ModerationClient from "../ModerationClient";
import { releaseExpiredEvidenceAssignments } from "@/lib/release-expired-evidence";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

type EvidenceRow = {
  id: number;
  title: string;
  created_at: string;
  assigned_moderator_id: string | null;
  user_id: string | null;
};

export default async function ModerationEvidencePage() {
  const hdrs = await headers();
  const isBuildTime = hdrs.get("x-vercel-id") === null;
  if (isBuildTime) return null;

  // Release assignments older than 8 hours
  await releaseExpiredEvidenceAssignments(60 * 8);

  const userClient = await supabaseServer();
  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();

  const moderatorId = user?.id ?? null;

  // TODO: remove debug logging once stabilized
  logDebug("moderation-evidence", "SSR auth result", {
    userPresent: !!user,
    userId: moderatorId,
    userError,
  });

  if (!moderatorId) {
    return (
      <main className="max-w-3xl mx-auto py-8 space-y-6">
        <section>
          <h1 className="text-2xl font-bold mb-4">Evidence moderation queue</h1>
          <p>You must be logged in to access moderation.</p>
        </section>
      </main>
    );
  }

  const allowedModerator = await canModerate(moderatorId);

  // TODO: remove debug logging once stabilized
  logDebug("moderation-evidence", "moderator check", {
    userId: moderatorId,
    allowedModerator,
  });

  if (!allowedModerator) {
    return (
      <main className="max-w-3xl mx-auto py-8 space-y-6">
        <section>
          <h1 className="text-2xl font-bold mb-4">Evidence moderation queue</h1>
          <p>You do not have moderator access.</p>
        </section>
      </main>
    );
  }

  const gate = await getModerationGateStatus();
  const service = supabaseService();

  // TODO: remove debug logging once stabilized
  logDebug("moderation-evidence", "gate status", {
    requiredModerations: gate.requiredModerations,
    userModerations: gate.userModerations,
    allowed: gate.allowed,
  });

  const { data: queue, error } = await service
    .from("evidence")
    .select("id, title, created_at, assigned_moderator_id, user_id")
    .eq("assigned_moderator_id", moderatorId)
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(1);

  if (error) {
    console.error("[moderation/evidence] fetch failed", error);
    return (
      <main className="max-w-3xl mx-auto py-8 space-y-6">
        <section>
          <h1 className="text-2xl font-bold mb-4">Evidence moderation queue</h1>
          <p className="text-red-600">Failed to load moderation queue.</p>
        </section>
      </main>
    );
  }

  let assignedEvidence: EvidenceRow[] = queue ?? [];

  // === AUTO-ASSIGNMENT ===
  // If the moderator has no assigned pending evidence and they haven't yet
  // completed the required moderations, automatically assign them up to
  // (requiredModerations - userModerations) items from unassigned pending evidence.
  try {
    const userModerations = gate.userModerations ?? 0;
    const requiredModerations = gate.requiredModerations ?? 0;

    const needs = Math.max(0, requiredModerations - userModerations);
    const hasAssigned = assignedEvidence.length > 0;

    if (!hasAssigned && needs > 0) {
      const { data: candidates, error: candErr } = await service
        .from("evidence")
        .select("id")
        .eq("status", "pending")
        .is("assigned_moderator_id", null)
        .or(`user_id.is.null,user_id.neq.${moderatorId}`)
        .order("created_at", { ascending: true })
        .limit(needs);

      if (candErr) {
        console.error("[moderation/evidence] candidate lookup failed", candErr);
      } else if (candidates && (candidates as any[]).length > 0) {
        const ids = (candidates as any[]).map((c) => c.id);

        const { error: updErr } = await service
          .from("evidence")
          .update({
            assigned_moderator_id: moderatorId,
            assigned_at: new Date().toISOString(),
          })
          .in("id", ids)
          .is("assigned_moderator_id", null);

        if (updErr) {
          console.error("[moderation/evidence] auto-assign update failed", updErr);
        } else {
          const { data: newQueue, error: newQueueErr } = await service
            .from("evidence")
            .select("id, title, created_at, assigned_moderator_id, user_id")
            .eq("assigned_moderator_id", moderatorId)
            .eq("status", "pending")
            .order("created_at", { ascending: true })
            .limit(1);

          if (newQueueErr) {
            console.error(
              "[moderation/evidence] refetch after auto-assign failed",
              newQueueErr,
            );
          } else if (newQueue) {
            assignedEvidence = newQueue as EvidenceRow[];
          }
        }
      }
    }
  } catch (e) {
    console.error("[moderation/evidence] auto-assign exception", e);
  }

  const { count: pendingAvailable, error: pendingErr } = await service
    .from("evidence")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending")
    .is("assigned_moderator_id", null)
    .or(`user_id.is.null,user_id.neq.${moderatorId}`);

  if (pendingErr) {
    console.error(
      "[moderation/evidence] pending available evidence count failed",
      pendingErr,
    );
  }

  const pendingCount = pendingAvailable ?? 0;

  // TODO: remove debug logging once stabilized
  logDebug("moderation-evidence", "pending counts", {
    assignedEvidenceCount: assignedEvidence.length,
    pendingCount,
  });

  return (
    <main className="max-w-3xl mx-auto py-8 space-y-8">
      <section>
        <h1 className="text-2xl font-bold mb-4">Evidence moderation queue</h1>

        <ModerationClient
          evidence={assignedEvidence}
          moderatorId={moderatorId}
          gate={gate}
          pendingAvailable={pendingCount}
          canRequestNewCase={true}
        />
      </section>
    </main>
  );
}
