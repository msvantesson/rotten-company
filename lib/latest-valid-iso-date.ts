// /lib/latest-valid-iso-date.ts

/**
 * Returns the latest valid ISO timestamp string from the given candidates.
 * - Accepts string | Date | null | undefined
 * - Ignores null, undefined, and malformed values
 * - Never uses the current request time
 * - Returns undefined when no valid candidate exists
 */
export function latestValidIsoDate(
  ...candidates: Array<string | Date | null | undefined>
): string | undefined {
  let best: number | undefined;

  for (const candidate of candidates) {
    if (candidate == null) continue;
    const ms = new Date(candidate).getTime();
    if (!Number.isFinite(ms)) continue;
    if (best === undefined || ms > best) {
      best = ms;
    }
  }

  return best !== undefined ? new Date(best).toISOString() : undefined;
}
