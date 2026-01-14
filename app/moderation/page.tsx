// Server Component: reads session server-side, logs it, and renders a visible debug banner.
// Replace your existing /app/moderation/page.tsx with this file.

import { supabaseServer } from "@/lib/supabase-server";
import ModerationClient from "./ModerationClient";
import { approveEvidence, rejectEvidence } from "./actions";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function ModerationPage({
  searchParams,
}: {
  searchParams?: { error?: string };
}) {
  const errorParam = typeof searchParams?.error === "string" ? searchParams.error : null;

  // Create SSR supabase client and read session
  const supabase = await supabaseServer();
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  // Server log (appears in host logs)
  console.info("[moderation] SSR session present:", !!session, "userId:", session?.user?.id, "error:", sessionError);

  const moderatorId = session?.user?.id ?? null;

  // Fetch pending evidence (session-aware read)
  const { data, error } = await supabase
    .from("evidence")
    .select("id, title, summary, contributor_note, created_at")
    .eq("status", "pending")
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

      {/* Visible debug banner so you don't need to tail server logs */}
      <div className="mb-4 p-3 rounded border bg-yellow-50 text-sm">
        <strong>Debug</strong>
        <div>SSR session present: <strong>{String(!!session)}</strong></div>
        <div>SSR user id: <strong>{moderatorId ?? "null"}</strong></div>
        {sessionError && <div className="text-red-600">Session error: {String(sessionError)}</div>}
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
