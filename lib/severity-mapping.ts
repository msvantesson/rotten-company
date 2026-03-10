export type SeverityLabel = "low" | "medium" | "high";

const SEVERITY_MAP: Record<SeverityLabel, number> = {
  low: 1,
  medium: 3,
  high: 5,
};

/**
 * Maps a human-readable severity label to a numeric value for `severity_suggested`.
 * low → 1, medium → 3, high → 5
 * Returns null if the input is not a valid label.
 */
export function severityLabelToNumber(label: string | null | undefined): number | null {
  if (!label) return null;
  const mapped = SEVERITY_MAP[label as SeverityLabel];
  return mapped ?? null;
}
