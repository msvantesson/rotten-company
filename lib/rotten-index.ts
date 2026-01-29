import { createClient } from "@supabase/supabase-js"
import { getLeaderData } from "@/lib/getLeaderData"

export type EntityType = "company" | "leader" | "owner"
export type NormalizationMode = "none" | "employees" | "revenue"

export type RottenIndexItem = {
  type: EntityType
  id: number
  name: string
  slug?: string
  country?: string | null
  absoluteScore: number
  normalizedScore: number
  breakdown: any
  url: string
}

function getSupabaseServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string
  )
}

function normalizeScore(
  score: number,
  company: { employees?: number | null; annual_revenue?: number | null } | null,
  mode: NormalizationMode
) {
  if (mode === "employees" && company?.employees && company.employees > 0) {
    return score / Math.log(company.employees + 10)
  }

  if (mode === "revenue" && company?.annual_revenue && company.annual_revenue > 0) {
    return score / Math.log(Number(company.annual_revenue) + 10)
  }

  return score
}

type GetGlobalRottenIndexArgs = {
  entityType?: EntityType
  normalization?: NormalizationMode
  country?: string
  limit?: number
}

export async function getGlobalRottenIndex({
  entityType = "company",
  normalization = "none",
  country,
  limit,
}: GetGlobalRottenIndexArgs): Promise<RottenIndexItem[]> {
  if (entityType === "company") {
    return getCompanyRottenIndex({ normalization, country, limit })
  }

  if (entityType === "leader") {
    return getLeaderRottenIndex({ normalization, country, limit })
  }

  if (entityType === "owner") {
    return getOwnerRottenIndex({ normalization, country, limit })
  }

  return []
}

/* ---------------- COMPANY ---------------- */

async function getCompanyRottenIndex({
  normalization,
  country,
  limit,
}: {
  normalization: NormalizationMode
  country?: string
  limit?: number
}): Promise<RottenIndexItem[]> {
  const supabase = getSupabaseServerClient()

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
    .order("rotten_score", { ascending: false })

  if (country) query.eq("companies.country", country)
  if (limit) query.limit(limit)

  const { data, error } = await query
  if (error || !data) return []

  return data.map((row: any): RottenIndexItem => {
    const company = row.companies ?? null
    const absolute = row.rotten_score as number
    const normalized = normalizeScore(absolute, company, normalization)

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
    }
  })
}

/* ---------------- LEADER ---------------- */

async function getLeaderRottenIndex({
  normalization,
  country,
  limit,
}: {
  normalization: NormalizationMode
  country?: string
  limit?: number
}): Promise<RottenIndexItem[]> {
  const supabase = getSupabaseServerClient()

  const { data: leadersRaw, error } = await supabase
    .from("leaders")
    .select(`
      id,
      name,
      slug,
      companies (
        id,
        name,
        slug,
        country,
        employees,
        annual_revenue
      )
    `)
    .limit(1000)

  if (error || !leadersRaw) return []

  const filtered = leadersRaw.filter((l: any) => {
    const company = l.companies?.[0] ?? null
    return !country || company?.country === country
  })

  const detailed = await Promise.all(
    filtered.map(async (l: any) => {
      if (!l.slug) return null

      const data = await getLeaderData(l.slug)
      if (!data) return null

      const company = l.companies?.[0] ?? null
      const absolute = data.score?.final_score ?? 0
      const normalized = normalizeScore(absolute, company, normalization)

      return {
        type: "leader",
        id: data.leader.id,
        name: data.leader.name,
        slug: data.leader.slug,
        country: company?.country ?? null,
        absoluteScore: absolute,
        normalizedScore: normalized,
        breakdown: data.categories ?? {},
        url: `/leader/${data.leader.slug}`,
      } satisfies RottenIndexItem
    })
  )

  const valid = detailed.filter(Boolean) as RottenIndexItem[]
  valid.sort((a, b) => b.normalizedScore - a.normalizedScore)

  return limit ? valid.slice(0, limit) : valid
}

/* ---------------- OWNER ---------------- */

async function getOwnerRottenIndex({
  normalization,
  country,
  limit,
}: {
  normalization: NormalizationMode
  country?: string
  limit?: number
}): Promise<RottenIndexItem[]> {
  const supabase = getSupabaseServerClient()

  const query = supabase
    .from("owner_portfolio_breakdown")
    .select(`
      owner_id,
      portfolio_rotten_score,
      owners_investors (
        name,
        slug,
        country
      ),
      owner_category_full_breakdown
    `)
    .order("portfolio_rotten_score", { ascending: false })

  if (country) query.eq("owners_investors.country", country)
  if (limit) query.limit(limit)

  const { data, error } = await query
  if (error || !data) return []

  return data.map((row: any): RottenIndexItem => {
    const owner = row.owners_investors ?? null
    const absolute = row.portfolio_rotten_score as number
    const normalized = normalizeScore(absolute, null, normalization)

    return {
      type: "owner",
      id: row.owner_id,
      name: owner?.name,
      slug: owner?.slug,
      country: owner?.country,
      absoluteScore: absolute,
      normalizedScore: normalized,
      breakdown: row.owner_category_full_breakdown,
      url: `/owner/${owner?.slug}`,
    }
  })
}
