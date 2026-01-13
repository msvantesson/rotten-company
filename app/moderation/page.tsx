export const dynamic = "force-dynamic";
export const dynamicParams = true;
export const fetchCache = "force-no-store";

import { supabaseServer } from "@/lib/supabase-server";
import ModerationClient from "./ModerationClient";

type EvidenceRow = {
  id: number;
  title: string;
  summary: string | null;
  contributor_note: string | null;
  created_at: string | null;
};

type SearchParams = { [key: string]: string | string[] | undefined };

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
        <main className="max-w-5xl mx-auto px-4 py-10">
          <h1 className="text-3xl font-bold mb-4">Moderation Dashboard</h1>
          <p className="text-red-600">Failed to load moderation queue.</p>
        </main>
      );
    }

    return (
      <main className="max-w-5xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold mb-4">Moderation Dashboard</h1>

        {errorParam && (
          <div className="mb-4 text-red-600 text-sm">
            {errorParam === "status_not_updated_rls"
              ? "Update blocked by RLS. Moderation requires elevated privileges."
              : "An error occurred while processing the action."}
          </div>
        )}

        <ModerationClient evidence={data as EvidenceRow[]} />
      </main>
    );
  } catch (err) {
    console.error("[moderation] render crash", err);
    return (
      <main className="max-w-5xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold mb-4">Moderation Dashboard</h1>
        <p className="text-red-600">
          Server error while rendering moderation page.
        </p>
      </main>
    );
  }
}
