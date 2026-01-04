"use client";

import { getFlavor } from "@/lib/get-flavor";

export function RottenScoreMeter({ score }: { score: number }) {
  const { microFlavor, macroTier } = getFlavor(score);

  const getColor = () => {
    if (score >= 90) return "#8B0000";      // deep hell red
    if (score >= 75) return "#B22222";      // imperial red
    if (score >= 60) return "#D2691E";      // burnt orange
    if (score >= 45) return "#DAA520";      // golden warning
    if (score >= 30) return "#CD853F";      // tan/brown
    if (score >= 15) return "#A9A9A9";      // dark gray
    return "#2E8B57";                       // clean green
  };

  return (
    <div className="space-y-3">
      {/* Micro flavor (primary voice) */}
      <div className="text-xl font-semibold leading-snug">
        {microFlavor}
      </div>

      {/* Score bar */}
      <div className="w-full h-3 bg-neutral-200 rounded-full overflow-hidden">
        <div
          className="h-full transition-all duration-500"
          style={{
            width: `${score}%`,
            backgroundColor: getColor(),
          }}
        />
      </div>

      {/* Score + tier */}
      <div className="flex justify-between text-sm text-neutral-600">
        <span>{score.toFixed(2)}</span>
        <span>{macroTier}</span>
      </div>
    </div>
  );
}
