// /lib/jsonld-leader.ts

export function buildLeaderJsonLd({
  leader,
  score,
  evidence,
}: {
  leader: {
    id: number;
    name: string;
    slug: string;
    role?: string | null;
    company_id?: number | null;
    company_name?: string | null;
  };
  score: {
    final_score: number;
    raw_score: number;
    direct_evidence_score: number;
    inequality_score: number;
    company_rotten_score: number;
  };
  evidence: {
    id: number;
    title: string;
    summary: string;
    category: string;
    severity: string;
  }[];
}) {
  const baseUrl = "https://rotten-company.com";

  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": `${baseUrl}/leader/${leader.slug}#identity`,
    name: leader.name,
    jobTitle: leader.role ?? undefined,
    url: `${baseUrl}/leader/${leader.slug}`,

    worksFor: leader.company_id
      ? {
          "@type": "Organization",
          "@id": `${baseUrl}/company/${leader.company_id}#identity`,
          name: leader.company_name ?? "",
          url: `${baseUrl}/company/${leader.company_id}`,
        }
      : undefined,

    identifier: [
      {
        "@type": "PropertyValue",
        name: "leaderId",
        value: leader.id,
      },
    ],

    additionalProperty: [
      {
        "@type": "PropertyValue",
        name: "finalScore",
        value: score.final_score,
      },
      {
        "@type": "PropertyValue",
        name: "rawScore",
        value: score.raw_score,
      },
      {
        "@type": "PropertyValue",
        name: "directEvidenceScore",
        value: score.direct_evidence_score,
      },
      {
        "@type": "PropertyValue",
        name: "inequalityScore",
        value: score.inequality_score,
      },
      {
        "@type": "PropertyValue",
        name: "companyInfluenceScore",
        value: score.company_rotten_score,
      },
    ],

    hasPart: evidence.map((ev) => ({
      "@type": "CreativeWork",
      "@id": `${baseUrl}/evidence/${ev.id}#identity`,
      name: ev.title,
      description: ev.summary,
      url: `${baseUrl}/evidence/${ev.id}`,
      about: ev.category,
      additionalProperty: [
        {
          "@type": "PropertyValue",
          name: "severity",
          value: ev.severity,
        },
      ],
    })),
  };
}
