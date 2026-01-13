import Link from "next/link";
import { supabaseServer } from "@/lib/supabase-server";

export default async function MyEvidencePage() {
  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main style={{ padding: "2rem" }}>
        <h1>My evidence</h1>
        <p>You must be signed in.</p>
      </main>
    );
  }

  const { data, error } = await supabase
    .from("evidence")
    .select(`
      id,
      title,
      status,
      created_at,
      companies ( name ),
      company_requests ( name )
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return <p>Error loading evidence: {error.message}</p>;
  }

  return (
    <main style={{ padding: "2rem", maxWidth: 900 }}>
      <h1>My evidence</h1>

      <ul style={{ listStyle: "none", padding: 0 }}>
        {data.map((e) => (
          <li
            key={e.id}
            style={{
              border: "1px solid #ddd",
              borderRadius: 8,
              padding: "1rem",
              marginBottom: "1rem",
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <div>
              <strong>{e.title}</strong>
              <div style={{ opacity: 0.7 }}>
                Target: {e.companies?.name ?? e.company_requests?.name}
              </div>
              <div style={{ fontSize: 12, opacity: 0.5 }}>
                {new Date(e.created_at).toLocaleString()}
              </div>
            </div>

            <div style={{ textAlign: "right" }}>
              <div style={{ textTransform: "uppercase", fontSize: 12 }}>
                {e.status}
              </div>
              <Link href={`/my-evidence/${e.id}`}>View</Link>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
