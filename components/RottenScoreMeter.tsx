"use client";

import { useEffect, useState } from "react";
import { getRottenFlavor } from "@/lib/flavor-engine";

type RottenScoreMeterProps = {
  score: number | null;
};

function clampScore(raw: number | null): number {
  if (raw == null || Number.isNaN(raw)) return 0;
  return Math.max(0, Math.min(100, raw));
}

// Simple red -> yellow -> green gradient based on score
function getScoreColor(score: number): string {
  // 0 = red (0deg), 50 = yellow (60deg), 100 = green (120deg)
  const hue = (score / 100) * 120; // 0–120
  return `hsl(${hue}, 80%, 45%)`;
}

export function RottenScoreMeter({ score }: RottenScoreMeterProps) {
  const clamped = clampScore(score);
  const [animatedWidth, setAnimatedWidth] = useState(0);

  // Flavor engine: company-level tier + micro flavor
  const { microFlavor, macroTier } = getRottenFlavor(clamped);

  useEffect(() => {
    // Animate from 0 -> clamped on mount/update (client only)
    setAnimatedWidth(clamped);
  }, [clamped]);

  const barColor = getScoreColor(clamped);

  return (
    <div className="w-full max-w-xl space-y-3">
      {/* Score + tier row */}
      <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-semibold tabular-nums">
            {clamped.toFixed(0)}
          </span>
          <span className="text-sm uppercase tracking-wide text-neutral-600">
            / 100 Rotten Score
          </span>
        </div>

        <div className="text-sm text-right text-neutral-700">
          <div className="font-semibold">{macroTier}</div>
        </div>
      </div>

      {/* Bar */}
      <div className="w-full h-3 rounded-full bg-neutral-200 overflow-hidden shadow-inner">
        <div
          className="h-full rounded-full transition-[width] duration-700 ease-out"
          style={{
            width: `${animatedWidth}%`,
            backgroundColor: barColor,
          }}
        />
      </div>

      {/* Micro flavor */}
      <p className="text-sm text-neutral-700">
        {microFlavor}
      </p>
    </div>
  );
}

export default RottenScoreMeter;
