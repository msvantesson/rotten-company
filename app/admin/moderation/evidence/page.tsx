import { supabaseServer } from "@/lib/supabase-server";

export default async function EvidenceQueuePage() {
  const supabase = await supabaseServer();

  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return null;

  const { data: evidence, error } = await supabase
    .from("evidence")
    .select("id, title, status, created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Queue query failed:", error.message);
    return <div>Error loading queue</div>;
  }

  return (
    <main style={{ padding: 24 }}>
      <h1>Pending Evidence</h1>

      <ul>
        {evidence?.map((e) => (
          <li key={e.id}>
            <a href={`/admin/moderation/evidence/${e.id}`}>
              #{e.id} — {e.title}
            </a>
          </li>
        ))}
      </ul>
    </main>
  );
}
