"use client";

import * as React from "react";
import { clamp } from "@/lib/utils/math";

function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

type ScoreMeterProps = {
  score: number;
  className?: string;
};

export default function ScoreMeter({ score, className }: ScoreMeterProps) {
  const clamped = clamp(score, 0, 100);

  let colorClass = "bg-yellow-500";
  if (clamped >= 70) colorClass = "bg-red-500";
  else if (clamped <= 30) colorClass = "bg-green-500";

  return (
    <div className={cx("flex items-center gap-2", className)}>
      <div className="relative h-2 w-28 rounded-full bg-muted overflow-hidden">
        <div
          className={cx("h-full rounded-full transition-all", colorClass)}
          style={{ width: `${clamped}%` }}
        />
      </div>
      <span className="text-xs font-medium tabular-nums">{clamped}</span>
    </div>
  );
}
