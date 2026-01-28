export type NormalizationMode = "none" | "employees" | "revenue"

export function normalizeScore(
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
