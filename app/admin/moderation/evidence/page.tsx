import { supabaseServer } from "@/lib/supabase-server";
import Link from "next/link";

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

export default async function AdminEvidenceQueuePage() {
  const user = await requireAdmin();
  if (!user) return null;

  const supabase = await supabaseServer();
  const { data: evidence, error } = await supabase
    .from("evidence")
    .select("id, title, created_at, category, entity_type")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(50);

  if (error) {
    throw new Error("Failed to load pending evidence");
  }

  return (
    <main style={{ padding: 24 }}>
      <h1>Pending Evidence</h1>
      <table width="100%" cellPadding={8}>
        <thead>
          <tr>
            <th>ID</th>
            <th>Title</th>
            <th>Entity</th>
            <th>Category</th>
            <th>Submitted</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {evidence?.map((e) => (
            <tr key={e.id}>
              <td>{e.id}</td>
              <td>{e.title}</td>
              <td>{e.entity_type}</td>
              <td>{e.category}</td>
              <td>{new Date(e.created_at).toLocaleString()}</td>
              <td>
                <Link href={`/admin/moderation/evidence/${e.id}`}>
                  Review
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
