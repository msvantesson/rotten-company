export const dynamic = "force-dynamic";
export const dynamicParams = true;
export const fetchCache = "force-no-store";

import { getLeaderData } from "@/lib/getLeaderData";
import LeaderScorePanel from "./LeaderScorePanel";

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

  return (
    <div className="max-w-4xl mx-auto p-6">
      <LeaderScorePanel
        name={leader.name}
        role={leader.role ?? ""}
        companyName={leader.company_id.toString()}
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
        evidenceTimeline={evidence ?? []}
        payRatio={inequality?.pay_ratio ?? undefined}
      />
    </div>
  );
}
