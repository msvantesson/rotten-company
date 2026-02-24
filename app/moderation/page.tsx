import { headers } from "next/headers";
import { supabaseServer } from "@/lib/supabase-server";
import { supabaseService } from "@/lib/supabase-service";
import { getModerationGateStatus } from "@/lib/moderation-guards";
import { logDebug } from "@/lib/log";
import { releaseExpiredEvidenceAssignments } from "@/lib/release-expired-evidence";
import { getAssignedModerationItems } from "@/lib/getAssignedModerationItems";
import ModerationQueueClient from "./ModerationQueueClient";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

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

  // TODO: remove debug logging once stabilized
  logDebug("moderation", "SSR auth result", {
    userPresent: !!user,
    userId: moderatorId,
    userError,
  });

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

  const gate = await getModerationGateStatus();
  const service = supabaseService();

  // TODO: remove debug logging once stabilized
  logDebug("moderation", "gate status", {
    requiredModerations: gate.requiredModerations,
    userModerations: gate.userModerations,
    allowed: gate.allowed,
  });

  // Count total pending items (evidence + company_requests) available for assignment
  // Two counts: total unassigned, and unassigned excluding submitted by this moderator
  const [
    { count: totalEvidenceCount, error: totalEvidenceErr },
    { count: pendingEvidenceCount, error: pendingEvidenceErr },
  ] = await Promise.all([
    service
      .from("evidence")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending")
      .is("assigned_moderator_id", null),
    service
      .from("evidence")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending")
      .is("assigned_moderator_id", null)
      .or(`user_id.is.null,user_id.neq.${moderatorId}`),
  ]);

  if (totalEvidenceErr) {
    console.error("[moderation] total evidence count failed", totalEvidenceErr);
  }

  if (pendingEvidenceErr) {
    console.error("[moderation] pending evidence count failed", pendingEvidenceErr);
  }

  const [
    { count: totalCompanyRequestsCount, error: totalCompanyErr },
    { count: pendingCompanyRequestsCount, error: pendingCompanyErr },
  ] = await Promise.all([
    service
      .from("company_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending")
      .is("assigned_moderator_id", null),
    service
      .from("company_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending")
      .is("assigned_moderator_id", null)
      .or(`user_id.is.null,user_id.neq.${moderatorId}`),
  ]);

  if (totalCompanyErr) {
    console.error("[moderation] total company_requests count failed", totalCompanyErr);
  }

  if (pendingCompanyErr) {
    console.error("[moderation] pending company_requests count failed", pendingCompanyErr);
  }

  const totalCount =
    (totalEvidenceCount ?? 0) + (totalCompanyRequestsCount ?? 0);

  const pendingCount =
    (pendingEvidenceCount ?? 0) + (pendingCompanyRequestsCount ?? 0);

  // TODO: remove debug logging once stabilized
  logDebug("moderation", "pending counts", {
    totalEvidenceCount,
    totalCompanyRequestsCount,
    totalCount,
    pendingEvidenceCount,
    pendingCompanyRequestsCount,
    pendingCount,
  });

  let assignedItems: Awaited<ReturnType<typeof getAssignedModerationItems>> = [];
  let assignedItemsFetchError = false;
  try {
    assignedItems = await getAssignedModerationItems(moderatorId);
  } catch (err) {
    console.error("[moderation] getAssignedModerationItems failed", err);
    assignedItemsFetchError = true;
  }

  return (
    <main className="max-w-3xl mx-auto py-8 space-y-8">
      <section>
        <h1 className="text-2xl font-bold mb-4">Moderation queue</h1>

        <ModerationQueueClient
          moderatorId={moderatorId}
          gate={gate}
          totalCount={totalCount}
          pendingCount={pendingCount}
          assignedItems={assignedItems}
          assignedItemsFetchError={assignedItemsFetchError}
        />
      </section>
    </main>
  );
}

