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

  if (error || !evidence) {
    return notFound();
  }

  // Build public URL for file
  const { data: fileUrlData } = supabase.storage
    .from("evidence")
    .getPublicUrl(evidence.file_path);

  const fileUrl = fileUrlData?.publicUrl ?? null;

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Evidence #{evidence.id}</h1>

      <p><strong>Title:</strong> {evidence.title}</p>
      <p><strong>Status:</strong> {evidence.status}</p>
      <p><strong>Category:</strong> {evidence.category}</p>
      <p><strong>Entity:</strong> {evidence.entity_type} #{evidence.entity_id}</p>

      {fileUrl && (
        <p>
          <a href={fileUrl} target="_blank" rel="noopener noreferrer">
            Download file
          </a>
        </p>
      )}

      <pre style={{ marginTop: "2rem", background: "#f5f5f5", padding: "1rem" }}>
        {JSON.stringify(evidence, null, 2)}
      </pre>
    </div>
  );
}
