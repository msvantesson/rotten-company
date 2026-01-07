// /lib/jsonld-owner.ts

type OwnerJsonLdInput = {
  owner: {
    id: number;
    name: string;
    slug: string;
    type: string;
    profile?: string | null;
  };
  portfolio: {
    company: { name: string; slug: string };
  }[];
  breakdown: {
    total_employees?: number | null;
    avg_category_score?: number | null;
    total_ratings?: number | null;
    company_count?: number | null;
    total_evidence?: number | null;
  } | null;
  signals: {
    signal_type: string;
    severity: number;
  }[];
  avgDestructionLever: number | null;
};

export function buildOwnerJsonLd({
  owner,
  portfolio,
  breakdown,
  signals,
  avgDestructionLever,
}: OwnerJsonLdInput) {
  const baseUrl = "https://rotten-company.com";

  const schemaType =
    owner.type === "individual" ? "Person" : "Organization";

  return {
    "@context": "https://schema.org",
    "@type": schemaType,
    "@id": `${baseUrl}/owner/${owner.slug}#identity`,

    name: owner.name,
    url: `${baseUrl}/owner/${owner.slug}`,
    description:
      owner.profile ??
      `Portfolio accountability profile for ${owner.name}.`,

    identifier: [
      {
        "@type": "PropertyValue",
        name: "ownerId",
        value: owner.id,
      },
      {
        "@type": "PropertyValue",
        name: "ownerType",
        value: owner.type,
      },
    ],

    owns: portfolio.map((p) => ({
      "@type": "Organization",
      "@id": `${baseUrl}/company/${p.company.slug}#identity`,
      name: p.company.name,
      url: `${baseUrl}/company/${p.company.slug}`,
    })),

    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: breakdown?.avg_category_score ?? undefined,
      ratingCount: breakdown?.total_ratings ?? undefined,
    },

    numberOfEmployees: breakdown?.total_employees ?? undefined,

    additionalProperty: [
      {
        "@type": "PropertyValue",
        name: "portfolioCompanyCount",
        value: breakdown?.company_count ?? portfolio.length,
      },
      {
        "@type": "PropertyValue",
        name: "totalEvidence",
        value: breakdown?.total_evidence ?? undefined,
      },
      {
        "@type": "PropertyValue",
        name: "avgDestructionLever",
        value: avgDestructionLever ?? undefined,
      },
    ],

    hasPart: signals.map((s) => ({
      "@type": "PropertyValue",
      name: s.signal_type,
      value: s.severity,
    })),
  };
}
