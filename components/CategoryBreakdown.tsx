"use client";

type BreakdownItem = {
  category_id: number;
  category_name: string;
  evidence_count: number;
  avg_score: number | null;
  flavor: string;
};

const CATEGORY_PRESENTATION: Record<
  number,
  {
    icon: string;
    color: string;
  }
> = {
  1: { icon: "💼", color: "#8B0000" }, // Governance / core rot
  2: { icon: "📰", color: "#B22222" }, // Spin / comms
  3: { icon: "🎭", color: "#D2691E" }, // Boardroom smoke and mirrors
  4: { icon: "🧪", color: "#DAA520" }, // Workplace / culture
  5: { icon: "🚨", color: "#CD853F" }, // Ethics / compliance
  6: { icon: "🌱", color: "#228B22" }, // Greenwashing / environment
  13: { icon: "💸", color: "#B22222" }, // Customer harm
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
      {breakdown.map((item) => {
        const { icon, color } = getCategoryPresentation(item.category_id);

        return (
          <div key={item.category_id} className="space-y-2">
            {/* Category name + icon */}
            <div className="flex items-center gap-2 font-medium text-lg">
              <span>{icon}</span>
              <span>{item.category_name}</span>
            </div>

            {/* Mini score bar */}
            <div className="w-full h-2 bg-neutral-200 rounded-full overflow-hidden">
              <div
                className="h-full transition-all duration-500"
                style={{
                  width: `${item.avg_score ?? 0}%`,
                  backgroundColor: color,
                }}
              />
            </div>

            {/* Stats row */}
            <div className="flex flex-wrap gap-3 justify-between text-sm text-neutral-600">
              <span>
                Avg Rating:{" "}
                {item.avg_score !== null ? item.avg_score.toFixed(2) : "—"}
              </span>

              <span>Evidence: {item.evidence_count}</span>

              <span className="italic">{item.flavor}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
