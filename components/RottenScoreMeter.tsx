"use client";

import { useEffect, useState } from "react";
import { getRottenFlavor } from "@/lib/flavor-engine";

type RottenScoreMeterProps = {
  score: number | null;
};

export default function RottenScoreMeter({ score }: RottenScoreMeterProps) {
  const safeScore = typeof score === "number" ? score : 0;
  const flavor = getRottenFlavor(safeScore);

  const [animatedWidth, setAnimatedWidth] = useState(0);

  useEffect(() => {
    setAnimatedWidth(flavor.score);
  }, [flavor.score]);

  return (
    <div className="w-full max-w-xl space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-semibold tabular-nums">
            {flavor.roundedScore}
          </span>

          <span className="text-sm uppercase tracking-wide text-neutral-600">
            / 100 Rotten Score
          </span>
        </div>

        <div
          className="text-sm text-right font-semibold"
          style={{ color: flavor.color }}
        >
          {flavor.macroTier}
        </div>
      </div>

      <div className="w-full h-3 rounded-full bg-neutral-200 overflow-hidden shadow-inner">
        <div
          className="h-full rounded-full transition-[width] duration-700 ease-out"
          style={{
            width: `${animatedWidth}%`,
            backgroundColor: flavor.color,
          }}
        />
      </div>

      <p className="text-sm text-neutral-700 italic">
        {flavor.microFlavor}
      </p>
    </div>
  );
}
