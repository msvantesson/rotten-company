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
    final_score?: number | null; // optional if you want to include it
    flavor: string;
  }[];
}) {
  const { microFlavor, macroTier } = getFlavor(rottenScore ?? 0);

  const ratingCount = breakdown.reduce(
    (sum, b) => sum + (b.avg_score !== null ? 1 : 0),
    0
  );

  const evidenceCount = breakdown.reduce(
    (sum, b) => sum + b.evidence_count,
    0
  );

  const confidenceLevel = getConfidenceLevel(ratingCount, evidenceCount);

  return {
    "@context": "https://schema.org",
    "@type": "Organization",

    name: company.name,
    url: `https://rotten-company.com/company/${company.slug}`,
    industry: company.industry ?? undefined,
    numberOfEmployees: company.size_employees ?? undefined,

    aggregateRating: {
      "@type": "AggregateRating",

      ratingValue: rottenScore ? rottenScore.toFixed(1) : undefined,
      bestRating: "100",
      worstRating: "0",

      ratingCount: ratingCount + evidenceCount,
      reviewCount: ratingCount,
      evidenceCount: evidenceCount,

      confidenceLevel,
      flavorTier: macroTier,
      microFlavor,
    },

    categoryBreakdown: breakdown.map((b) => ({
      categoryId: b.category_id,
      categoryName: b.category_name,
      evidenceCount: b.evidence_count,
      averageRating: b.avg_score,
      finalScore: b.final_score ?? undefined,
      flavor: b.flavor,
    })),
  };
}

function getConfidenceLevel(
  ratingCount: number,
  evidenceCount: number
): "low" | "medium" | "high" {
  const total = ratingCount + evidenceCount;
  if (total >= 50) return "high";
  if (total >= 10) return "medium";
  return "low";
}
