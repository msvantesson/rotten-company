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
      <main className="max-w-3xl mx-auto py-8 space-y-6">
        <section>
          <h1 className="text-2xl font-bold mb-4">Moderation queue</h1>
          <p>You must be logged in to access moderation.</p>
        </section>
      </main>
    );
  }

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

  const gate = await getModerationGateStatus();
  const service = supabaseService();

  const { data: queue, error } = await service
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

  const pendingCount = pendingAvailable ?? 0;

  return (
    <main className="max-w-3xl mx-auto py-8 space-y-8">
      {/* Main moderation queue */}
      <section>
        <h1 className="text-2xl font-bold mb-4">Moderation queue</h1>
        <ModerationClient
          assignedEvidence={assignedEvidence}
          pendingAvailable={pendingCount}
          gate={gate}
        />
      </section>

      {/* Extra work: Evidence requests moderation */}
      <section className="border-t pt-6">
        <h2 className="text-lg font-semibold mb-2">
          Extra: Evidence requests moderation
        </h2>
        <p className="text-sm text-neutral-700 mb-3">
          After you&apos;ve worked through the main moderation queue, you can
          optionally help with extra evidence items in the{" "}
          <a
            href="/moderation/company-requests"
            className="underline text-blue-600 hover:text-blue-800"
          >
            Evidence requests moderation
          </a>{" "}
          view.
        </p>
        <p className="text-xs text-neutral-500">
          That page shows pending, unassigned evidence submissions as optional
          extra work. Decisions are still made here in the main moderation
          queue.
        </p>
      </section>
    </main>
  );
}
