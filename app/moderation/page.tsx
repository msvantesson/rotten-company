import { headers } from "next/headers";
import { supabaseServer } from "@/lib/supabase-server";
import { supabaseService } from "@/lib/supabase-service";
import { canModerate } from "@/lib/moderation-guards";
import ModerationClient from "./ModerationClient";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function ModerationPage() {
  // ─────────────────────────────────────────────
  // BUILD‑TIME GUARD
  // ─────────────────────────────────────────────
  const hdrs = await headers();
  const isBuildTime = hdrs.get("x-vercel-id") === null;

  if (isBuildTime) {
    return null;
  }

  // ─────────────────────────────────────────────
  // USER AUTH (COOKIE‑SCOPED)
  // ─────────────────────────────────────────────
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

  // ─────────────────────────────────────────────
  // MODERATOR GATE (EXPLICIT AUTHORITY ROLE)
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

  // Step 1 — already assigned (and not mine)
  const { data: assigned } = await service
    .from("evidence")
    .select("id")
    .eq("assigned_moderator_id", moderatorId)
    .eq("status", "pending")
    // IMPORTANT: do not keep self-assigned items in the queue
    .neq("user_id", moderatorId)
    .order("created_at", { ascending: true })
    .limit(1);

  // Step 2 — claim one if none assigned
  if (!assigned || assigned.length === 0) {
    const { data: unassigned } = await service
      .from("evidence")
      .select("id")
      .is("assigned_moderator_id", null)
      .eq("status", "pending")
      // IMPORTANT: never assign the moderator their own submissions
      .neq("user_id", moderatorId)
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

  // Step 3 — fetch final queue (max 1 for now)
  const { data: queue, error } = await service
    .from("evidence")
    .select("id, title, created_at, assigned_moderator_id")
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

  // ──────────────────────────────────────��──────
  // RENDER
  // ─────────────────────────────────────────────
  return (
    <main className="max-w-3xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-2">Moderation queue</h1>

      <div className="mb-4 p-3 rounded border bg-yellow-50 text-sm">
        <strong>Debug</strong>
        <div>SSR user present: {String(!!user)}</div>
        <div>SSR user id: {moderatorId}</div>
      </div>

      <ModerationClient evidence={queue ?? []} moderatorId={moderatorId} />
    </main>
  );
}
