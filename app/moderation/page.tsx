// /app/moderation/page.tsx (excerpt)
import { supabaseServer } from "@/lib/supabase-server";
import ModerationClient from "./ModerationClient";
import { approveEvidence, rejectEvidence } from "./actions";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function ModerationPage({ searchParams }: { searchParams?: { error?: string } }) {
  const supabase = await supabaseServer();

  // get session (works because supabaseServer uses anon key + cookies)
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const moderatorId = session?.user?.id ?? null;

  const { data, error } = await supabase
    .from("evidence")
    .select("id, title, summary, contributor_note, created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  // ...error handling omitted for brevity...

  return (
    <main className="max-w-3xl mx-auto py-8">
      <ModerationClient
        evidence={data ?? []}
        approveEvidence={approveEvidence}
        rejectEvidence={rejectEvidence}
        moderatorId={moderatorId}
      />
    </main>
  );
}
