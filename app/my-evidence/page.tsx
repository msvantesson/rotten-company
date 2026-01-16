// app/my-evidence/[id]/page.tsx
export const dynamic = "force-dynamic";

import { supabaseRoute } from "@/lib/supabase-route";
import { notFound } from "next/navigation";

export default async function MyEvidencePage({ params }: { params: { id: string } }) {
  console.info("[MY-EVIDENCE] start - params:", params);

  const supabase = await supabaseRoute();
  console.info("[MY-EVIDENCE] supabaseRoute() ready");

  // parse id early and log
  const evidenceId = Number(params.id);
  if (!params.id || Number.isNaN(evidenceId)) {
    console.info("[MY-EVIDENCE] invalid id:", params.id);
    return notFound();
  }
  console.info("[MY-EVIDENCE] evidenceId:", evidenceId);

  // get server auth user
  let authUser: { id?: string; email?: string } | null = null;
  try {
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr) {
      console.info("[MY-EVIDENCE] auth.getUser error:", userErr);
    }
    authUser = userData?.user ?? null;
    console.info("[MY-EVIDENCE] authUser:", authUser ? { id: authUser.id, email: authUser.email } : null);
  } catch (err) {
    console.error("[MY-EVIDENCE] auth.getUser threw:", err);
  }

  // fetch evidence row
  let evidence: any = null;
  try {
    const { data, error } = await supabase
      .from("evidence")
      .select("*")
      .eq("id", evidenceId)
      .maybeSingle();

    if (error) {
      console.error("[MY-EVIDENCE] evidence fetch error:", error);
    }
    evidence = data ?? null;
    console.info(
      "[MY-EVIDENCE] evidence fetched:",
      evidence ? { id: evidence.id, user_id: evidence.user_id, status: evidence.status } : null
    );
  } catch (err) {
    console.error("[MY-EVIDENCE] evidence fetch threw:", err);
  }

  // If no evidence, return notFound
  if (!evidence) {
    console.info("[MY-EVIDENCE] no evidence found for id:", evidenceId);
    return notFound();
  }

  // resolve file URL if present
  let fileUrl: string | null = null;
  try {
    if (evidence.file_path) {
      // getPublicUrl returns { data: { publicUrl: string } } — no error property
      const { data: fileUrlData } = supabase.storage.from("evidence").getPublicUrl(evidence.file_path);
      fileUrl = fileUrlData?.publicUrl ?? null;
      console.info("[MY-EVIDENCE] fileUrl resolved:", fileUrl);
    } else {
      console.info("[MY-EVIDENCE] no file_path on evidence");
    }
  } catch (err) {
    console.error("[MY-EVIDENCE] storage lookup threw:", err);
  }

  // Render page with debug panel
  return (
    <div style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <h1>Evidence #{evidence.id}</h1>

      <section style={{ marginTop: 12 }}>
        <p>
          <strong>Title</strong>: {evidence.title ?? "—"}
        </p>
        <p>
          <strong>Status</strong>: {evidence.status}
        </p>
        <p>
          <strong>Category</strong>: {String(evidence.category)}
        </p>
        <p>
          <strong>Submitted by</strong>: {evidence.user_id}
        </p>
        <p>
          <strong>Entity</strong>: {evidence.entity_type} #{evidence.entity_id}
        </p>
      </section>

      <section style={{ marginTop: 12 }}>
        {fileUrl ? (
          <p>
            <a href={fileUrl} target="_blank" rel="noreferrer">
              Download file
            </a>
          </p>
        ) : (
          <p>No file available</p>
        )}
      </section>

      <details style={{ marginTop: 20, background: "#f5f5f5", padding: 12 }}>
        <summary>Server debug info</summary>
        <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
{JSON.stringify(
  {
    invokedAt: new Date().toISOString(),
    params,
    evidenceId,
    authUser: authUser ? { id: authUser.id, email: authUser.email } : null,
    evidence: {
      id: evidence.id,
      user_id: evidence.user_id,
      status: evidence.status,
      file_path: evidence.file_path ?? null,
      created_at: evidence.created_at ?? null,
    },
    fileUrl,
  },
  null,
  2
)}
        </pre>
      </details>

      <div style={{ marginTop: 16, color: "#666" }}>
        Debug logs are written to server logs (console.info / console.error). Remove debug code after verification.
      </div>
    </div>
  );
}
