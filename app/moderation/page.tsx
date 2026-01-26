import { supabaseService } from "@/lib/supabase-service";
import ModerationClient from "./ModerationClient";
import { approveEvidence, rejectEvidence } from "./actions";
import { canModerate } from "@/lib/moderation-guards";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function ModerationPage({ searchParams }: { searchParams?: { error?: string } }) {
  const errorParam =
    typeof searchParams?.error === "string" ? searchParams.error : null;

  // Use service-role client for assignment logic
  const supabase = supabaseService();

  // ─────────────────────────────────────────────
  // AUTH: GET USER
  // ─────────────────────────────────────────────
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  const moderatorId = user?.id ?? null;

  console.info(
    "[moderation] SSR user present:",
    !!user,
    "userId:",
    user?.id,
    "error:",
    userError
  );

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
  // STEP 1 — SELECT ONE UNASSIGNED PENDING ITEM
  // ─────────────────────────────────────────────
  const { data: unassigned, error: unassignedError } = await supabase
    .from("evidence")
    .select("id")
    .is("assigned_moderator_id", null)
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(1);

  if (unassignedError) {
    console.error("[moderation] unassigned fetch failed", unassignedError);
  }

  // ─────────────────────────────────────────────
  // STEP 2 — ASSIGN IT TO THIS MODERATOR
  // ─────────────────────────────────────────────
  if (unassigned && unassigned.length > 0) {
    const targetId = unassigned[0].id;

    const { error: assignError } = await supabase
      .from("evidence")
      .update({ assigned_moderator_id: moderatorId })
      .eq("id", targetId);

    if (assignError) {
      console.error("[moderation] assignment failed", assignError);
    }
  }

  // ─────────────────────────────────────────────
  // STEP 3 — FETCH ALL ITEMS ASSIGNED TO THIS MODERATOR
  // ─────────────────────────────────────────────
  const { data, error } = await supabase
    .from("evidence")
    .select("id, title, summary, contributor_note, created_at, assigned_moderator_id")
    .eq("assigned_moderator_id", moderatorId)
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[moderation] fetch assigned failed", error);
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

  // ─────────────────────────────────────────────
  // RENDER PAGE
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
          <div className="text-red-600">
            User error: {String(userError)}
          </div>
        )}
        {errorParam && (
          <div className="text-xs text-gray-500 mt-1">
            Last action error code: <code>{errorParam}</code>
          </div>
        )}
      </div>

      <ModerationClient
        evidence={data ?? []}
        approveEvidence={approveEvidence}
        rejectEvidence={rejectEvidence}
        moderatorId={moderatorId}
      />
    </main>
  );
}
