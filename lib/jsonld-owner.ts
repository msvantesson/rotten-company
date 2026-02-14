// /lib/jsonld-owner.ts

import { JSONLD_CONTEXT, createIdentityUrl, createEntityUrl, createPropertyValue } from "@/lib/utils/jsonld";

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
  const schemaType =
    owner.type === "individual" ? "Person" : "Organization";

  return {
    "@context": JSONLD_CONTEXT,
    "@type": schemaType,
    "@id": createIdentityUrl("owner", owner.slug),

    name: owner.name,
    url: createEntityUrl("owner", owner.slug),
    description:
      owner.profile ??
      `Portfolio accountability profile for ${owner.name}.`,

    identifier: [
      createPropertyValue("ownerId", owner.id),
      createPropertyValue("ownerType", owner.type),
    ],

    owns: portfolio.map((p) => ({
      "@type": "Organization",
      "@id": createIdentityUrl("company", p.company.slug),
      name: p.company.name,
      url: createEntityUrl("company", p.company.slug),
    })),

    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: breakdown?.avg_category_score ?? undefined,
      ratingCount: breakdown?.total_ratings ?? undefined,
    },

    numberOfEmployees: breakdown?.total_employees ?? undefined,

    additionalProperty: [
      createPropertyValue("portfolioCompanyCount", breakdown?.company_count ?? portfolio.length),
      createPropertyValue("totalEvidence", breakdown?.total_evidence ?? undefined),
      createPropertyValue("avgDestructionLever", avgDestructionLever ?? undefined),
    ],

    hasPart: signals.map((s) => createPropertyValue(s.signal_type, s.severity)),
  };
}
