import { headers } from "next/headers";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import ModerationClient from "./ModerationClient";
import { supabaseServer } from "@/lib/supabase-server";
import {
  getModerationGateStatus,
  canModerate,
} from "@/lib/moderation-guards";
import { releaseExpiredEvidenceAssignments } from "./actions";

type EvidenceRow = {
  id: number;
  title: string;
  created_at: string;
  assigned_moderator_id: string | null;
  user_id: string | null;
};

export default async function ModerationPage() {
  // Avoid rendering at build time
  const hdrs = await headers();
  const isBuildTime = hdrs.get("x-vercel-id") === null;
  if (isBuildTime) return null;

  // Release old assignments (keeps the queue healthy)
  await releaseExpiredEvidenceAssignments(60 * 8);

  // Server-side auth client (reads cookies)
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
      <main className="max-w-3xl mx-auto py-8 space-y-6">
        <section>
          <h1 className="text-2xl font-bold mb-4">Moderation queue</h1>
          <p>You must be logged in to access moderation.</p>
        </section>
      </main>
    );
  }

  // Ensure the user is in the moderators table
  const allowedModerator = await canModerate(moderatorId);
  if (!allowedModerator) {
    return (
      <main className="max-w-3xl mx-auto py-8 space-y-6">
        <section>
          <h1 className="text-2xl font-bold mb-4">Moderation queue</h1>
          <p>You do not have moderator access.</p>
        </section>
      </main>
    );
  }

  // Get gate status (counts pending evidence, required moderations, user moderations)
  const gate = await getModerationGateStatus();

  // Use a service-role client for assignment / counts that must bypass RLS
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );

  // Fetch any evidence already assigned to this moderator (limit 1 shown in UI)
  const { data: queue, error } = await admin
    .from("evidence")
    .select("id, title, created_at, assigned_moderator_id, user_id")
    .eq("assigned_moderator_id", moderatorId)
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(1);

  if (error) {
    console.error("[moderation] fetch failed", error);
    return (
      <main className="max-w-3xl mx-auto py-8 space-y-6">
        <section>
          <h1 className="text-2xl font-bold mb-4">Moderation queue</h1>
          <p className="text-red-600">Failed to load moderation queue.</p>
        </section>
      </main>
    );
  }

  let assignedEvidence: EvidenceRow[] = (queue ?? []) as EvidenceRow[];

  // === AUTO-ASSIGNMENT: give new moderators items so they can reach required moderations ===
  // Behavior:
  // - If the moderator currently has fewer moderations than requiredModerations
  //   and they have no assigned pending evidence, we auto-assign up to
  //   (requiredModerations - userModerations) items from unassigned pending evidence
  //   (excluding evidence they submitted).
  try {
    const userModerations = gate.userModerations ?? 0;
    const requiredModerations = gate.requiredModerations ?? 0;

    const needs = Math.max(0, requiredModerations - userModerations);
    const hasAssigned = assignedEvidence.length > 0;

    if (!hasAssigned && needs > 0) {
      // Pick oldest candidates (not submitted by this moderator)
      const { data: candidates, error: candErr } = await admin
        .from("evidence")
        .select("id")
        .eq("status", "pending")
        .is("assigned_moderator_id", null)
        .neq("user_id", moderatorId)
        .order("created_at", { ascending: true })
        .limit(needs);

      if (candErr) {
        console.error("[moderation] candidate lookup failed", candErr);
      } else if (candidates && candidates.length > 0) {
        const ids = (candidates as any[]).map((c) => c.id);

        // Claim them — update will only affect rows still unassigned
        const { error: updErr } = await admin
          .from("evidence")
          .update({
            assigned_moderator_id: moderatorId,
            assigned_at: new Date().toISOString(),
          })
          .in("id", ids)
          .is("assigned_moderator_id", null);

        if (updErr) {
          console.error("[moderation] auto-assign update failed", updErr);
        } else {
          // Re-fetch assigned evidence so UI shows newly claimed item
          const { data: newQueue, error: newQueueErr } = await admin
            .from("evidence")
            .select("id, title, created_at, assigned_moderator_id, user_id")
            .eq("assigned_moderator_id", moderatorId)
            .eq("status", "pending")
            .order("created_at", { ascending: true })
            .limit(1);

          if (newQueueErr) {
            console.error("[moderation] refetch after auto-assign failed", newQueueErr);
          } else if (newQueue) {
            assignedEvidence = newQueue as EvidenceRow[];
          }
        }
      }
    }
  } catch (e) {
    console.error("[moderation] auto-assign exception", e);
  }

  // Count pending available evidence (unassigned and not owned by the moderator)
  const { count: pendingAvailable, error: pendingErr } = await admin
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

  const pendingCount = pendingAvailable ?? 0;

  // canRequestNewCase historically tracks whether the moderator can click
  // "Get new case" (we keep true here; UI/assign handler will also enforce server rules)
  const canRequestNewCase = true;

  return (
    <main className="max-w-3xl mx-auto py-8 space-y-8">
      {/* Main moderation queue */}
      <section>
        <h1 className="text-2xl font-bold mb-4">Moderation queue</h1>

        <ModerationClient
          evidence={assignedEvidence}
          moderatorId={moderatorId}
          gate={gate}
          pendingAvailable={pendingCount}
          canRequestNewCase={canRequestNewCase}
        />
      </section>

      <hr />

      {/* Extra evidence requests moderation info */}
      <section>
        <h2 className="text-xl font-semibold">Extra: Evidence requests moderation</h2>
        <p className="text-sm text-neutral-600">
          After you've worked through the main moderation queue, you can optionally help with extra
          evidence items in the{" "}
          <Link href="/moderation/company-requests" className="text-blue-700 hover:underline">
            Evidence requests moderation
          </Link>{" "}
          view.
        </p>

        <p className="mt-4 text-xs text-neutral-500">
          That page shows pending, unassigned evidence submissions as optional extra work.
          Decisions are still made in the main moderation queue.
        </p>
      </section>
    </main>
  );
}
