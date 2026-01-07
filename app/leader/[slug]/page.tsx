export const dynamic = "force-dynamic";
export const dynamicParams = true;
export const fetchCache = "force-no-store";

import LeaderScorePanel from "./LeaderScorePanel";
import { getLeaderData } from "@/lib/getLeaderData";
import { buildLeaderJsonLd } from "@/lib/jsonld-leader";
import { JsonLdDebugPanel } from "@/components/JsonLdDebugPanel";

type Params = Promise<{ slug: string }> | { slug: string };

export default async function LeaderPage({ params }: { params: Params }) {
  const resolved = (await params) as { slug?: string };
  const rawSlug = resolved?.slug ? decodeURIComponent(resolved.slug) : "";

  const data = await getLeaderData(rawSlug);

  if (!data) {
    return (
      <div className="p-10">
        <h1 className="text-2xl font-bold">Leader not found</h1>
        <p className="text-gray-600">Slug: {rawSlug}</p>
      </div>
    );
  }

  const { leader, score, categories, inequality, evidence } = data;

  const mappedEvidence = (evidence ?? []).map((ev) => ({
    id: ev.id,
    title: ev.title,
    summary: ev.summary ?? "",
    category: ev.category,
    severity: ev.severity,
    createdAt: ev.created_at,
    companySlug: ev.company_id?.toString() ?? "",
  }));

  const jsonLd = buildLeaderJsonLd({
    leader,
    score: {
      final_score: score?.final_score ?? 0,
      raw_score: score?.raw_score ?? 0,
      direct_evidence_score: score?.direct_evidence_score ?? 0,
      inequality_score: score?.inequality_score ?? 0,
      company_rotten_score: score?.company_rotten_score ?? 0,
    },
    evidence: mappedEvidence,
  });

  return (
    <>
      {/* JSON-LD injection */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd, null, 2),
        }}
      />

      {/* Developer-only JSON-LD Debug Panel */}
      <JsonLdDebugPanel data={jsonLd} />

      <div className="max-w-4xl mx-auto p-6">
        <LeaderScorePanel
          name={leader.name}
          role={leader.role ?? ""}
          companyName={leader.company_name ?? ""}
          slug={leader.slug}
          finalScore={score?.final_score ?? 0}
          rawScore={score?.raw_score ?? 0}
          directEvidenceScore={score?.direct_evidence_score ?? 0}
          inequalityScore={score?.inequality_score ?? 0}
          companyInfluenceScore={
            score?.company_rotten_score
              ? score.company_rotten_score * 0.1
              : 0
          }
          categoryBreakdown={categories ?? []}
          evidenceTimeline={mappedEvidence}
          payRatio={inequality?.pay_ratio ?? undefined}
        />
      </div>
    </>
  );
}
