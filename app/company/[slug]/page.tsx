// app/company/[slug]/page.tsx
export const dynamic = "force-dynamic";
export const dynamicParams = true;
export const fetchCache = "force-no-store";

import { supabase } from "@/lib/supabaseClient";
import { EvidenceList } from "@/components/EvidenceList";

type Params = Promise<{ slug: string }> | { slug: string };

type Evidence = {
  id: number;
  title: string;
  summary?: string;
  file_url?: string;
  file_type?: string;
  file_size?: number;
};

type Company = { id: number; name: string; slug: string } | null;

export default async function CompanyPage({ params }: { params: Params }) {
  const resolvedParams = (await params) as { slug?: string } | undefined;
  const rawSlug = resolvedParams?.slug ? decodeURIComponent(resolvedParams.slug) : "";

  const { data: company, error: companyError }: { data: Company; error: any } =
    await supabase
      .from("companies")
      .select("id, name, slug")
      .eq("slug", rawSlug)
      .maybeSingle();

  if (!company) {
    return (
      <div style={{ padding: "2rem" }}>
        <h1>No company found</h1>
        <p><strong>Slug</strong>: {rawSlug || "null"}</p>
        <pre>{JSON.stringify(companyError, null, 2)}</pre>
      </div>
    );
  }

  const { data: evidence, error: evidenceError }: { data: Evidence[] | null; error: any } =
    await supabase
      .from("evidence")
      .select("id, title, summary, file_url, file_type, file_size")
      .eq("company_id", company.id)
      .eq("status", "approved");

  return (
    <div style={{ padding: "2rem" }}>
      <h1>{company.name}</h1>
      <h2>Approved Evidence</h2>

      <EvidenceList evidence={evidence || []} />

      {evidenceError ? (
        <pre style={{ marginTop: 12 }}>{JSON.stringify(evidenceError, null, 2)}</pre>
      ) : null}
    </div>
  );
}
