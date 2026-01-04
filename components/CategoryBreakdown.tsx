"use client";

type BreakdownItem = {
  category_id: number;
  category_name: string;
  avg_score: number | null;
  rating_count: number;
  evidence_weight: number | null;
  weighted_score: number | null;
};

export function CategoryBreakdown({
  breakdown,
}: {
  breakdown: BreakdownItem[];
}) {
  if (!breakdown || breakdown.length === 0) {
    return (
      <div className="text-neutral-500 text-sm">
        No category data available yet.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {breakdown.map((item) => (
        <div key={item.category_id} className="space-y-2">
          {/* Category name */}
          <div className="font-medium text-lg">
            {item.category_name}
          </div>

          {/* Mini score bar */}
          <div className="w-full h-2 bg-neutral-200 rounded-full overflow-hidden">
            <div
              className="h-full transition-all duration-500"
              style={{
                width: `${item.weighted_score ?? 0}%`,
                backgroundColor: "#B22222", // consistent with main meter
              }}
            />
          </div>

          {/* Stats row */}
          <div className="flex justify-between text-sm text-neutral-600">
            <span>
              Score:{" "}
              {item.weighted_score !== null
                ? item.weighted_score.toFixed(2)
                : "—"}
            </span>

            <span>
              Ratings: {item.rating_count}
            </span>

            <span>
              Evidence weight:{" "}
              {item.evidence_weight !== null
                ? item.evidence_weight.toFixed(2)
                : "—"}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
