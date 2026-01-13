import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resubmitEvidence } from "./actions";

type EvidenceDetail = {
  id: number;
  title: string;
  summary: string | null;
  contributor_note: string | null;
  status: string;
  created_at: string;
  file_url: string | null;
  file_path: string | null;
  company_id: number | null;
  company_request_id: string | null;
  companies?: { name: string; slug: string } | null;
  company_requests?: { name: string } | null;
};

type ModerationAction = {
  action: "approve" | "reject";
  moderator_note: string;
  created_at: string;
};

export default async function MyEvidenceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const evidenceId = Number(id);
  if (!Number.isFinite(evidenceId)) notFound();

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main style={{ padding: 24 }}>
        <h1>Evidence</h1>
        <p>You must be signed in.</p>
      </main>
    );
  }

  const { data: evidence, error } = await supabase
    .from("evidence")
    .select(
      `
      id,
      title,
      summary,
      contributor_note,
      status,
      created_at,
      file_url,
      file_path,
      company_id,
      company_request_id,
      companies:companies ( name, slug ),
      company_requests:company_requests ( name )
    `
    )
    .eq("id", evidenceId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return (
      <main style={{ padding: 24 }}>
        <h1>Evidence</h1>
        <p>Failed to load evidence: {error.message}</p>
      </main>
    );
  }

  if (!evidence) notFound();

  const e = evidence as EvidenceDetail;

  const { data: moderation } = await supabase
    .from("moderation_actions")
    .select("action, moderator_note, created_at")
    .eq("target_type", "evidence")
    .eq("target_id", e.id)
    .order("created_at", { ascending: false })
    .limit(1);

  const latestAction = (moderation?.[0] ?? null) as ModerationAction | null;

  const targetLabel =
    e.companies?.name ??
    e.company_requests?.name ??
    (e.company_id ? `Company #${e.company_id}` : "Proposed company");

  const isRejected = e.status === "rejected";

  return (
    <main style={{ padding: 24, maxWidth: 900 }}>
      <p>
        <Link href="/my-evidence">← Back</Link>
      </p>

      <h1>{e.title}</h1>
      <p style={{ opacity: 0.8 }}>Target: {targetLabel}</p>

      <section
        style={{
          marginTop: 16,
          border: "1px solid #e5e5e5",
          borderRadius: 12,
          padding: 16,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontWeight: 700 }}>
              Status:{" "}
              <span style={{ textTransform: "uppercase", letterSpacing: 0.5 }}>
                {e.status}
              </span>
            </div>
            <div style={{ opacity: 0.6, marginTop: 6 }}>
              Submitted: {new Date(e.created_at).toLocaleString()}
            </div>
          </div>
        </div>

        {isRejected && latestAction?.action === "reject" && (
          <div
            style={{
              marginTop: 14,
              padding: 12,
              borderRadius: 10,
              border: "1px solid #f1c7c7",
              background: "#fff5f5",
            }}
          >
            <div style={{ fontWeight: 700 }}>Reviewer feedback</div>
            <p style={{ marginTop: 6, marginBottom: 0 }}>{latestAction.moderator_note}</p>
          </div>
        )}
      </section>

      <section style={{ marginTop: 16 }}>
        <h2>Your original submission</h2>

        {e.summary && (
          <>
            <h3>Summary</h3>
            <p>{e.summary}</p>
          </>
        )}

        {e.contributor_note && (
          <>
            <h3>Additional context</h3>
            <p>{e.contributor_note}</p>
          </>
        )}

        {(e.file_url || e.file_path) && (
          <>
            <h3>Attachment</h3>
            {e.file_url ? (
              <p>
                <a href={e.file_url} target="_blank" rel="noreferrer">
                  Open attachment
                </a>
              </p>
            ) : (
              <p style={{ opacity: 0.8 }}>Stored path: {e.file_path}</p>
            )}
          </>
        )}
      </section>

      {isRejected && (
        <section style={{ marginTop: 24 }}>
          <h2>Resubmit corrected evidence</h2>
          <p style={{ opacity: 0.8 }}>
            This creates a new submission. The previous version will remain rejected.
          </p>

          <form action={resubmitEvidence}>
            <input type="hidden" name="previous_evidence_id" value={String(e.id)} />

            <label style={{ display: "block", marginTop: 12 }}>
              Title
              <input
                name="title"
                defaultValue={e.title}
                required
                style={{ display: "block", width: "100%", padding: 10, marginTop: 6 }}
              />
            </label>

            <label style={{ display: "block", marginTop: 12 }}>
              Summary
              <textarea
                name="summary"
                defaultValue={e.summary ?? ""}
                rows={4}
                style={{ display: "block", width: "100%", padding: 10, marginTop: 6 }}
              />
            </label>

            <label style={{ display: "block", marginTop: 12 }}>
              Additional context (optional)
              <textarea
                name="contributor_note"
                defaultValue={e.contributor_note ?? ""}
                rows={5}
                style={{ display: "block", width: "100%", padding: 10, marginTop: 6 }}
              />
            </label>

            <div style={{ marginTop: 16 }}>
              <button
                type="submit"
                style={{
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: "1px solid #111",
                  background: "#111",
                  color: "white",
                  cursor: "pointer",
                }}
              >
                Resubmit corrected evidence
              </button>
            </div>
          </form>
        </section>
      )}
    </main>
  );
}
