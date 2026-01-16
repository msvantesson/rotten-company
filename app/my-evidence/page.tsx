// app/my-evidence/[id]/page.tsx
import { supabaseRoute } from "@/lib/supabase-route";
import { notFound } from "next/navigation";

export default async function MyEvidenceDebugPage({ params }: { params: { id: string } }) {
  const supabase = await supabaseRoute();

  // get authenticated user server-side
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  const authUser = userData?.user ?? null;

  // log auth info for debugging
  console.info("/my-evidence debug - authUser:", {
    id: authUser?.id ?? null,
    email: authUser?.email ?? null,
  }, "userErr:", userErr ?? null);

  const evidenceId = Number(params.id);

  // fetch evidence row as the authenticated user
  const { data: evidence, error: evidenceErr } = await supabase
    .from("evidence")
    .select("*")
    .eq("id", evidenceId)
    .maybeSingle();

  // log query result for debugging
  console.info("/my-evidence debug - evidence fetch:", { evidence, evidenceErr });

  // If RLS blocked the row or it doesn't exist, show debug info instead of generic 404
  if (evidenceErr || !evidence) {
    // Render a helpful debug page (do not expose in production)
    return (
      <div style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
        <h1>Evidence debug</h1>

        <section style={{ marginTop: 16 }}>
          <h2>Authenticated user (server)</h2>
          <pre style={{ background: "#f5f5f5", padding: 12 }}>
            {JSON.stringify(
              {
                id: authUser?.id ?? null,
                email: authUser?.email ?? null,
                userErr: userErr ?? null,
              },
              null,
              2
            )}
          </pre>
        </section>

        <section style={{ marginTop: 16 }}>
          <h2>Evidence fetch</h2>
          <div>
            <strong>Requested id:</strong> {evidenceId}
          </div>
          <pre style={{ background: "#f5f5f5", padding: 12 }}>
            {JSON.stringify(
              {
                evidence: evidence ?? null,
                evidenceErr: evidenceErr ?? null,
              },
              null,
              2
            )}
          </pre>
        </section>

        <section style={{ marginTop: 16 }}>
          <h2>Quick checks</h2>
          <ul>
            <li>Does <code>authUser.id</code> match the <code>user_id</code> on the evidence row?</li>
            <li>Is Row Level Security enabled on <code>public.evidence</code> and blocking SELECT?</li>
            <li>Check the evidence row directly in Supabase SQL editor:</li>
          </ul>
          <pre style={{ background: "#fff8e6", padding: 12 }}>
{`SELECT id, user_id, category, status, file_path, created_at
FROM public.evidence
WHERE id = ${evidenceId};`}
          </pre>
        </section>

        <div style={{ marginTop: 20, color: "#666" }}>
          This debug page is temporary. Remove it after you fix the issue.
        </div>
      </div>
    );
  }

  // If evidence exists, render the normal page
  const { data: fileUrlData } = supabase.storage.from("evidence").getPublicUrl(evidence.file_path);
  const fileUrl = fileUrlData?.publicUrl ?? null;

  return (
    <div style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <h1>Evidence #{evidence.id}</h1>
      <p><strong>Title:</strong> {evidence.title}</p>
      <p><strong>Status:</strong> {evidence.status}</p>
      <p><strong>Category:</strong> {evidence.category}</p>
      <p><strong>Entity:</strong> {evidence.entity_type} #{evidence.entity_id}</p>

      {fileUrl && (
        <p>
          <a href={fileUrl} target="_blank" rel="noopener noreferrer">Download file</a>
        </p>
      )}

      <pre style={{ marginTop: 20, background: "#f5f5f5", padding: 12 }}>
        {JSON.stringify(evidence, null, 2)}
      </pre>
    </div>
  );
}
