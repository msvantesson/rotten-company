"use client";

import { getCategoryFlavor } from "@/lib/flavor-engine";

type BreakdownItem = {
  category_id: number;
  category_name: string;
  rating_count: number;
  avg_rating_score: number | null;
  evidence_count: number;
  severity_score: number | null;
  final_score: number | null;
};

type EvidenceItem = {
  id: number;
  title: string;
  summary: string | null;
  category: { name: string } | null;
  manager: { name: string; report_count: number | null } | null;
};

const CATEGORY_PRESENTATION: Record<
  number,
  {
    icon: string;
    color: string;
  }
> = {
  1: { icon: "💼", color: "#8B0000" },
  2: { icon: "📰", color: "#B22222" },
  3: { icon: "🎭", color: "#D2691E" },
  4: { icon: "🧪", color: "#DAA520" },
  5: { icon: "🚨", color: "#CD853F" },
  6: { icon: "🌱", color: "#228B22" },
  13: { icon: "💸", color: "#B22222" },
};

function getCategoryPresentation(categoryId: number) {
  return (
    CATEGORY_PRESENTATION[categoryId] ?? {
      icon: "⚠️",
      color: "#555555",
    }
  );
}

export function CategoryBreakdown({
  company,
  breakdown,
  evidence,
}: {
  company: any;
  breakdown: BreakdownItem[];
  evidence: EvidenceItem[];
}) {
  if (!breakdown || breakdown.length === 0) {
    return (
      <div className="text-neutral-500 text-sm">
        No category data available yet.
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Company header */}
      <div>
        <h1 className="text-3xl font-bold">{company.name}</h1>
        <p className="text-neutral-600 text-sm">
          Category breakdown and supporting evidence
        </p>
      </div>

      {/* Category breakdown */}
      <div className="space-y-6">
        {breakdown.map((item) => {
          const { icon, color } = getCategoryPresentation(item.category_id);
          const categoryFlavor = getCategoryFlavor(item.category_id);

          return (
            <div key={item.category_id} className="space-y-2">
              {/* Category name + icon */}
              <div className="flex items-center gap-2 font-medium text-lg">
                <span>{icon}</span>
                <span>{item.category_name}</span>
              </div>

              {/* Category flavor (string-only, canonical) */}
              <p className="text-xs italic text-neutral-600">
                {categoryFlavor}
              </p>

              {/* Mini score bar */}
              <div className="w-full h-2 bg-neutral-200 rounded-full overflow-hidden">
                <div
                  className="h-full transition-all duration-500"
                  style={{
                    width: `${typeof item.final_score === "number" && Number.isFinite(item.final_score) ? Math.min(100, Math.max(0, item.final_score)) : 0}%`,
                    backgroundColor: color,
                  }}
                />
              </div>

              {/* Stats row */}
              <div className="flex flex-wrap gap-3 justify-between text-sm text-neutral-600">
                <span>
                  Avg Rating:{" "}
                  {typeof item.avg_rating_score === "number" && Number.isFinite(item.avg_rating_score)
                    ? item.avg_rating_score.toFixed(2)
                    : "—"}
                </span>

                <span>Ratings: {item.rating_count}</span>

                <span>
                  Severity Score:{" "}
                  {typeof item.severity_score === "number" && Number.isFinite(item.severity_score)
                    ? item.severity_score.toFixed(2)
                    : "—"}
                </span>

                <span>Evidence Count: {item.evidence_count}</span>

                <span className="font-medium text-neutral-700">
                  Contribution:{" "}
                  {typeof item.final_score === "number" && Number.isFinite(item.final_score)
                    ? `${item.final_score.toFixed(1)} pts`
                    : "—"}
                </span>
              </div>

              {/* Evidence list for this category */}
              <div className="pl-6 space-y-3">
                {evidence
                  .filter((ev) => ev.category?.name === item.category_name)
                  .map((ev) => (
                    <div
                      key={ev.id}
                      className="border border-border rounded-md p-3 bg-surface shadow-sm"
                    >
                      <div className="font-medium">{ev.title}</div>

                      {ev.summary && (
                        <div className="text-sm text-neutral-600">
                          {ev.summary}
                        </div>
                      )}

                      {ev.manager && (
                        <div className="text-xs text-neutral-500 mt-1">
                          Manager: {ev.manager.name} (
                          {ev.manager.report_count} reports)
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
