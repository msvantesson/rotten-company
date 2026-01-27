import { supabaseServer } from "@/lib/supabase-server";
import { redirect, notFound } from "next/navigation";
import EvidenceUpload from "@/components/EvidenceUpload";

export default async function SubmitEvidencePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const resolved = await params;
  const slug = resolved.slug;

  const supabase = await supabaseServer();

  // Ensure user is logged in
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Load company by slug
  const { data: company, error } = await supabase
    .from("companies")
    .select("id, name, slug")
    .eq("slug", slug)
    .single();

  if (error || !company) {
    notFound();
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-6">
        Submit Evidence for {company.name}
      </h1>

      <EvidenceUpload entityId={company.id} entityType="company" />
    </div>
  );
}
