// app/my-evidence/[id]/page.tsx

import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase-server";
import { resubmitEvidence } from "./actions";

export default async function MyEvidencePage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const supabase = await supabaseServer();

  console.info(
    "[DB DEBUG][page] DATABASE_URL prefix:",
    process.env.DATABASE_URL?.slice?.(0, 60) ?? null
  );

  const rawId = String(params.id ?? "");
  const cleanedId = rawId.replace(/[^\d]/g, "");
  const evidenceId = Number(cleanedId);

  if (!Number.isFinite(evidenceId)) {
    console.info("[MY-EVIDENCE] invalid id", { rawId, cleanedId });
    return notFound();
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  console.info("[MY-EVIDENCE] server user id:", user?.id ?? null);

  if (!user) {
    console.info("[MY-EVIDENCE] no authenticated user");
    return notFound();
  }

  const { data: evidence, error } = await supabase
    .from("evidence")
    .select(
      `
      *,
      companies ( name ),
      company_requests ( name )
    `
    )
    .eq("id", evidenceId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("[MY-EVIDENCE] query error:", error);
    return notFound();
  }

  if (!evidence) {
    console.info("[MY-EVIDENCE] no evidence found", {
      evidenceId,
      userId: user.id,
    });
    return notFound();
  }

  const { data: moderation } = await supabase
    .from("moderation_actions")
    .select("moderator_note")
    .eq("target_type", "evidence")
    .eq("target_id", evidence.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <main style={{ padding: "2rem", maxWidth: 900 }}>
      <Link href="/my-evidence">← Back</Link>

      <h1>{evidence.title}</h1>

      <p>
        Target:{" "}
        {evidence.companies?.[0]?.name ??
          evidence.company_requests?.[0]?.name}
      </p>

      <div style={{ border: "1px solid #ddd", padding: "1rem" }}>
        <strong>Status:</strong> {evidence.status}

        {evidence.status === "rejected" && moderation && (
          <div
            style={{
              marginTop: "1rem",
              background: "#fff5f5",
              border: "1px solid #f2c2c2",
              padding: "1rem",
            }}
          >
            <strong>Reviewer feedback</strong>
            <p>{moderation.moderator_note}</p>
          </div>
        )}
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
