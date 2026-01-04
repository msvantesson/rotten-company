import { getFlavor } from "@/lib/get-flavor";

export function buildCompanyJsonLd({
  company,
  rottenScore,
  breakdown,
}: {
  company: {
    id: number;
    name: string;
    slug: string;
    industry?: string;
    size_employees?: number;
  };
  rottenScore: number | null;
  breakdown: {
    category_id: number;
    category_name: string;
    evidence_count: number;
    avg_score: number | null;
    flavor: string;
  }[];
}) {
  const { microFlavor, macroTier } = getFlavor(rottenScore ?? 0);

  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: company.name,
    url: `https://rotten-company.com/company/${company.slug}`,
    industry: company.industry ?? undefined,
    numberOfEmployees: company.size_employees ?? undefined,

    rottenScore: rottenScore ?? undefined,
    rottenScoreFlavor: microFlavor,
    rottenScoreTier: macroTier,

    categoryBreakdown: breakdown.map((b) => ({
      categoryId: b.category_id,
      categoryName: b.category_name,
      evidenceCount: b.evidence_count,
      averageRating: b.avg_score,
      flavor: b.flavor,
    })),
  };
}
