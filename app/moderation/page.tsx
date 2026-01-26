import { headers } from "next/headers";
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

  // ─────────────────────────────────────────────
  // BUILD‑TIME GUARD
  // Next.js executes this page during build.
  // There is no request, no cookies, no auth.
  // We must exit early.
  // ─────────────────────────────────────────────
  const hdrs = headers();
  const isBuildTime = hdrs.get("x-vercel-id") === null;

  if (isBuildTime) {
    return null;
  }

  // ─────────────────────────────────────────────
  // USER‑SCOPED CLIENT (AUTH)
  // ─────────────────────────────────────────────
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

  // ─────────────────────────────────────────────
  // SERVICE‑ROLE CLIENT (QUEUE + ASSIGNMENT)
  // ─────────────────────────────────────────────
  const service = supabaseService();

  // ─────────────────────────────────────────────
  // OPTION A LOGIC
  // Reviewer sees EXACTLY ONE item
  //
  // 1. If already assigned → show it
  // 2. Else claim ONE oldest unassigned
  // 3. Fetch again
  // ─────────────────────────────────────────────

  // Step 1 — already assigned?
  const { data: assigned } = await service
    .from("evidence")
    .select(
      "id, title, summary, contributor_note, created_at, assigned_moderator_id"
    )
    .eq("assigned_moderator_id", moderatorId)
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(1);

  // Step 2 — claim one if none assigned
  if (!assigned || assigned.length === 0) {
    const { data: unassigned } = await service
      .from("evidence")
      .select("id")
      .is("assigned_moderator_id", null)
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(1);

    if (unassigned && unassigned.length > 0) {
      await service
        .from("evidence")
        .update({ assigned_moderator_id: moderatorId })
        .eq("id", unassigned[0].id)
        .is("assigned_moderator_id", null);
    }
  }

  // Step 3 — fetch final queue (max 1)
  const { data: queue, error } = await service
    .from("evidence")
    .select(
      "id, title, summary, contributor_note, created_at, assigned_moderator_id"
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

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────
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
        {userError && (
          <div className="text-red-600">User error: {String(userError)}</div>
        )}
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
