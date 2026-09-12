import { cache } from "react";
import { resolveCompanySlug, type CompanySlugResolution } from "@/lib/company-slug";
import { supabaseServer } from "@/lib/supabase-server";

export type CompanyDetailCompanyRow = {
  id: number;
  name: string;
  slug: string;
  industry: string | null;
  size_employees_range: string | null;
  country: string | null;
  hq_region: string | null;
  hq_city: string | null;
  website: string | null;
  description: string | null;
  updated_at: string | null;
};

export type CompanyDetailBreakdownRow = {
  category_id: number;
  category_name: string;
  rating_count: number | null;
  avg_rating_score: number | null;
  evidence_count: number | null;
  severity_score: number | null;
  final_score: number | null;
  misconduct_low_count: number | null;
  misconduct_medium_count: number | null;
  misconduct_high_count: number | null;
  remediation_low_count: number | null;
  remediation_medium_count: number | null;
  remediation_high_count: number | null;
};

type CompanyDetailRouteData = {
  slugResolution: CompanySlugResolution;
  company: CompanyDetailCompanyRow | null;
  companyError: unknown | null;
  breakdown: CompanyDetailBreakdownRow[];
  evidenceCount: number | null;
  rottenScore: number | null;
};

export function getCompanyDetailErrorCode(error: unknown): string | null {
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    typeof (error as { code?: unknown }).code === "string"
  ) {
    return (error as { code: string }).code;
  }

  return null;
}

export function getCompanyDetailErrorMessage(error: unknown): string | null {
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }

  return null;
}

export const getCompanyDetailRouteData = cache(async (
  requestedSlug: string,
): Promise<CompanyDetailRouteData> => {
  const supabase = await supabaseServer();
  const slugResolution = await resolveCompanySlug(
    supabase as unknown as Parameters<typeof resolveCompanySlug>[0],
    requestedSlug,
  );

  if (slugResolution.kind !== "canonical") {
    return {
      slugResolution,
      company: null,
      companyError: null,
      breakdown: [],
      evidenceCount: null,
      rottenScore: null,
    };
  }

  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select(
      "id, name, slug, industry, size_employees_range, country, hq_region, hq_city, website, description, updated_at",
    )
    .eq("id", slugResolution.companyId)
    .maybeSingle();

  if (companyError || !company) {
    return {
      slugResolution,
      company: (company as CompanyDetailCompanyRow | null) ?? null,
      companyError,
      breakdown: [],
      evidenceCount: null,
      rottenScore: null,
    };
  }

  let breakdown: CompanyDetailBreakdownRow[] = [];
  let evidenceCount: number | null = 0;
  try {
    const { data: breakdownRows, error: breakdownError } = await supabase
      .from("company_category_full_breakdown")
      .select(
        "category_id, category_name, rating_count, avg_rating_score, evidence_count, severity_score, final_score, misconduct_low_count, misconduct_medium_count, misconduct_high_count, remediation_low_count, remediation_medium_count, remediation_high_count",
      )
      .eq("company_id", company.id);

    if (breakdownError) {
      console.error("Company detail breakdown lookup failed", {
        slug: slugResolution.canonicalSlug,
        error: getCompanyDetailErrorMessage(breakdownError),
      });
      evidenceCount = null;
    } else {
      breakdown = (breakdownRows ?? []) as CompanyDetailBreakdownRow[];
      evidenceCount = breakdown.reduce(
        (sum, row) => sum + (row.evidence_count ?? 0),
        0,
      );
    }
  } catch (error) {
    console.error("Company detail breakdown lookup failed", {
      slug: slugResolution.canonicalSlug,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    evidenceCount = null;
  }

  let rottenScore: number | null = null;
  try {
    const { data: scoreRow, error: scoreError } = await supabase
      .from("company_rotten_score_v2")
      .select("rotten_score")
      .eq("company_id", company.id)
      .maybeSingle();

    if (scoreError) {
      console.error("Company detail score lookup failed", {
        slug: slugResolution.canonicalSlug,
        error: getCompanyDetailErrorMessage(scoreError),
      });
    } else if (
      scoreRow &&
      typeof scoreRow.rotten_score === "number" &&
      Number.isFinite(scoreRow.rotten_score)
    ) {
      rottenScore = scoreRow.rotten_score;
    }
  } catch (error) {
    console.error("Company detail score lookup failed", {
      slug: slugResolution.canonicalSlug,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }

  return {
    slugResolution,
    company: company as CompanyDetailCompanyRow,
    companyError: null,
    breakdown,
    evidenceCount,
    rottenScore,
  };
});
