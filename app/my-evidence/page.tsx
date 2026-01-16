// app/my-evidence/[id]/page.tsx
import { supabaseRoute } from "@/lib/supabase-route";
import { notFound } from "next/navigation";

export default async function MyEvidencePage({ params }: { params: { id: string } }) {
  const supabase = await supabaseRoute();

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  const authUser = userData?.user ?? null;
  console.info("/my-evidence server - authUser:", { id: authUser?.id, email: authUser?.email, userErr: userErr ?? null });

  const evidenceId = Number(params.id);
  const { data: evidence, error } = await supabase.from("evidence").select("*").eq("id", evidenceId).maybeSingle();
  console.info("/my-evidence server - evidence fetch:", { evidence, error });

  if (error || !evidence) return notFound();

  const { data: fileUrlData } = supabase.storage.from("evidence").getPublicUrl(evidence.file_path);
  const fileUrl = fileUrlData?.publicUrl ?? null;

  return (
    <div style={{ padding: 24 }}>
      <h1>Evidence #{evidence.id}</h1>
      <p><strong>Title:</strong> {evidence.title}</p>
      <p><strong>Status:</strong> {evidence.status}</p>
      <p><strong>Category:</strong> {evidence.category}</p>
      <p><strong>Entity:</strong> {evidence.entity_type} #{evidence.entity_id}</p>

      {fileUrl && (
        <p><a href={fileUrl} target="_blank" rel="noreferrer">Download file</a></p>
      )}

      <pre style={{ marginTop: 20, background: "#f5f5f5", padding: 12 }}>{JSON.stringify(evidence, null, 2)}</pre>
    </div>
  );
}
