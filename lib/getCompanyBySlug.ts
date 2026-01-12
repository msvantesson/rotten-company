import { supabase } from "@/lib/supabaseClient";

export type CompanyWithRelations = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  country: string | null;
  industry: string | null;
  employee_count: number | null;

  // Derived
  avg_rating: number | null;
  rating_count: number;
  evidence_count: number;

  // Relations
  owners: Array<{ id: number; name: string }>;
  leaders: Array<{ id: number; name: string }>;
  investors: Array<{ id: number; name: string }>;
  managers: Array<{ id: number; name: string }>;

  // Category breakdown
  breakdown: Array<{
    category_id: number;
    category_name: string;
    rating_count: number;
    avg_rating_score: number | null;
    evidence_count: number;
    evidence_score: number | null;
    final_score: number | null;
  }>;
};

export async function getCompanyBySlug(
  slug: string
): Promise<CompanyWithRelations | null> {
  console.log("🔍 getCompanyBySlug →", slug);

  //
  // STEP 1 — Load company
  //
  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("*")
    .eq("slug", slug)
    .single();

  if (companyError) {
    console.error("❌ Company load error:", companyError);
    return null;
  }

  if (!company) {
    console.warn("⚠️ No company found for slug:", slug);
    return null;
  }

  //
  // STEP 2 — Load owners
  //
  const { data: owners } = await supabase
    .from("owners_investors")
    .select("id, name")
    .eq("company_id", company.id);

  //
  // STEP 3 — Load leaders
  //
  const { data: leaders } = await supabase
    .from("leaders")
    .select("id, name")
    .eq("company_id", company.id);

  //
  // STEP 4 — Load investors
  //
  const { data: investors } = await supabase
    .from("owners_investors")
    .select("id, name")
    .eq("company_id", company.id);

  //
  // STEP 5 — Load managers (contextual metadata only)
  //
  const { data: managers } = await supabase
    .from("managers")
    .select("id, name")
    .eq("company_id", company.id);

  //
  // STEP 6 — Load category breakdown
  //
  const { data: breakdown, error: breakdownError } = await supabase
    .from("company_category_breakdown")
    .select(
      `
      category_id,
      category_name,
      rating_count,
      avg_rating_score,
      evidence_count,
      evidence_score,
      final_score
    `
    )
    .eq("company_id", company.id);

  if (breakdownError) {
    console.error("❌ Breakdown load error:", breakdownError);
  }

  // STEP 7 — Load aggregate rating info
const { data: ratingAggRaw } = await supabase
  .from("ratings")
  .select("score")
  .eq("company_id", company.id);

const ratingAgg = ratingAggRaw ?? [];

const rating_count = ratingAgg.length;

const avg_rating =
  rating_count > 0
    ? ratingAgg.reduce((sum, r) => sum + (r.score ?? 0), 0) / rating_count
    : null;
  //
  // STEP 8 — Load evidence count
  //
  const { count: evidence_count } = await supabase
    .from("evidence")
    .select("*", { count: "exact", head: true })
    .eq("company_id", company.id)
    .eq("status", "approved");

  //
  // STEP 9 — Return normalized object
  //
  return {
    id: company.id,
    name: company.name,
    slug: company.slug,
    description: company.description ?? null,
    country: company.country ?? null,
    industry: company.industry ?? null,
    employee_count: company.employee_count ?? null,

    avg_rating,
    rating_count,
    evidence_count: evidence_count ?? 0,

    owners: owners ?? [],
    leaders: leaders ?? [],
    investors: investors ?? [],
    managers: managers ?? [],

    breakdown: breakdown ?? [],
  };
}
