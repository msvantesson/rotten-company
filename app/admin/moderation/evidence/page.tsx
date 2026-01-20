import { supabaseServer } from "@/lib/supabase-server";
import { redirect } from "next/navigation";

export default async function EvidenceReviewPage({
  params,
}: {
  params: { id: string };
}) {
  console.log("[moderation] route hit");
  console.log("[moderation] raw params:", params);

  const supabase = await supabaseServer();

  // ─────────────────────────────────────────────
  // AUTH
  // ─────────────────────────────────────────────
  const { data: auth } = await supabase.auth.getUser();
  console.log("[moderation] auth user:", auth?.user?.id);

  if (!auth?.user) {
    console.log("[moderation] no authenticated user");
    return null;
  }

  const moderatorId = auth.user.id;

  // ─────────────────────────────────────────────
  // ROLE CHECK
  // ─────────────────────────────────────────────
  const { data: mod } = await supabase
    .from("moderators")
    .select("user_id")
    .eq("user_id", moderatorId)
    .maybeSingle();

  console.log("[moderation] moderator row:", mod);

  if (!mod) {
    console.log("[moderation] user is NOT a moderator");
    return null;
  }

  // ─────────────────────────────────────────────
  // ID PARSING
  // ─────────────────────────────────────────────
  const evidenceId = parseInt(params.id, 10);
  console.log("[moderation] parsed evidenceId:", evidenceId);

  if (Number.isNaN(evidenceId)) {
    console.log("[moderation] evidenceId is NaN");
    return <div>Invalid evidence ID</div>;
  }

  // ─────────────────────────────────────────────
  // EVIDENCE QUERY
  // ─────────────────────────────────────────────
  const { data: evidence, error } = await supabase
    .from("evidence")
    .select("*")
    .eq("id", evidenceId)
    .maybeSingle();

  if (error) {
    console.error("[moderation] evidence query error:", error.message);
    return <div>Error loading evidence</div>;
  }

  console.log("[moderation] evidence row:", evidence);

  if (!evidence) {
    console.log("[moderation] evidence NOT FOUND for id:", evidenceId);
    return <div>Evidence not found</div>;
  }

  // ─────────────────────────────────────────────
  // SERVER ACTIONS
  // ─────────────────────────────────────────────
  async function approve() {
    "use server";

    console.log("[moderation] APPROVE clicked:", evidenceId);

    const supabase = await supabaseServer();

    await supabase
      .from("evidence")
      .update({ status: "approved" })
      .eq("id", evidenceId);

    await supabase.from("moderation_actions").insert({
      moderator_id: moderatorId,
      target_type: "evidence",
      target_id: evidenceId,
      action: "approve",
      source: "ui",
    });

    redirect("/admin/moderation/evidence");
  }

  async function reject(formData: FormData) {
    "use server";

    const note = formData.get("note")?.toString();
    console.log("[moderation] REJECT clicked:", evidenceId, "note:", note);

    if (!note) return;

    const supabase = await supabaseServer();

    await supabase
      .from("evidence")
      .update({ status: "rejected" })
      .eq("id", evidenceId);

    await supabase.from("moderation_actions").insert({
      moderator_id: moderatorId,
      target_type: "evidence",
      target_id: evidenceId,
      action: "reject",
      note,
      source: "ui",
    });

    redirect("/admin/moderation/evidence");
  }

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────
  return (
    <main style={{ padding: 24 }}>
      <h1>Moderate Evidence #{evidence.id}</h1>

      <pre
        style={{
          background: "#111",
          color: "#0f0",
          padding: 16,
          overflowX: "auto",
        }}
      >
        {JSON.stringify(evidence, null, 2)}
      </pre>

      <form action={approve} style={{ marginTop: 24 }}>
        <button type="submit">Approve</button>
      </form>

      <form action={reject} style={{ marginTop: 16 }}>
        <textarea
          name="note"
          placeholder="Reason for rejection"
          required
          style={{ width: "100%", height: 80 }}
        />
        <button type="submit">Reject</button>
      </form>
    </main>
  );
}
