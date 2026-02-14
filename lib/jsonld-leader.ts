// /lib/jsonld-leader.ts

import { JSONLD_CONTEXT, createIdentityUrl, createEntityUrl, createPropertyValue } from "@/lib/utils/jsonld";

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
  return {
    "@context": JSONLD_CONTEXT,
    "@type": "Person",
    "@id": createIdentityUrl("leader", leader.slug),
    name: leader.name,
    jobTitle: leader.role ?? undefined,
    url: createEntityUrl("leader", leader.slug),

    worksFor: leader.company_id
      ? {
          "@type": "Organization",
          "@id": createIdentityUrl("company", leader.company_id),
          name: leader.company_name ?? "",
          url: createEntityUrl("company", leader.company_id.toString()),
        }
      : undefined,

    identifier: [
      createPropertyValue("leaderId", leader.id),
    ],

    additionalProperty: [
      createPropertyValue("finalScore", score.final_score),
      createPropertyValue("rawScore", score.raw_score),
      createPropertyValue("directEvidenceScore", score.direct_evidence_score),
      createPropertyValue("inequalityScore", score.inequality_score),
      createPropertyValue("companyInfluenceScore", score.company_rotten_score),
    ],

    hasPart: evidence.map((ev) => ({
      "@type": "CreativeWork",
      "@id": createIdentityUrl("evidence", ev.id),
      name: ev.title,
      description: ev.summary,
      url: createEntityUrl("evidence", ev.id.toString()),
      about: ev.category,
      additionalProperty: [
        createPropertyValue("severity", ev.severity),
      ],
    })),
  };
}
