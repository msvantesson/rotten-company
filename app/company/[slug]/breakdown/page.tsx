import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase-server";
import { getEvidenceWithManagers } from "@/lib/getEvidenceWithManagers";
import { CategoryBreakdown } from "@/components/CategoryBreakdown";

export default async function BreakdownPage({
  params,
}: {
  params: { slug?: string };
}) {
  const slug = params?.slug;

  if (!slug) {
    console.warn("⚠️ Missing slug in breakdown page");
    return notFound();
  }

  const supabase = await supabaseServer();

  const { data: company } = await supabase
    .from("companies")
    .select("id, name, slug, industry, size_employees, rotten_score")
    .eq("slug", slug)
    .maybeSingle();

  if (!company) {
    return notFound();
  }

  const { data: breakdown } = await supabase
    .from("company_category_breakdown")
    .select(
      "category_id, category_name, rating_count, avg_rating_score, evidence_count, evidence_score, final_score"
    )
    .eq("company_id", company.id);

  const evidence = await getEvidenceWithManagers(company.id);

  return (
    <div style={{ padding: "2rem" }}>
      <h1 className="text-2xl font-bold" style={{ marginBottom: "1rem" }}>
        {company.name} – Rotten Score Breakdown
      </h1>

      <CategoryBreakdown
        company={company}
        breakdown={breakdown ?? []}
        evidence={evidence ?? []}
      />
    </div>
  );
}
