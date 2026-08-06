import { getMacroTier, getMacroTierStyle } from "@/lib/flavor-engine";

interface MacroTierBadgeProps {
  score: number;
}

/**
 * Renders the macro tier label (e.g. "Serious Rot Detected") as a compact
 * colored badge with a small dot indicator.
 *
 * - Color is derived from getMacroTierStyle() — no duplicate thresholds.
 * - The dot is aria-hidden so screen readers read the label only.
 */
export default function MacroTierBadge({ score }: MacroTierBadgeProps) {
  const label = getMacroTier(score);
  const { badgeClass } = getMacroTierStyle(score);

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${badgeClass}`}
    >
      <span
        aria-hidden="true"
        className="inline-block h-1.5 w-1.5 rounded-full shrink-0 bg-current opacity-50"
      />
      {label}
    </span>
  );
}
