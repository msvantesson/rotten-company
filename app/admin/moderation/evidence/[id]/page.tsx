import { supabaseServer } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import {
  approveEvidence,
  rejectEvidence,
} from "@/app/moderation/actions";

type ParamsShape = { id: string };

export default async function EvidenceReviewPage(props: {
  params: ParamsShape | Promise<ParamsShape>;
}) {
  // Next 16 quirk: params may be a Promise
  const resolvedParams =
    props.params instanceof Promise ? await props.params : props.params;

  const supabase = await supabaseServer();

  // 🔐 Auth check
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return null;

  const moderatorId = auth.user.id;

  // Ensure user is a moderator
  const { data: isModerator } = await supabase
    .from("moderators")
    .select("user_id")
    .eq("user_id", moderatorId)
    .maybeSingle();

  if (!isModerator) return null;

  // 🧠 Parse ID safely
  const evidenceId = parseInt(resolvedParams.id, 10);
  if (Number.isNaN(evidenceId) || evidenceId <= 0) {
    return <div>Invalid evidence ID</div>;
  }

  // 📄 Load evidence
  const { data: evidence, error } = await supabase
    .from("evidence")
    .select("*")
    .eq("id", evidenceId)
    .maybeSingle();

  if (error) {
    console.error("[admin-evidence] evidence query failed:", error.message);
    return <div>Error loading evidence</div>;
  }

  if (!evidence) {
    return <div>Evidence not found</div>;
  }

  // 🔄 Use shared moderation actions (app/moderation/actions.ts)

  async function handleApprove(formData: FormData) {
    "use server";

    // Optional: allow a note on approve too
    const note = formData.get("note")?.toString() ?? "";

    const fd = new FormData();
    fd.set("evidence_id", String(evidenceId));
    fd.set("moderator_id", moderatorId);
    fd.set("moderator_note", note || "approved via admin detail page");

    await approveEvidence(fd);
    redirect("/moderation");
  }

  async function handleReject(formData: FormData) {
    "use server";

    const note = formData.get("note")?.toString() ?? "";

    const fd = new FormData();
    fd.set("evidence_id", String(evidenceId));
    fd.set("moderator_id", moderatorId);
    fd.set("moderator_note", note);

    await rejectEvidence(fd);
    redirect("/moderation");
  }

  return (
    <main style={{ padding: 24 }}>
      <h1>Moderate Evidence #{evidence.id}</h1>

      {/* Raw JSON debug view */}
      <pre
        style={{
          background: "#111",
          color: "#0f0",
          padding: 16,
          overflowX: "auto",
          marginBottom: 24,
        }}
      >
        {JSON.stringify(evidence, null, 2)}
      </pre>

      {/* Approve with optional note */}
      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
          Approve
        </h2>
        <form action={handleApprove} style={{ display: "grid", gap: 8 }}>
          <label style={{ fontSize: 13 }}>
            Optional note to submitter / log
            <textarea
              name="note"
              placeholder="(Optional) Short note for approval"
              style={{ width: "100%", minHeight: 60, display: "block" }}
            />
          </label>
          <button type="submit">Approve</button>
        </form>
      </section>

      {/* Reject with required note */}
      <section>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
          Reject
        </h2>
        <form action={handleReject} style={{ display: "grid", gap: 8 }}>
          <label style={{ fontSize: 13 }}>
            Reason for rejection (required)
            <textarea
              name="note"
              placeholder="Explain why this evidence is being rejected"
              required
              style={{ width: "100%", minHeight: 80, display: "block" }}
            />
          </label>
          <button type="submit">Reject</button>
        </form>
      </section>
    </main>
  );
}
