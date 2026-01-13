import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type EvidenceRow = {
  id: number;
  title: string;
  status: string;
  created_at: string;
  company_id: number | null;
  company_request_id: string | null;
  companies?: { name: string; slug: string } | null;
  company_requests?: { name: string } | null;
};

export default async function MyEvidencePage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return (
      <main style={{ padding: 24 }}>
        <h1>My evidence</h1>
        <p>You must be signed in.</p>
      </main>
    );
  }

  const { data, error } = await supabase
    .from("evidence")
    .select(
      `
      id,
      title,
      status,
      created_at,
      company_id,
      company_request_id,
      companies:companies ( name, slug ),
      company_requests:company_requests ( name )
    `
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <main style={{ padding: 24 }}>
        <h1>My evidence</h1>
        <p>Failed to load evidence: {error.message}</p>
      </main>
    );
  }

  const rows = (data ?? []) as EvidenceRow[];

  return (
    <main style={{ padding: 24, maxWidth: 900 }}>
      <h1>My evidence</h1>

      {rows.length === 0 ? (
        <p>No submissions yet.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {rows.map((e) => {
            const targetLabel =
              e.companies?.name ??
              e.company_requests?.name ??
              (e.company_id ? `Company #${e.company_id}` : "Proposed company");

            return (
              <li
                key={e.id}
                style={{
                  border: "1px solid #e5e5e5",
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 12,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{e.title}</div>
                    <div style={{ opacity: 0.8, marginTop: 4 }}>
                      Target: {targetLabel}
                    </div>
                    <div style={{ opacity: 0.6, marginTop: 4 }}>
                      Submitted: {new Date(e.created_at).toLocaleString()}
                    </div>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <div
                      style={{
                        display: "inline-block",
                        padding: "4px 10px",
                        borderRadius: 999,
                        border: "1px solid #ddd",
                        fontSize: 12,
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                      }}
                    >
                      {e.status}
                    </div>
                    <div style={{ marginTop: 10 }}>
                      <Link href={`/my-evidence/${e.id}`}>View</Link>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
