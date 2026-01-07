"use client";

import { getRottenFlavor } from "@/lib/flavor-engine";

export function RottenScoreMeter({
  score,
  ratingCount = 0,
  evidenceCount = 0,
}: {
  score: number;
  ratingCount?: number;
  evidenceCount?: number;
}) {
 
  const { microFlavor, macroTier, color } = getRottenFlavor(score);
  const totalSignals = ratingCount + evidenceCount;

  const getConfidence = () => {
    if (totalSignals >= 50) return "High confidence";
    if (totalSignals >= 10) return "Medium confidence";
    return "Low confidence";
  };

  const getColor = () => {
    if (score >= 90) return "#8B0000";      // deep hell red
    if (score >= 75) return "#B22222";      // imperial red
    if (score >= 60) return "#D2691E";      // burnt orange
    if (score >= 45) return "#DAA520";      // golden warning
    if (score >= 30) return "#CD853F";      // tan/brown
    if (score >= 15) return "#A9A9A9";      // dark gray
    return "#2E8B57";                       // clean green
  };

  const barColor = getColor();

  return (
    <div className="space-y-4">
      {/* Micro flavor */}
      <div className="text-xl font-semibold leading-snug">
        {microFlavor}
      </div>

      {/* Score bar */}
      <div className="w-full h-3 bg-neutral-200 rounded-full overflow-hidden relative">
        <div
          className="h-full transition-all duration-700 ease-out"
          style={{
            width: `${score}%`,
            backgroundColor: barColor,
            boxShadow: score >= 75 ? `0 0 12px ${barColor}` : "none",
          }}
        />
      </div>

      {/* Score + tier + confidence */}
      <div className="flex justify-between text-sm text-neutral-600">
        <span>{score.toFixed(2)}</span>
        <span className="font-medium">{macroTier}</span>
      </div>

      <div className="flex justify-between text-xs text-neutral-500">
        <span>{totalSignals} signals</span>
        <span>{getConfidence()}</span>
      </div>

      {/* Why this score? */}
      <details className="mt-2 text-sm text-neutral-700 bg-neutral-50 border border-neutral-200 rounded-md p-3">
        <summary className="cursor-pointer font-medium text-neutral-800">
          Why this score?
        </summary>
        <div className="mt-2 space-y-2">
          <p>
            This Rotten Score is a weighted combination of category ratings and underlying evidence.
            Higher scores mean more severe, repeated, and well‑documented problems.
          </p>
          <p>
            The <span className="font-semibold">tier</span> ({macroTier}) reflects the overall level of concern,
            while the <span className="font-semibold">micro flavor</span> captures the human‑readable vibe of what people are reporting.
          </p>
          <p className="text-xs text-neutral-500">
            Scroll down to the category breakdown and evidence list to see exactly where the score comes from.
          </p>
        </div>
      </details>
    </div>
  );
}
