// lib/jsonld-company.ts

type JsonLdInput = {
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
    final_score?: number | null;
    flavor?: string;
  }[];
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
  return {
    "@context": "https://schema.org",
    "@type": "Organization",

    name: company.name,
    url: `https://rotten-company.com/company/${company.slug}`,
    description: `Rotten Score and accountability profile for ${company.name}.`,

    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: rottenScore,
      bestRating: "5",
      worstRating: "1",
      ratingCount: breakdown.reduce(
        (sum, c) => sum + (c.evidence_count ?? 0),
        0
      ),
    },

    knowsAbout: breakdown.map((c) => ({
      "@type": "DefinedTerm",
      name: c.category_name,
      termCode: c.category_id,
      inDefinedTermSet: "https://rotten-company.com/categories",
      additionalProperty: [
        {
          "@type": "PropertyValue",
          name: "ratingCount",
          value: c.avg_score ?? null,
        },
        {
          "@type": "PropertyValue",
          name: "evidenceCount",
          value: c.evidence_count,
        },
        {
          "@type": "PropertyValue",
          name: "finalScore",
          value: c.final_score ?? null,
        },
      ],
    })),

    ownership:
      ownershipSignals?.map((s) => ({
        "@type": "Organization",
        name: s.owner_name,
        url: `https://rotten-company.com/owner/${s.owner_slug}`,
        additionalProperty: [
          {
            "@type": "PropertyValue",
            name: "ownerProfile",
            value: s.owner_profile ?? null,
          },
          {
            "@type": "PropertyValue",
            name: "signalType",
            value: s.signal_type,
          },
          {
            "@type": "PropertyValue",
            name: "signalSeverity",
            value: s.severity,
          },
        ],
      })) ?? [],

    additionalProperty: [
      {
        "@type": "PropertyValue",
        name: "destructionLeverScore",
        value: destructionLever?.destruction_lever_score ?? null,
      },
      {
        "@type": "PropertyValue",
        name: "isPrivateEquityDestructive",
        value: destructionLever?.is_pe_destructive ?? false,
      },
    ],
  };
}
