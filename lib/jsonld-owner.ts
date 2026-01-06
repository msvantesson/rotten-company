// lib/jsonld-owner.ts

type OwnerJsonLdInput = {
  owner: any;
  portfolio: any[];
  breakdown: any;
  signals: any[];
  avgDestructionLever: number | null;
};

export function buildOwnerJsonLd({
  owner,
  portfolio,
  breakdown,
  signals,
  avgDestructionLever,
}: OwnerJsonLdInput) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",

    name: owner.name,
    url: `https://rotten-company.com/owner/${owner.slug}`,
    description: `Portfolio accountability profile for ${owner.name}.`,

    numberOfEmployees: breakdown?.total_employees ?? null,

    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: breakdown?.avg_category_score ?? null,
      ratingCount: breakdown?.total_ratings ?? null,
    },

    owns: portfolio.map((p) => ({
      "@type": "Organization",
      name: p.company.name,
      url: `https://rotten-company.com/company/${p.company.slug}`,
    })),

    additionalProperty: [
      {
        "@type": "PropertyValue",
        name: "portfolioCompanyCount",
        value: breakdown?.company_count ?? portfolio.length,
      },
      {
        "@type": "PropertyValue",
        name: "totalEvidence",
        value: breakdown?.total_evidence ?? null,
      },
      {
        "@type": "PropertyValue",
        name: "avgDestructionLever",
        value: avgDestructionLever ?? null,
      },
    ],

    ownershipSignals: signals.map((s) => ({
      "@type": "PropertyValue",
      name: s.signal_type,
      value: s.severity,
    })),
  };
}
