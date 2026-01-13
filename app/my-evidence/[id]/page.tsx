import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { resubmitEvidence } from "./actions";

export default async function EvidenceDetail({
  params,
}: {
  params: { id: string };
}) {
  const supabase = supabaseServer();
  const evidenceId = Number(params.id);

  if (!Number.isFinite(evidenceId)) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) notFound();

  const { data: evidence } = await supabase
    .from("evidence")
    .select(`
      *,
      companies ( name ),
      company_requests ( name )
    `)
    .eq("id", evidenceId)
    .eq("user_id", user.id)
    .single();

  if (!evidence) notFound();

  const { data: moderation } = await supabase
    .from("moderation_actions")
    .select("moderator_note, action")
    .eq("target_type", "evidence")
    .eq("target_id", evidence.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <main className="p-6 max-w-3xl">
      <Link href="/my-evidence" className="underline text-sm">
        ← Back
      </Link>

      <h1 className="text-xl font-semibold mt-4">{evidence.title}</h1>
      <p className="opacity-70">
        Target: {evidence.companies?.name ?? evidence.company_requests?.name}
      </p>

      <div className="mt-4 border rounded-lg p-4">
        <strong>Status:</strong> {evidence.status}

        {evidence.status === "rejected" && moderation && (
          <div className="mt-3 bg-red-50 border border-red-200 p-3 rounded">
            <strong>Reviewer feedback</strong>
            <p className="mt-1">{moderation.moderator_note}</p>
          </div>
        )}
      </div>

      <section className="mt-6">
        <h2 className="font-medium">Your original submission</h2>

        {evidence.summary && <p className="mt-2">{evidence.summary}</p>}
        {evidence.contributor_note && (
          <p className="mt-2 opacity-80">{evidence.contributor_note}</p>
        )}
      </section>

      {evidence.status === "rejected" && (
        <section className="mt-8">
          <h2 className="font-medium">Resubmit corrected evidence</h2>
          <p className="text-sm opacity-70">
            This creates a new submission. The previous version remains rejected.
          </p>

          <form action={resubmitEvidence} className="mt-4 space-y-3">
            <input
              type="hidden"
              name="previous_evidence_id"
              value={evidence.id}
            />

            <input
              name="title"
              defaultValue={evidence.title}
              required
              className="w-full border p-2 rounded"
            />

            <textarea
              name="summary"
              defaultValue={evidence.summary ?? ""}
              className="w-full border p-2 rounded"
              rows={4}
            />

            <textarea
              name="contributor_note"
              defaultValue={evidence.contributor_note ?? ""}
              className="w-full border p-2 rounded"
              rows={4}
            />

            <button className="bg-black text-white px-4 py-2 rounded">
              Resubmit corrected evidence
            </button>
          </form>
        </section>
      )}
    </main>
  );
}
