import { supabaseServer } from "@/lib/supabase-server";
import ModerationClient from "./ModerationClient";
import { approveEvidence, rejectEvidence } from "./actions";
import { canModerate } from "@/lib/moderation-guards";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function ModerationPage({
  searchParams,
}: {
  searchParams?: { error?: string };
}) {
  const errorParam =
    typeof searchParams?.error === "string" ? searchParams.error : null;

  // Create SSR supabase client and read VERIFIED user
  const supabase = await supabaseServer();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

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
  // AUTH: NOT ALLOWED TO MODERATE
  // ─────────────────────────────────────────────
  const allowed = await canModerate();

  if (!allowed) {
    return (
      <main className="max-w-3xl mx-auto py-8">
        <h1 className="text-2xl font-bold mb-4">Moderation queue</h1>
        <p>You do not have moderator access.</p>
      </main>
    );
  }

  // ─────────────────────────────────────────────
  // FETCH + CLAIM PENDING EVIDENCE
  // ─────────────────────────────────────────────
  const { data, error } = await supabase
    .from("evidence")
    .update({ assigned_moderator_id: moderatorId })
    .is("assigned_moderator_id", null)
    .eq("status", "pending")
    .select("id, title, summary, contributor_note, created_at")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[moderation] fetch failed", error);
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
        {userError && (
          <div className="text-red-600">
            User error: {String(userError)}
          </div>
        )}
        {errorParam && (
          <div className="text-xs text-gray-500 mt-1">
            Last action error code: <code>{errorParam}</code>
          </p>
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
