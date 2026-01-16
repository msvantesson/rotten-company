// app/my-evidence/[id]/page.tsx
import { supabaseRoute } from "@/lib/supabase-route";
import { notFound } from "next/navigation";

export default async function MyEvidencePage({ params }: { params: { id: string } }) {
  const supabase = await supabaseRoute();
  const evidenceId = Number(params.id);

  const { data: evidence, error } = await supabase
    .from("evidence")
    .select("*")
    .eq("id", evidenceId)
    .maybeSingle();

  if (error || !evidence) return notFound();

  let fileUrl: string | null = null;
  try {
    if (evidence.file_path) {
      const { data: fileUrlData } = supabase.storage.from("evidence").getPublicUrl(evidence.file_path);
      fileUrl = fileUrlData?.publicUrl ?? null;
    }
  } catch (e) {
    // ignore storage errors for rendering
  }

  return (
    <div style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <h1>Evidence #{evidence.id}</h1>
      <p><strong>Title</strong>: {evidence.title ?? "—"}</p>
      <p><strong>Status</strong>: {evidence.status}</p>
      <p><strong>Category</strong>: {String(evidence.category)}</p>
      <p><strong>Submitted by</strong>: {evidence.user_id}</p>
      <p><strong>Entity</strong>: {evidence.entity_type} #{evidence.entity_id}</p>

      {fileUrl ? (
        <p><a href={fileUrl} target="_blank" rel="noreferrer">Download file</a></p>
      ) : (
        <p>No file available</p>
      )}

      <details style={{ marginTop: 20, background: "#f5f5f5", padding: 12 }}>
        <summary>Raw evidence JSON</summary>
        <pre>{JSON.stringify(evidence, null, 2)}</pre>
      </details>
    </div>
  );
}
