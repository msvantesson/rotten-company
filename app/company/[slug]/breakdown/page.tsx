import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase-server";
import { getEvidenceWithManagers } from "@/lib/getEvidenceWithManagers";
import { CategoryBreakdown } from "@/components/CategoryBreakdown";
import CompanyTabs from "@/components/CompanyTabs";

export default async function BreakdownPage({
  params,
}: {
  params: Promise<{ slug?: string }> | { slug?: string };
}) {
  const resolvedParams = await Promise.resolve(params);
  const slug = resolvedParams?.slug;

  if (!slug) {
    console.warn("⚠️ Missing slug in breakdown page");
    return notFound();
  }

  const supabase = await supabaseServer();

  // 1) Load company
  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("id, name, slug, industry, size_employees, rotten_score")
    .eq("slug", slug)
    .maybeSingle();

  if (companyError) {
    console.error("❌ Error loading company in breakdown page:", slug, companyError);
  }

  if (!company) {
    console.warn("⚠️ No company found for slug in breakdown page:", slug);
    return notFound();
  }

  // 2) Load breakdown
  let breakdown: any[] = [];
  try {
    const { data, error } = await supabase
      .from("company_category_breakdown")
      .select(
        "category_id, category_name, rating_count, avg_rating_score, evidence_count, evidence_score, final_score"
      )
      .eq("company_id", company.id);

    if (error) {
      console.error("❌ Error loading breakdown for company:", company.id, error);
    }

    breakdown = data ?? [];
  } catch (e) {
    console.error("❌ Unexpected error loading breakdown:", company.id, e);
    breakdown = [];
  }

  // 3) Load evidence
  let evidence: any[] = [];
  try {
    evidence = (await getEvidenceWithManagers(company.id)) ?? [];
  } catch (e) {
    console.error("❌ Error loading evidence for company:", company.id, e);
    evidence = [];
  }

  // 4) Render
  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <header>
        <h1 className="text-2xl font-bold mb-4">
          {company.name} – Rotten Score Breakdown
        </h1>
        <CompanyTabs slug={company.slug} />
      </header>

      <CategoryBreakdown
        company={company}
        breakdown={breakdown}
        evidence={evidence}
      />
    </div>
  );
}
