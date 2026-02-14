// /lib/jsonld-company.ts

import { getRottenFlavor, getCategoryFlavor } from "@/lib/flavor-engine";
import { JSONLD_CONTEXT, createEntityUrl, createPropertyValue } from "@/lib/utils/jsonld";

type CategoryBreakdownJsonLd = {
  category_id: number;
  category_name: string;
  rating_count: number;
  avg_rating_score: number | null;
  evidence_count: number;
  evidence_score: number | null;
  final_score: number;
};

type JsonLdInput = {
  company: {
    id: number;
    name: string;
    slug: string;
    industry?: string;
    size_employees?: number;
  };
  rottenScore: number | null;
  breakdown: CategoryBreakdownJsonLd[];
  ownershipSignals?: {
    owner_name: string;
    owner_slug: string;
    owner_profile?: string;
    signal_type: string;
    severity: number;
  }[] | null;
  destructionLever?: {
    destruction_lever_score?: number | null;
    is_pe_destructive?: boolean | null;
  } | null;
};

export function buildCompanyJsonLd({
  company,
  rottenScore,
  breakdown,
  ownershipSignals = [],
  destructionLever = null,
}: JsonLdInput) {
  const score = rottenScore ?? 0;

  // 🔥 Canonical flavor engine
  const { microFlavor, macroTier } = getRottenFlavor(score);

  // Compute totals
  const ratingCount = breakdown.reduce(
    (sum, c) => sum + (c.rating_count ?? 0),
    0
  );

  const evidenceCount = breakdown.reduce(
    (sum, c) => sum + (c.evidence_count ?? 0),
    0
  );

  const totalSignals = ratingCount + evidenceCount;

  const confidenceLevel =
    totalSignals >= 50 ? "High" :
    totalSignals >= 10 ? "Medium" :
    "Low";

  return {
    "@context": JSONLD_CONTEXT,
    "@type": "Organization",

    // Identity
    name: company.name,
    url: createEntityUrl("company", company.slug),
    description: microFlavor,
    industry: company.industry ?? undefined,
    numberOfEmployees: company.size_employees ?? undefined,

    // Canonical Rotten Score (0–100)
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: score.toFixed(2),
      ratingCount,
      reviewCount: evidenceCount,
      bestRating: 100,
      worstRating: 0,
    },

    // Category breakdown (canonical + flavored)
    additionalProperty: breakdown.map((c) => ({
      "@type": "PropertyValue",
      name: c.category_name,
      categoryFlavor: getCategoryFlavor(c.category_id),
      value: {
        ratingCount: c.rating_count,
        avgRatingScore: c.avg_rating_score,
        evidenceCount: c.evidence_count,
        evidenceScore: c.evidence_score,
        finalScore: c.final_score,
      },
    })),

    // Ownership signals
    ownership:
      ownershipSignals?.map((s) => ({
        "@type": "Organization",
        name: s.owner_name,
        url: createEntityUrl("owner", s.owner_slug),
        additionalProperty: [
          createPropertyValue("ownerProfile", s.owner_profile ?? null),
          createPropertyValue("signalType", s.signal_type),
          createPropertyValue("signalSeverity", s.severity),
        ],
      })) ?? [],

    // Destruction lever
    destructionLever: destructionLever
      ? {
          "@type": "PropertyValue",
          name: "Destruction Lever",
          value: {
            destructionLeverScore: destructionLever.destruction_lever_score ?? null,
            isPrivateEquityDestructive: destructionLever.is_pe_destructive ?? false,
          },
        }
      : undefined,

    // Canonical flavor engine metadata
    rottenTier: macroTier,
    microFlavor,
    confidenceLevel,
    totalSignals,
  };
}
