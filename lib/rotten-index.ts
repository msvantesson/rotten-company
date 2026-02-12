import { supabaseService } from "@/lib/supabase-service";

type EntityType = "company" | "leader" | "owner";
type NormalizationMode = "none" | "employees" | "revenue";

export type RottenIndexItem = {
  type: EntityType;
  id: number;
  name: string | null;
  slug: string | null;
  country: string | null;
  absoluteScore: number;
  normalizedScore: number;
  breakdown: any;
  url: string;
};

function getSupabaseServerClient() {
  // Previously: createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  // Now delegate to the shared helper with identical configuration.
  return supabaseService();
}

function normalizeScore(
  score: number,
  company: { employees?: number | null; annual_revenue?: number | null } | null,
  mode: NormalizationMode,
) {
  if (mode === "employees" && company?.employees && company.employees > 0) {
    return score / Math.log(company.employees + 10);
  }

  if (mode === "revenue" && company?.annual_revenue && company.annual_revenue > 0) {
    return score / Math.log(Number(company.annual_revenue) + 10);
  }

  return score;
}

type GetGlobalRottenIndexArgs = {
  entityType?: EntityType;
  normalization?: NormalizationMode;
  country?: string;
  limit?: number;
};

export async function getGlobalRottenIndex({
  entityType = "company",
  normalization = "none",
  country,
  limit,
}: GetGlobalRottenIndexArgs): Promise<RottenIndexItem[]> {
  if (entityType === "company") {
    return getCompanyRottenIndex({ normalization, country, limit });
  }

  if (entityType === "leader") {
    return getLeaderRottenIndex({ normalization, country, limit });
  }

  if (entityType === "owner") {
    return getOwnerRottenIndex({ normalization, country, limit });
  }

  return [];
}

/* ---------------- COMPANY ---------------- */

async function getCompanyRottenIndex({
  normalization,
  country,
  limit,
}: {
  normalization: NormalizationMode;
  country?: string;
  limit?: number;
}): Promise<RottenIndexItem[]> {
  const supabase = getSupabaseServerClient();

  const query = supabase
    .from("company_rotten_score")
    .select(`
      company_id,
      rotten_score,
      companies (
        name,
        slug,
        country,
        employees,
        annual_revenue
      ),
      company_category_full_breakdown
    `)
    .order("rotten_score", { ascending: false });

  if (country) query.eq("companies.country", country);
  if (limit) query.limit(limit);

  const { data, error } = await query;
  if (error || !data) return [];

  return data.map((row: any): RottenIndexItem => {
    const company = row.companies ?? null;
    const absolute = row.rotten_score as number;
    const normalized = normalizeScore(absolute, company, normalization);

    return {
      type: "company",
      id: row.company_id,
      name: company?.name,
      slug: company?.slug,
      country: company?.country,
      absoluteScore: absolute,
      normalizedScore: normalized,
      breakdown: row.company_category_full_breakdown,
      url: `/company/${company?.slug}`,
    };
  });
}

/* ---------------- LEADER ---------------- */

async function getLeaderRottenIndex({
  normalization,
  country,
  limit,
}: {
  normalization: NormalizationMode;
  country?: string;
  limit?: number;
}): Promise<RottenIndexItem[]> {
  const supabase = getSupabaseServerClient();

  const { data: leadersRaw, error } = await supabase
    .from("leaders")
    .select(`
      id,
      name,
      slug,
      country,
      employees,
      annual_revenue,
      leader_rotten_score (
        rotten_score,
        leader_category_full_breakdown
      )
    `)
    .order("leader_rotten_score(rotten_score)", { ascending: false });

  if (error || !leadersRaw) return [];

  const leaders = leadersRaw.filter((row: any) => row.leader_rotten_score != null);

  const filtered = country
    ? leaders.filter((l: any) => l.country === country)
    : leaders;

  const limited = typeof limit === "number" ? filtered.slice(0, limit) : filtered;

  return limited.map((row: any): RottenIndexItem => {
    const absolute = row.leader_rotten_score.rotten_score as number;
    const normalized = normalizeScore(absolute, row, normalization);

    return {
      type: "leader",
      id: row.id,
      name: row.name,
      slug: row.slug,
      country: row.country,
      absoluteScore: absolute,
      normalizedScore: normalized,
      breakdown: row.leader_rotten_score.leader_category_full_breakdown,
      url: `/leader/${row.slug}`,
    };
  });
}

/* ---------------- OWNER / INVESTOR ---------------- */

async function getOwnerRottenIndex({
  normalization,
  country,
  limit,
}: {
  normalization: NormalizationMode;
  country?: string;
  limit?: number;
}): Promise<RottenIndexItem[]> {
  const supabase = getSupabaseServerClient();

  const { data: ownersRaw, error } = await supabase
    .from("owners_investors")
    .select(`
      id,
      name,
      slug,
      country,
      employees,
      annual_revenue,
      owner_investor_rotten_score (
        rotten_score,
        owner_investor_category_full_breakdown
      )
    `)
    .order("owner_investor_rotten_score(rotten_score)", { ascending: false });

  if (error || !ownersRaw) return [];

  const owners = ownersRaw.filter(
    (row: any) => row.owner_investor_rotten_score != null,
  );

  const filtered = country
    ? owners.filter((o: any) => o.country === country)
    : owners;

  const limited = typeof limit === "number" ? filtered.slice(0, limit) : filtered;

  return limited.map((row: any): RottenIndexItem => {
    const absolute = row.owner_investor_rotten_score.rotten_score as number;
    const normalized = normalizeScore(absolute, row, normalization);

    return {
      type: "owner",
      id: row.id,
      name: row.name,
      slug: row.slug,
      country: row.country,
      absoluteScore: absolute,
      normalizedScore: normalized,
      breakdown: row.owner_investor_rotten_score
        .owner_investor_category_full_breakdown,
      url: `/owner/${row.slug}`,
    };
  });
}
