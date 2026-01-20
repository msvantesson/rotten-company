import { supabaseServer } from "@/lib/supabase-server";
import { redirect } from "next/navigation";

async function requireAdmin() {
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth?.user) return null;

  const { data: mod } = await supabase
    .from("moderators")
    .select("user_id")
    .eq("user_id", auth.user.id)
    .maybeSingle();

  return mod ? auth.user : null;
}

export default async function AdminEvidenceReviewPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await requireAdmin();
  if (!user) return null;

  const supabase = await supabaseServer();

  const { data: evidence, error } = await supabase
    .from("evidence")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (error) {
    console.error("Evidence query failed:", error.message);
    return <div>Error loading evidence</div>;
  }

  if (!evidence) {
    return <div>Evidence not found</div>;
  }

  async function approve() {
    "use server";

    const supabase = await supabaseServer();

    await supabase
      .from("evidence")
      .update({ status: "approved" })
      .eq("id", evidence.id);

    await supabase.from("moderation_actions").insert({
      moderator_id: user.id,
      target_type: "evidence",
      target_id: evidence.id,
      action: "approve",
      source: "ui",
    });

    redirect("/admin/moderation/evidence");
  }

  async function reject(formData: FormData) {
    "use server";

    const note = formData.get("note")?.toString();
    if (!note) return;

    const supabase = await supabaseServer();

    await supabase
      .from("evidence")
      .update({ status: "rejected" })
      .eq("id", evidence.id);

    await supabase.from("moderation_actions").insert({
      moderator_id: user.id,
      target_type: "evidence",
      target_id: evidence.id,
      action: "reject",
      note,
      source: "ui",
    });

    redirect("/admin/moderation/evidence");
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
