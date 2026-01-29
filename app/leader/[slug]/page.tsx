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

  const { leader, score, categories, inequality, evidence, tenures } = data;

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

      <div className="max-w-4xl mx-auto p-6 space-y-8">

        {/* -------------------------------------------------- */}
        {/*                TENURE TIMELINE UI                  */}
        {/* -------------------------------------------------- */}
        {tenures && tenures.length > 0 && (
          <section>
            <h2 className="text-xl font-semibold mb-3">Tenure Timeline</h2>

            <div className="relative w-full border-l border-gray-300 pl-4">
              {(() => {
                const parsedTenures = tenures.map((t) => ({
                  ...t,
                  start: new Date(t.started_at).getTime(),
                  end: t.ended_at ? new Date(t.ended_at).getTime() : Date.now(),
                }));

                const globalStart = Math.min(...parsedTenures.map((t) => t.start));
                const globalEnd = Math.max(...parsedTenures.map((t) => t.end));
                const totalRange = globalEnd - globalStart || 1;

                return (
                  <div className="space-y-6">
                    {parsedTenures.map((t, i) => {
                      const startPct =
                        ((t.start - globalStart) / totalRange) * 100;
                      const endPct =
                        ((t.end - globalStart) / totalRange) * 100;
                      const widthPct = Math.max(endPct - startPct, 1);

                      const startLabel = new Date(t.start).toLocaleDateString(
                        "en-US",
                        {
                          year: "numeric",
                          month: "short",
                        }
                      );

                      const endLabel = t.ended_at
                        ? new Date(t.end).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                          })
                        : "Present";

                      // Evidence inside this tenure
                      const evidenceInTenure = mappedEvidence.filter((ev) => {
                        const ts = new Date(ev.createdAt).getTime();
                        return ts >= t.start && ts <= t.end;
                      });

                      return (
                        <div key={i} className="relative">
                          {/* Company + dates */}
                          <div className="mb-1 text-sm text-gray-700">
                            <span className="font-medium">
                              {t.company_name ?? `Company ${t.company_id}`}
                            </span>{" "}
                            — {startLabel} → {endLabel}
                          </div>

                          {/* Timeline bar */}
                          <div className="relative h-3 w-full bg-gray-200 rounded">
                            <div
                              className="absolute top-0 h-3 bg-blue-500 rounded"
                              style={{
                                left: `${startPct}%`,
                                width: `${widthPct}%`,
                              }}
                            />

                            {/* Evidence markers (clickable) */}
                            {evidenceInTenure.map((ev) => {
                              const evTs = new Date(ev.createdAt).getTime();
                              const evPct =
                                ((evTs - globalStart) / totalRange) * 100;

                              const color =
                                ev.severity === "high"
                                  ? "bg-red-600"
                                  : ev.severity === "medium"
                                  ? "bg-yellow-500"
                                  : "bg-green-600";

                              return (
                                <button
                                  key={ev.id}
                                  onClick={() => {
                                    const el = document.getElementById(
                                      `evidence-${ev.id}`
                                    );
                                    if (el) {
                                      el.scrollIntoView({
                                        behavior: "smooth",
                                        block: "start",
                                      });
                                    }
                                  }}
                                  className={`absolute -top-1 w-3 h-3 rounded-full border border-white shadow ${color} cursor-pointer`}
                                  style={{ left: `${evPct}%` }}
                                  title={`${ev.title} (${ev.category})`}
                                />
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </section>
        )}

        {/* -------------------------------------------------- */}
        {/*                EXISTING SCORE PANEL                */}
        {/* -------------------------------------------------- */}
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
