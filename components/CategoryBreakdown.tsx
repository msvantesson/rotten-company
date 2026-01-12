"use client";

import { getCategoryFlavor } from "@/lib/flavor-engine";

type BreakdownItem = {
  category_id: number;
  category_name: string;
  rating_count: number;
  avg_rating_score: number | null;
  evidence_count: number;
  evidence_score: number | null;
  final_score: number;
};

type EvidenceItem = {
  id: number;
  title: string;
  summary: string | null;
  category: { name: string } | null;
  manager: { name: string; report_count: number | null } | null;
};

const CATEGORY_ICONS: Record<number, string> = {
  1: "💼",
  2: "📰",
  3: "🎭",
  4: "🧪",
  5: "🚨",
  6: "🌱",
  13: "💸",
};

function getCategoryIcon(categoryId: number) {
  return CATEGORY_ICONS[categoryId] ?? "⚠️";
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
          const icon = getCategoryIcon(item.category_id);
          const flavor = getCategoryFlavor(item.category_id);

          return (
            <div key={item.category_id} className="space-y-2">
              {/* Category name + icon */}
              <div className="flex items-center gap-2 font-medium text-lg">
                <span>{icon}</span>
                <span>{item.category_name}</span>
              </div>

              {/* Flavor label */}
              <div
                className="text-xs font-semibold"
                style={{ color: flavor.color }}
              >
                {flavor.macroLabel}
              </div>

              <p className="text-xs italic text-neutral-600">
                {flavor.microFlavor}
              </p>

              {/* Mini score bar */}
              <div className="w-full h-2 bg-neutral-200 rounded-full overflow-hidden">
                <div
                  className="h-full transition-all duration-500"
                  style={{
                    width: `${item.final_score}%`,
                    backgroundColor: flavor.color,
                  }}
                />
              </div>

              {/* Stats row */}
              <div className="flex flex-wrap gap-3 justify-between text-sm text-neutral-600">
                <span>
                  Avg Rating:{" "}
                  {item.avg_rating_score !== null
                    ? item.avg_rating_score.toFixed(2)
                    : "—"}
                </span>

                <span>Ratings: {item.rating_count}</span>

                <span>
                  Evidence Score:{" "}
                  {item.evidence_score !== null
                    ? item.evidence_score.toFixed(2)
                    : "—"}
                </span>

                <span>Evidence Count: {item.evidence_count}</span>

                <span className="font-medium text-neutral-700">
                  Contribution: {item.final_score.toFixed(1)} pts
                </span>
              </div>

              {/* Evidence list for this category */}
              <div className="pl-6 space-y-3">
                {evidence
                  .filter((ev) => ev.category?.name === item.category_name)
                  .map((ev) => (
                    <div
                      key={ev.id}
                      className="border rounded-md p-3 bg-white shadow-sm"
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
