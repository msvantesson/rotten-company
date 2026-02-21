import { headers } from "next/headers";
import { supabaseServer } from "@/lib/supabase-server";
import { supabaseService } from "@/lib/supabase-service";
import { canModerate, getModerationGateStatus } from "@/lib/moderation-guards";
import { logDebug } from "@/lib/log";
import ModerationQueueClient from "./ModerationQueueClient";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function ModerationPage() {
  const hdrs = await headers();
  const isBuildTime = hdrs.get("x-vercel-id") === null;
  if (isBuildTime) return null;

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

  const allowedModerator = await canModerate(moderatorId);

  // TODO: remove debug logging once stabilized
  logDebug("moderation", "moderator check", {
    userId: moderatorId,
    allowedModerator,
  });

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

  // TODO: remove debug logging once stabilized
  logDebug("moderation", "gate status", {
    requiredModerations: gate.requiredModerations,
    userModerations: gate.userModerations,
    allowed: gate.allowed,
  });

  // Count total pending items (evidence + company_requests) available for assignment
  const { count: pendingEvidenceCount, error: pendingEvidenceErr } =
    await service
      .from("evidence")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending")
      .is("assigned_moderator_id", null)
      .or(`user_id.is.null,user_id.neq.${moderatorId}`);

  if (pendingEvidenceErr) {
    console.error("[moderation] pending evidence count failed", pendingEvidenceErr);
  }

  const { count: pendingCompanyRequestsCount, error: pendingCompanyErr } =
    await service
      .from("company_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending")
      .is("assigned_moderator_id", null)
      .or(`user_id.is.null,user_id.neq.${moderatorId}`);

  if (pendingCompanyErr) {
    console.error("[moderation] pending company_requests count failed", pendingCompanyErr);
  }

  const pendingCount =
    (pendingEvidenceCount ?? 0) + (pendingCompanyRequestsCount ?? 0);

  // TODO: remove debug logging once stabilized
  logDebug("moderation", "pending counts", {
    pendingEvidenceCount,
    pendingCompanyRequestsCount,
    pendingCount,
  });

  return (
    <main className="max-w-3xl mx-auto py-8 space-y-8">
      <section>
        <h1 className="text-2xl font-bold mb-4">Moderation queue</h1>

        <ModerationQueueClient
          moderatorId={moderatorId}
          gate={gate}
          pendingCount={pendingCount}
        />
      </section>
    </main>
  );
}

