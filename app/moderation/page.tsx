import { supabaseServer } from "@/lib/supabase-server";
import ModerationClient from "./ModerationClient";
import { approveEvidence, rejectEvidence } from "./actions";
import { enforceModerationGate } from "@/lib/moderation-guards";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function ModerationPage({
  searchParams,
}: {
  searchParams?: { error?: string };
}) {
  const errorParam =
    typeof searchParams?.error === "string" ? searchParams.error : null;

  // Create SSR supabase client and read session
  const supabase = await supabaseServer();
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  console.info(
    "[moderation] SSR session present:",
    !!session,
    "userId:",
    session?.user?.id,
    "error:",
    sessionError
  );

  // ─────────────────────────────────────────────
  // HARD AUTHORITY GATE
  // ─────────────────────────────────────────────
  const moderatorId = session?.user?.id;

  if (!moderatorId) {
    return (
      <main className="max-w-3xl mx-auto py-8">
        <h1 className="text-2xl font-bold mb-4">Moderation queue</h1>
        <p>You must be logged in to access moderation.</p>
      </main>
    );
  }

  await enforceModerationGate(moderatorId);

  // ─────────────────────────────────────────────
  // FETCH + CLAIM PENDING EVIDENCE
  // Claims only currently-unassigned pending items by setting assigned_moderator_id
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
          SSR session present: <strong>{String(!!session)}</strong>
        </div>
        <div>
          SSR user id: <strong>{moderatorId}</strong>
        </div>
        {sessionError && (
          <div className="text-red-600">
            Session error: {String(sessionError)}
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
