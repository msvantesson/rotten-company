// app/my-evidence/[id]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase-server";
import { resubmitEvidence } from "./actions";

export default async function EvidenceDetail({
  params,
  searchParams,
}: {
  params: { id: string };
  // Next passes query params as searchParams in app router
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const supabase = await supabaseServer();

  // Debug: log incoming params
  console.info("[MY-EVIDENCE PAGE] params:", params);
  console.info("[MY-EVIDENCE PAGE] searchParams:", searchParams ?? null);

  // sanitize id
  const raw = String(params.id ?? "");
  const cleaned = raw.replace(/[^\d]/g, "");
  const evidenceId = Number(cleaned);

  if (!Number.isFinite(evidenceId)) {
    console.info("[MY-EVIDENCE PAGE] invalid id after sanitization:", { raw, cleaned });
    return notFound();
  }

  // Get server-side user (reads HttpOnly cookie via supabaseServer)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  console.info("[MY-EVIDENCE PAGE] supabase user id:", user?.id ?? null);

  // If debug=true in query, bypass user_id filter so we can confirm the row exists
  const bypassUserFilter = String(searchParams?.debug ?? "") === "true";

  // Query evidence. If bypassUserFilter is true, do not filter by user_id.
  const q = supabase
    .from("evidence")
    .select(`
      *,
      companies ( name ),
      company_requests ( name )
    `)
    .eq("id", evidenceId);

  if (!bypassUserFilter) {
    // require the evidence to belong to the signed-in user
    if (!user) {
      console.info("[MY-EVIDENCE PAGE] no server user and not in debug mode -> notFound");
      return notFound();
    }
    q.eq("user_id", user.id);
  } else {
    console.info("[MY-EVIDENCE PAGE] DEBUG BYPASS: skipping user_id filter");
  }

  const { data: evidence, error } = await q.maybeSingle();

  if (error) {
    console.error("[MY-EVIDENCE PAGE] supabase error:", error);
    return notFound();
  }

  console.info("[MY-EVIDENCE PAGE] evidence result:", evidence ? { id: evidence.id, user_id: evidence.user_id, status: evidence.status } : null);

  if (!evidence) {
    console.info("[MY-EVIDENCE PAGE] no evidence found -> notFound");
    return notFound();
  }

  return (
    <main style={{ padding: "2rem", maxWidth: 900 }}>
      <Link href="/my-evidence">← Back</Link>

      <h1>{evidence.title}</h1>
      <p>
        Target: {evidence.companies?.[0]?.name ?? evidence.company_requests?.[0]?.name}
      </p>

      <div style={{ border: "1px solid #ddd", padding: "1rem" }}>
        <strong>Status:</strong> {evidence.status}

        {/* moderation block unchanged */}
      </div>

      <section style={{ marginTop: "2rem" }}>
        <h2>Your original submission</h2>
        {evidence.summary && <p>{evidence.summary}</p>}
        {evidence.contributor_note && (
          <p style={{ opacity: 0.8 }}>{evidence.contributor_note}</p>
        )}
      </section>

      {evidence.status === "rejected" && (
        <section style={{ marginTop: "2rem" }}>
          <h2>Resubmit corrected evidence</h2>
          <p style={{ opacity: 0.7 }}>
            This creates a new submission. The previous version remains rejected.
          </p>

          <form action={resubmitEvidence}>
            <input
              type="hidden"
              name="previous_evidence_id"
              value={evidence.id}
            />

            <input
              name="title"
              defaultValue={evidence.title}
              required
              style={{ display: "block", width: "100%", marginBottom: 8 }}
            />

            <textarea
              name="summary"
              defaultValue={evidence.summary ?? ""}
              rows={4}
              style={{ display: "block", width: "100%", marginBottom: 8 }}
            />

            <textarea
              name="contributor_note"
              defaultValue={evidence.contributor_note ?? ""}
              rows={4}
              style={{ display: "block", width: "100%", marginBottom: 8 }}
            />

            <button type="submit">Resubmit corrected evidence</button>
          </form>
        </section>
      )}
    </main>
  );
}
