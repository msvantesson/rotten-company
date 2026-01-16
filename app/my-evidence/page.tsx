// app/my-evidence/[id]/page.tsx
import { supabaseRoute } from "@/lib/supabase-route";

export default async function MyEvidenceDebugPage({ params }: { params: { id: string } }) {
  const supabase = await supabaseRoute();

  // server-side auth
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  const authUser = userData?.user ?? null;

  // fetch evidence
  const evidenceId = Number(params.id);
  const { data: evidence, error: evidenceErr } = await supabase
    .from("evidence")
    .select("*")
    .eq("id", evidenceId)
    .maybeSingle();

  // public URL for file if present
  let fileUrl: string | null = null;
  try {
    if (evidence?.file_path) {
      const { data: fileUrlData } = supabase.storage.from("evidence").getPublicUrl(evidence.file_path);
      fileUrl = fileUrlData?.publicUrl ?? null;
    }
  } catch (e) {
    // ignore storage errors for debug page
  }

  return (
    <div style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <h1>Debug: /my-evidence/{params.id}</h1>

      <section style={{ marginTop: 16 }}>
        <h2>Server Auth User</h2>
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
        <h2>Evidence Fetch</h2>
        <div><strong>Requested id:</strong> {evidenceId}</div>
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
        <h2>File URL</h2>
        <pre style={{ background: "#f5f5f5", padding: 12 }}>
          {JSON.stringify({ fileUrl }, null, 2)}
        </pre>
        {fileUrl && (
          <p>
            <a href={fileUrl} target="_blank" rel="noreferrer">Open file</a>
          </p>
        )}
      </section>

      <div style={{ marginTop: 20, color: "#666" }}>
        This is a temporary debug page. Remove or revert to the production page once you confirm the issue.
      </div>
    </div>
  );
}
