import { supabaseServer } from "@/lib/supabase-server";
import { supabaseService } from "@/lib/supabase-service";
import { canModerate } from "@/lib/moderation-guards";
import ModerationClient from "./ModerationClient";
import { approveEvidence, rejectEvidence } from "./actions";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function ModerationPage({
  searchParams,
}: {
  searchParams?: { error?: string };
}) {
  const errorParam =
    typeof searchParams?.error === "string" ? searchParams.error : null;

  // User-scoped client (must carry cookies/session)
  const userClient = await supabaseServer();

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();

  console.info(
    "[moderation] SSR user present:",
    !!user,
    "userId:",
    user?.id,
    "error:",
    userError
  );

  const moderatorId = user?.id ?? null;

  // ─────────────────────────────────────────────
  // AUTH: NOT LOGGED IN
  // ─────────────────────────────────────────────
  if (!moderatorId) {
    return (
      <main className="max-w-3xl mx-auto py-8">
        <h1 className="text-2xl font-bold mb-4">Moderation queue</h1>
        <p>You must be logged in to access moderation.</p>
      </main>
    );
  }

  // ─────────────────────────────────────────────
  // AUTH: NOT A MODERATOR
  // ─────────────────────────────────────────────
  const allowed = await canModerate(moderatorId);

  if (!allowed) {
    return (
      <main className="max-w-3xl mx-auto py-8">
        <h1 className="text-2xl font-bold mb-4">Moderation queue</h1>
        <p>You do not have moderator access.</p>
      </main>
    );
  }

  // Service-role client for assignment + queue reads (no RLS surprises)
  const service = supabaseService();

  // ─────────────────────────────────────────────
  // OPTION A: MODERATOR SEES ONE ITEM AT A TIME
  // Behavior:
  // 1) If the moderator already has a pending item assigned → show it.
  // 2) Otherwise, claim exactly one oldest unassigned pending item.
  // 3) Fetch again and show only what’s assigned to this moderator.
  // ─────────────────────────────────────────────

  // Step 1: fetch up to 1 item already assigned to this moderator
  const { data: alreadyAssigned, error: assignedFetchError } = await service
    .from("evidence")
    .select("id, title, summary, contributor_note, created_at, assigned_moderator_id")
    .eq("assigned_moderator_id", moderatorId)
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(1);

  if (assignedFetchError) {
    console.error("[moderation] fetch assigned failed", assignedFetchError);
    return (
      <main className="max-w-3xl mx-auto py-8">
        <h1 className="text-2xl font-bold mb-4">Moderation queue</h1>
        <p className="text-red-600 mb-4">Failed to load pending evidence.</p>
        {errorParam && (
          <p className="text-xs text-gray-500">
            Last action error code: <code>{errorParam}</code>
          </p>
        )}
      </main>
    );
  }

  // Step 2: if none assigned, claim exactly one oldest unassigned pending item
  if (!alreadyAssigned || alreadyAssigned.length === 0) {
    const { data: unassigned, error: unassignedError } = await service
      .from("evidence")
      .select("id")
      .is("assigned_moderator_id", null)
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(1);

    if (unassignedError) {
      console.error("[moderation] fetch unassigned failed", unassignedError);
    } else if (unassigned && unassigned.length > 0) {
      const targetId = unassigned[0].id;

      const { error: assignError } = await service
        .from("evidence")
        .update({ assigned_moderator_id: moderatorId })
        .eq("id", targetId)
        .is("assigned_moderator_id", null);

      if (assignError) {
        console.error("[moderation] assign failed", assignError);
      }
    }
  }

  // Step 3: fetch again (up to 1), now that we may have claimed something
  const { data: queue, error: queueError } = await service
    .from("evidence")
    .select("id, title, summary, contributor_note, created_at, assigned_moderator_id")
    .eq("assigned_moderator_id", moderatorId)
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(1);

  if (queueError) {
    console.error("[moderation] fetch queue failed", queueError);
    return (
      <main className="max-w-3xl mx-auto py-8">
        <h1 className="text-2xl font-bold mb-4">Moderation queue</h1>
        <p className="text-red-600 mb-4">Failed to load pending evidence.</p>
        {errorParam && (
          <p className="text-xs text-gray-500">
            Last action error code: <code>{errorParam}</code>
          </p>
        )}
      </main>
    );
  }

  return (
    <main className="max-w-3xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-2">Moderation queue</h1>

      <div className="mb-4 p-3 rounded border bg-yellow-50 text-sm">
        <strong>Debug</strong>
        <div>
          SSR user present: <strong>{String(!!user)}</strong>
        </div>
        <div>
          SSR user id: <strong>{moderatorId}</strong>
        </div>
        {userError && <div className="text-red-600">User error: {String(userError)}</div>}
        {errorParam && (
          <div className="text-xs text-gray-500 mt-1">
            Last action error code: <code>{errorParam}</code>
          </div>
        )}
      </div>

      <ModerationClient
        evidence={queue ?? []}
        approveEvidence={approveEvidence}
        rejectEvidence={rejectEvidence}
        moderatorId={moderatorId}
      />
    </main>
  );
}
