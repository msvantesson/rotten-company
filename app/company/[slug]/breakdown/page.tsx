import { notFound } from "next/navigation";
import { getCompanyBySlug } from "@/lib/getCompanyBySlug";
import { getEvidenceWithManagers } from "@/lib/getEvidenceWithManagers";
import { supabase } from "@/lib/supabaseClient";
import { BreakdownView } from "@/components/BreakdownView";

export default async function BreakdownPage({
  params,
}: {
  params: { slug: string };
}) {
  const slug = params?.slug;
  console.log("✅ breakdown/page.tsx received slug:", slug);

  if (!slug) {
    console.warn("⚠️ No slug provided");
    return notFound();
  }

  //
  // STEP 1 — Load company by slug
  //
  const company = await getCompanyBySlug(slug);

  if (!company) {
    console.warn("⚠️ No company found for slug:", slug);
    return notFound();
  }

  console.log("✅ Loaded company:", company.name, "→ ID:", company.id);

  //
  // STEP 2 — Load breakdown data
  //
  const { data: breakdown, error: breakdownError } = await supabase
    .from("company_category_breakdown")
    .select("*")
    .eq("company_id", company.id);

  if (breakdownError) {
    console.error("❌ Breakdown query failed:", breakdownError);
  }

  if (!breakdown || breakdown.length === 0) {
    console.warn("⚠️ No breakdown data available for company:", company.id);
  } else {
    console.log("✅ Loaded breakdown rows:", breakdown.length);
  }

  //
  // STEP 3 — Load approved evidence with manager/category enrichment
  //
  const evidence = await getEvidenceWithManagers(company.id);
  console.log("✅ Final enriched evidence count:", evidence.length);

  //
  // STEP 4 — Render breakdown view
  //
  return (
    <BreakdownView
      company={company}
      breakdown={breakdown ?? []}
      evidence={evidence}
    />
  );
}
