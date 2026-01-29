// lib/rotten-index.ts

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
  company: { employees?: number | null; annual_revenue?: number | null },
  mode: NormalizationMode
) {
  if (mode === "employees" && company.employees && company.employees > 0) {
    return score / Math.log(company.employees + 10)
  }

  if (mode === "revenue" && company.annual_revenue && company.annual_revenue > 0) {
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
  console.log(`[GlobalIndex] Loading entityType=${entityType}, country=${country}, limit=${limit}`)

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

/* -------------------------------------------------- */
/*                COMPANY ROTTEN INDEX                */
/* -------------------------------------------------- */

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

  console.log("[CompanyIndex] Fetching companies...")

  const query = supabase
    .from("company_rotten_score")
    .select(
      `
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
    `
    )
    .order("rotten_score", { ascending: false })

  if (country) {
    console.log(`[CompanyIndex] Filtering by country=${country}`)
    query.eq("companies.country", country)
  }

  if (limit) {
    query.limit(limit)
  }

  const { data, error } = await query

  if (error || !data) {
    console.error("[CompanyIndex] Error:", error)
    return []
  }

  console.log(`[CompanyIndex] Returning ${data.length} companies.`)

  return data.map((row: any): RottenIndexItem => {
    const absolute = row.rotten_score as number
    const company = row.companies ?? {}
    const normalized = normalizeScore(absolute, company, normalization)

    return {
      type: "company",
      id: row.company_id,
      name: company.name,
      slug: company.slug,
      country: company.country,
      absoluteScore: absolute,
      normalizedScore: normalized,
      breakdown: row.company_category_full_breakdown,
      url: `/company/${company.slug}`,
    }
  })
}

/* -------------------------------------------------- */
/*                LEADER ROTTEN INDEX                 */
/* -------------------------------------------------- */

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

  console.log("[LeaderIndex] Fetching leaders...")

  const { data: leadersRaw, error } = await supabase
    .from("leaders")
    .select(
      `
      id,
      name,
      slug,
      company_id,
      companies (
        id,
        name,
        slug,
        country,
        employees,
        annual_revenue
      )
    `
    )
    .limit(1000)

  if (error || !leadersRaw) {
    console.error("[LeaderIndex] Supabase error:", error)
    return []
  }

  console.log(`[LeaderIndex] Fetched ${leadersRaw.length} leaders.`)

  const filtered = leadersRaw.filter((l: any) => {
    const company = l.companies ?? null
    const c = company?.country ?? null
    const passes = !country || c === country
    if (!passes) {
      console.log(`[LeaderIndex] Skipping ${l.slug} — country mismatch (${c})`)
    }
    return passes
  })

  console.log(`[LeaderIndex] ${filtered.length} leaders after country filter.`)

  const detailed = await Promise.all(
    filtered.map(async (l: any) => {
      if (!l.slug) {
        console.log("[LeaderIndex] Skipping leader with missing slug.")
        return null
      }

      console.log(`[LeaderIndex] Loading leader data for: ${l.slug}`)

      const data = await getLeaderData(l.slug)

      if (!data) {
        console.log(`[LeaderIndex] getLeaderData returned null for ${l.slug}`)
        return null
      }

      const company = l.companies ?? null
      const c = company?.country ?? null

      const absolute = data.score?.final_score ?? 0
      const normalized = normalizeScore(absolute, company ?? {}, normalization)

      console.log(`[LeaderIndex] Leader ${l.slug} → score=${absolute}, normalized=${normalized}`)

      return {
        type: "leader" as const,
        id: data.leader.id,
        name: data.leader.name,
        slug: data.leader.slug,
        country: c,
        absoluteScore: absolute,
        normalizedScore: normalized,
        breakdown: data.categories ?? {},
        url: `/leader/${data.leader.slug}`,
      } satisfies RottenIndexItem
    })
  )

  const valid = detailed.filter((x) => x !== null) as RottenIndexItem[]

  console.log(`[LeaderIndex] ${valid.length} leaders after scoring.`)

  valid.sort((a, b) => b.normalizedScore - a.normalizedScore)

  const sliced = limit ? valid.slice(0, limit) : valid

  console.log(`[LeaderIndex] Returning ${sliced.length} leaders.`)

  return sliced
}

/* -------------------------------------------------- */
/*                OWNER ROTTEN INDEX                  */
/* -------------------------------------------------- */

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

  console.log("[OwnerIndex] Fetching owners...")

  const query = supabase
    .from("owner_portfolio_breakdown")
    .select(
      `
      owner_id,
      portfolio_rotten_score,
      owners_investors (
        name,
        slug,
        country
      ),
      owner_category_full_breakdown
    `
    )
    .order("portfolio_rotten_score", { ascending: false })

  if (country) {
    query.eq("owners_investors.country", country)
  }

  if (limit) {
    query.limit(limit)
  }

  const { data, error } = await query

  if (error || !data) {
    console.error("[OwnerIndex] Error:", error)
    return []
  }

  console.log(`[OwnerIndex] Returning ${data.length} owners.`)

  return data.map((row: any): RottenIndexItem => {
    const absolute = row.portfolio_rotten_score as number
    const owner = row.owners_investors ?? {}
    const normalized = normalizeScore(absolute, {}, normalization)

    return {
      type: "owner",
      id: row.owner_id,
      name: owner.name,
      slug: owner.slug,
      country: owner.country,
      absoluteScore: absolute,
      normalizedScore: normalized,
      breakdown: row.owner_category_full_breakdown,
      url: `/owner/${owner.slug}`,
    }
  })
}
