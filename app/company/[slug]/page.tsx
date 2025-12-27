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

type Company = {
  id: number;
  name: string;
  slug: string;
  industry?: string;
  size_employees?: number;
  rotten_score?: number;
} | null;

type CategoryBreakdown = {
  category_id: number;
  category_name: string;
  evidence_count: number;
  avg_score: number | null;
};

export default async function CompanyPage({ params }: { params: Params }) {
  const resolvedParams = (await params) as { slug?: string } | undefined;
  const rawSlug = resolvedParams?.slug ? decodeURIComponent(resolvedParams.slug) : "";

  // 1. Fetch company
  const { data: company, error: companyError }: { data: Company; error: any } =
    await supabase
      .from("companies")
      .select("id, name, slug, industry, size_employees, rotten_score")
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

  // 2. Fetch approved evidence
  const { data: evidence, error: evidenceError }: { data: Evidence[] | null; error: any } =
    await supabase
      .from("evidence")
      .select("id, title, summary, file_url, file_type, file_size")
      .eq("company_id", company.id)
      .eq("status", "approved");

  // 3. Fetch category breakdown (evidence counts)
  const { data: breakdown, error: breakdownError } = await supabase
    .from("company_category_breakdown")
    .select("category_id, category_name, evidence_count")
    .eq("company_id", company.id);

  // 4. Fetch category rankings (avg scores)
  const { data: rankings, error: rankingsError } = await supabase
    .from("category_company_rankings")
    .select("category_id, category_name, avg_score")
    .eq("company_id", company.id);

  // 5. Merge both views
  const mergedBreakdown: CategoryBreakdown[] =
    breakdown?.map((b) => {
      const match = rankings?.find((r) => r.category_id === b.category_id);
      return {
        category_id: b.category_id,
        category_name: b.category_name,
        evidence_count: b.evidence_count,
        avg_score: match?.avg_score ?? null,
      };
    }) ?? [];

  return (
    <div style={{ padding: "2rem" }}>
      <h1>{company.name}</h1>

      <p><strong>Industry:</strong> {company.industry ?? "Unknown"}</p>
      <p><strong>Employees:</strong> {company.size_employees ?? "Unknown"}</p>
      <p><strong>Rotten Score:</strong> {company.rotten_score ?? 0}</p>

      <h2 style={{ marginTop: "2rem" }}>Rotten Score Breakdown</h2>

      <table style={{ borderCollapse: "collapse", marginBottom: "2rem" }}>
        <thead>
          <tr>
            <th style={{ borderBottom: "1px solid #ccc", padding: "8px" }}>Category</th>
            <th style={{ borderBottom: "1px solid #ccc", padding: "8px" }}>Evidence Count</th>
            <th style={{ borderBottom: "1px solid #ccc", padding: "8px" }}>Avg Rating</th>
          </tr>
        </thead>
        <tbody>
          {mergedBreakdown.map((row) => (
            <tr key={row.category_id}>
              <td style={{ padding: "8px" }}>{row.category_name}</td>
              <td style={{ padding: "8px" }}>{row.evidence_count}</td>
              <td style={{ padding: "8px" }}>
                {row.avg_score !== null ? row.avg_score.toFixed(2) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {(breakdownError || rankingsError) && (
        <pre>{JSON.stringify({ breakdownError, rankingsError }, null, 2)}</pre>
      )}

      <h2>Approved Evidence</h2>
      <EvidenceList evidence={evidence || []} />

      {evidenceError ? (
        <pre style={{ marginTop: 12 }}>{JSON.stringify(evidenceError, null, 2)}</pre>
      ) : null}
    </div>
  );
}
