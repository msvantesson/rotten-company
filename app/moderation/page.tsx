import { headers } from "next/headers";
import { supabaseServer } from "@/lib/supabase-server";
import { supabaseService } from "@/lib/supabase-service";
import { canModerate, getModerationGateStatus } from "@/lib/moderation-guards";
import ModerationClient from "./ModerationClient";
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

export default async function ModerationPage() {
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

  console.info(
    "[moderation] SSR user present:",
    !!user,
    "userId:",
    moderatorId,
    "error:",
    userError,
  );

  if (!moderatorId) {
    return (
      <main className="max-w-3xl mx-auto py-8">
        <h1 className="text-2xl font-bold mb-4">Moderation queue</h1>
        <p>You must be logged in to access moderation.</p>
      </main>
    );
  }

  const allowedModerator = await canModerate(moderatorId);
  if (!allowedModerator) {
    return (
      <main className="max-w-3xl mx-auto py-8">
        <h1 className="text-2xl font-bold mb-4">Moderation queue</h1>
        <p>You do not have moderator access.</p>
      </main>
    );
  }

  const gate = await getModerationGateStatus();
  const service = supabaseService();

  const { data: queue, error } = await service
    .from("evidence")
    .select(
      "id, title, created_at, assigned_moderator_id, user_id",
    )
    .eq("assigned_moderator_id", moderatorId)
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(1);

  if (error) {
    console.error("[moderation] fetch failed", error);
    return (
      <main className="max-w-3xl mx-auto py-8">
        <h1 className="text-2xl font-bold mb-4">Moderation queue</h1>
        <p className="text-red-600">Failed to load moderation queue.</p>
      </main>
    );
  }

  const assignedEvidence: EvidenceRow[] = queue ?? [];

  const { count: pendingAvailable, error: pendingErr } = await service
    .from("evidence")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending")
    .is("assigned_moderator_id", null)
    .neq("user_id", moderatorId);

  if (pendingErr) {
    console.error(
      "[moderation] pending available evidence count failed",
      pendingErr,
    );
  }

  const pendingEvidenceCount = pendingAvailable ?? 0;

  const canRequestNewCase =
    gate.allowed &&
    assignedEvidence.length === 0 &&
    pendingEvidenceCount > 0;

  return (
    <main className="max-w-3xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-2">Moderation queue</h1>

      <div className="mb-4 p-3 rounded border bg-yellow-50 text-sm">
        <strong>Debug</strong>
        <div>SSR user present: {String(!!user)}</div>
        <div>SSR user id: {moderatorId}</div>
        <div>
          Evidence gate: {gate.userModerations} of{" "}
          {gate.requiredModerations} required moderations (
          {gate.allowed ? "unlocked" : "locked"})
        </div>
        <div>Pending available evidence: {pendingEvidenceCount}</div>
      </div>

      <ModerationClient
        evidence={assignedEvidence}
        moderatorId={moderatorId}
        gate={gate}
        pendingAvailable={pendingEvidenceCount}
        canRequestNewCase={canRequestNewCase}
      />
    </main>
  );
}
