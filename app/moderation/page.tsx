import { supabaseServer } from "@/lib/supabase-server";
import ModerationClient from "./ModerationClient";
import { approveEvidence, rejectEvidence } from "./actions";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

type EvidenceRow = {
  id: number;
  title: string;
  summary: string | null;
  contributor_note: string | null;
  created_at: string | null;
};

type SearchParams = {
  error?: string;
};

export default async function ModerationPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  let errorParam: string | null = null;
  const rawError = searchParams?.error;
  if (typeof rawError === "string") errorParam = rawError;

  try {
    const supabase = await supabaseServer();

    const { data, error } = await supabase
      .from("evidence")
      .select("id, title, summary, contributor_note, created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    if (error || !Array.isArray(data)) {
      console.error("[moderation] fetch failed", error);
      return (
        <main className="max-w-3xl mx-auto py-8">
          <h1 className="text-2xl font-bold mb-4">Moderation queue</h1>
          <p className="text-red-600 mb-4">
            Failed to load pending evidence. Please try again.
          </p>
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

        {errorParam && (
          <p className="text-sm text-red-600 mb-4">
            Last action failed with code: <code>{errorParam}</code>
          </p>
        )}

        <ModerationClient
          evidence={data as EvidenceRow[]}
          approveEvidence={approveEvidence}
          rejectEvidence={rejectEvidence}
        />
      </main>
    );
  } catch (err) {
    console.error("[moderation] render crash", err);
    return (
      <main className="max-w-3xl mx-auto py-8">
        <h1 className="text-2xl font-bold mb-4">Moderation queue</h1>
        <p className="text-red-600">
          Something went wrong while rendering the moderation page.
        </p>
      </main>
    );
  }
}
