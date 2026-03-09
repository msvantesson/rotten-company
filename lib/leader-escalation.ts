/**
 * Computes the escalation score for a leader based on their tenures.
 *
 * The escalation score measures whether a leader moved to progressively worse
 * companies over time. For each consecutive tenure pair (ordered by started_at
 * ascending), we compute the increase in rotten score from the previous company
 * to the next. Only increases are counted (decreases are clamped to 0).
 *
 * Returns 0 if fewer than 2 scored tenures are available.
 *
 * Examples:
 *   computeEscalationScore([])           => 0   (no tenures)
 *   computeEscalationScore([50])         => 0   (single tenure)
 *   computeEscalationScore([null, null]) => 0   (no scored tenures)
 *   computeEscalationScore([30, 50])     => 20  (moved to worse company)
 *   computeEscalationScore([50, 30])     => 0   (moved to better company, no increase)
 *   computeEscalationScore([10, 50, 30, 70]) => 40 + 0 + 40 = 80 (only increases counted)
 *   computeEscalationScore([10, null, 70])   => 60 (null entries skipped)
 */
export function computeEscalationScore(
  /** Rotten scores ordered by tenure started_at ascending. Null entries are skipped. */
  orderedScores: (number | null)[],
): number {
  const scored = orderedScores.filter((s): s is number => s != null && isFinite(s));
  if (scored.length < 2) return 0;

  let total = 0;
  for (let i = 1; i < scored.length; i++) {
    total += Math.max(0, scored[i] - scored[i - 1]);
  }
  return total;
}

// Minimal runtime validation (runs only in development/test environments)
if (process.env.NODE_ENV !== "production") {
  const cases: Array<[(number | null)[], number]> = [
    [[], 0],
    [[50], 0],
    [[null, null], 0],
    [[30, 50], 20],
    [[50, 30], 0],
    [[10, 50, 30, 70], 80],
    [[10, null, 70], 60],
  ];
  for (const [input, expected] of cases) {
    const result = computeEscalationScore(input);
    if (result !== expected) {
      console.error(
        `[leader-escalation] ASSERTION FAILED: computeEscalationScore(${JSON.stringify(input)}) expected ${expected}, got ${result}`,
      );
    }
  }
}
