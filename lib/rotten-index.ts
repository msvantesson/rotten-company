// lib/rotten-index.ts

import { createClient } from "@supabase/supabase-js"

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
  if (entityType === "company") {
    return getCompanyRottenIndex({ normalization, country, limit })
  }

  // TODO: wire these once you’re ready to expose them in the UI
  if (entityType === "leader") {
    return getLeaderRottenIndex({ normalization, limit })
  }

  if (entityType === "owner") {
    return getOwnerRottenIndex({ normalization, limit })
  }

  return []
}

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

  // Adjust the select string if your view shape differs
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
    query.eq("companies.country", country)
  }

  if (limit) {
    query.limit(limit)
  }

  const { data, error } = await query

  if (error || !data) {
    console.error("getCompanyRottenIndex error", error)
    return []
  }

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

async function getLeaderRottenIndex({
  normalization,
  limit,
}: {
  normalization: NormalizationMode
  limit?: number
}): Promise<RottenIndexItem[]> {
  const supabase = getSupabaseServerClient()

  // Adjust to your actual leader_scores + leaders schema
  const query = supabase
    .from("leader_scores")
    .select(
      `
      leader_id,
      rotten_score,
      leaders (
        name,
        slug,
        country
      ),
      leader_category_full_breakdown
    `
    )
    .order("rotten_score", { ascending: false })

  if (limit) {
    query.limit(limit)
  }

  const { data, error } = await query

  if (error || !data) {
    console.error("getLeaderRottenIndex error", error)
    return []
  }

  return data.map((row: any): RottenIndexItem => {
    const absolute = row.rotten_score as number
    const leader = row.leaders ?? {}
    const normalized = normalizeScore(absolute, {}, normalization)

    return {
      type: "leader",
      id: row.leader_id,
      name: leader.name,
      slug: leader.slug,
      country: leader.country,
      absoluteScore: absolute,
      normalizedScore: normalized,
      breakdown: row.leader_category_full_breakdown,
      url: `/leader/${leader.slug}`,
    }
  })
}

async function getOwnerRottenIndex({
  normalization,
  limit,
}: {
  normalization: NormalizationMode
  limit?: number
}): Promise<RottenIndexItem[]> {
  const supabase = getSupabaseServerClient()

  // Adjust to your actual owner_portfolio_breakdown + owners_investors schema
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

  if (limit) {
    query.limit(limit)
  }

  const { data, error } = await query

  if (error || !data) {
    console.error("getOwnerRottenIndex error", error)
    return []
  }

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
