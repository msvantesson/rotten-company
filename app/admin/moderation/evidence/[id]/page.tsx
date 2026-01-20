import { supabaseServer } from "@/lib/supabase-server";
import { approveEvidence, rejectEvidence } from "../actions";

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

export default async function EvidenceReviewPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await requireAdmin();
  if (!user) return null;

  const supabase = await supabaseServer();
  const { data: evidence } = await supabase
    .from("evidence")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!evidence) {
    return <div>Evidence not found</div>;
  }

  return (
    <main style={{ padding: 24 }}>
      <h1>Review Evidence #{evidence.id}</h1>

      <pre style={{ background: "#f6f6f6", padding: 12 }}>
        {JSON.stringify(evidence, null, 2)}
      </pre>

      <form action={approveEvidence}>
        <input type="hidden" name="evidenceId" value={evidence.id} />
        <textarea name="note" placeholder="Optional moderator note" />
        <button type="submit">Approve</button>
      </form>

      <form action={rejectEvidence}>
        <input type="hidden" name="evidenceId" value={evidence.id} />
        <textarea
          name="note"
          placeholder="Rejection reason (required)"
          required
        />
        <button type="submit">Reject</button>
      </form>
    </main>
  );
}
