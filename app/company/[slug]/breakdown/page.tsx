import { notFound } from "next/navigation";
import { getCompanyBySlug } from "@/lib/getCompanyBySlug";
import { getEvidenceWithManagers } from "@/lib/getEvidenceWithManagers";
import { supabase } from "@/lib/supabaseClient";
import { CategoryBreakdown } from "@/components/CategoryBreakdown";

export default async function BreakdownPage({ params }: { params: { slug: string } }) {
  const slug = params?.slug;

  console.log("🔍 breakdown/page.tsx received slug:", slug);

  if (!slug) {
    console.warn("⚠️ Missing slug");
    return notFound();
  }

  const company = await getCompanyBySlug(slug);

  if (!company) {
    console.warn("⚠️ No company found for slug:", slug);
    return notFound();
  }

  console.log("✅ Loaded company:", company.name, "→ ID:", company.id);

  const { data: breakdown, error: breakdownError } = await supabase
    .from("company_category_breakdown")
    .select("*")
    .eq("company_id", company.id);

  if (breakdownError) {
    console.error("❌ Breakdown query failed:", breakdownError);
  }

  console.log("📊 Breakdown rows:", breakdown?.length ?? 0);

  const evidence = await getEvidenceWithManagers(company.id);

  console.log("📄 Evidence count:", evidence.length);

  return (
    <CategoryBreakdown
      company={company}
      breakdown={breakdown ?? []}
      evidence={evidence}
    />
  );
}
