import { supabaseServer } from "@/lib/supabase-server";
import { redirect } from "next/navigation";

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

  const { data: isModerator } = await supabase
    .from("moderators")
    .select("user_id")
    .eq("user_id", moderatorId)
    .maybeSingle();

  if (!isModerator) return null;

  // 🧠 Parse ID safely
  const evidenceId = parseInt(resolvedParams.id, 10);
  if (isNaN(evidenceId)) {
    return <div>Invalid evidence ID</div>;
  }

  // 📄 Load evidence
  const { data: evidence, error } = await supabase
    .from("evidence")
    .select("*")
    .eq("id", evidenceId)
    .maybeSingle();

  if (error) {
    console.error("Evidence query failed:", error.message);
    return <div>Error loading evidence</div>;
  }

  if (!evidence) {
    return <div>Evidence not found</div>;
  }

  // ✅ Approve
  async function approve() {
    "use server";

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

    // 👇 Back to main moderation queue
    redirect("/moderation");
  }

  // ❌ Reject
  async function reject(formData: FormData) {
    "use server";

    const note = formData.get("note")?.toString();
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

    // 👇 Back to main moderation queue
    redirect("/moderation");
  }

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
