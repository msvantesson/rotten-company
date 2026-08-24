// Shared SEO helpers for company overview and breakdown pages.
// All title/description logic lives here to avoid duplication between routes.

import { getMacroTier } from "@/lib/flavor-engine";

/** Rounds a Rotten Score to the nearest integer for display in titles/descriptions. */
export function roundScore(score: number | null): number {
  if (score === null) return 0;
  return Math.round(Math.max(0, Math.min(100, score)));
}

/**
 * Builds the overview page title.
 *
 * Preferred: `{Company} Rotten Score: {Score}/100 | Evidence & Misconduct`
 * Compact fallback (when preferred > 70 chars):
 *   `{Company} | Rotten Score {Score}/100`
 * If compact still > 70, shortens/drops the suffix before touching the name.
 * Never returns a title shorter than 15 characters.
 */
export function buildOverviewTitle(
  companyName: string,
  score: number | null,
): string {
  const s = roundScore(score);
  const detailed = `${companyName} Rotten Score: ${s}/100 | Evidence & Misconduct`;

  if (detailed.length <= 70) return detailed;

  const compact = `${companyName} | Rotten Score ${s}/100`;
  if (compact.length <= 70) return compact;

  // Name is very long — keep name + minimal suffix
  const minimal = `${companyName} | Rotten Score`;
  if (minimal.length <= 70) return minimal;

  // As last resort truncate name to fit the minimal label (but keep >= 15 chars total)
  const suffix = " | Rotten Score";
  const maxNameLen = Math.max(70 - suffix.length, 15 - suffix.length);
  const truncated = companyName.slice(0, Math.max(maxNameLen, 1)) + suffix;
  return truncated.length >= 15 ? truncated : companyName.slice(0, 15);
}

/**
 * Builds the breakdown page title.
 *
 * Preferred: `{Company} Rotten Score Breakdown | Categories & Calculation`
 * Compact fallback: `{Company} | Rotten Score Breakdown`
 */
export function buildBreakdownTitle(companyName: string): string {
  const detailed = `${companyName} Rotten Score Breakdown | Categories & Calculation`;

  if (detailed.length <= 70) return detailed;

  const compact = `${companyName} | Rotten Score Breakdown`;
  if (compact.length <= 70) return compact;

  const minimal = `${companyName} | Rotten Breakdown`;
  if (minimal.length <= 70) return minimal;

  const suffix = " | Rotten Breakdown";
  const maxNameLen = Math.max(70 - suffix.length, 15 - suffix.length);
  const truncated = companyName.slice(0, Math.max(maxNameLen, 1)) + suffix;
  return truncated.length >= 15 ? truncated : companyName.slice(0, 15);
}

/**
 * Builds the overview page meta description.
 *
 * Format:
 *   `{Company} has a Rotten Score of {Score}/100 based on {Count} documented
 *   evidence record(s). Review {Company}'s misconduct cases, category breakdown,
 *   sources and current status.`
 */
export function buildOverviewDescription(
  companyName: string,
  score: number | null,
  evidenceCount: number,
): string {
  const s = roundScore(score);
  const recordWord = evidenceCount === 1 ? "record" : "records";
  return (
    `${companyName} has a Rotten Score of ${s}/100 based on ${evidenceCount} documented evidence ${recordWord}. ` +
    `Review ${companyName}'s misconduct cases, category breakdown, sources and current status.`
  );
}

/**
 * Builds the breakdown page meta description.
 *
 * Format:
 *   `Explore how {Company}'s Rotten Score of {Score}/100 is calculated across
 *   misconduct categories, evidence severity, remediation and documented sources.`
 */
export function buildBreakdownDescription(
  companyName: string,
  score: number | null,
): string {
  const s = roundScore(score);
  return (
    `Explore how ${companyName}'s Rotten Score of ${s}/100 is calculated across ` +
    `misconduct categories, evidence severity, remediation and documented sources.`
  );
}

/**
 * Builds the server-rendered SEO answer paragraph shown near the top of the
 * overview page. Must reflect current DB values.
 *
 * Format:
 *   `{Company} currently has a Rotten Score of {Score}/100 and is classified as
 *   {Status}. The score is based on {Count} approved evidence record(s).`
 */
export function buildSsrAnswer(
  companyName: string,
  score: number | null,
  evidenceCount: number,
): string {
  const s = roundScore(score);
  const status = getMacroTier(score ?? 0);
  const recordWord = evidenceCount === 1 ? "record" : "records";
  return (
    `${companyName} currently has a Rotten Score of ${s}/100 and is classified as ${status}. ` +
    `The score is based on ${evidenceCount} approved evidence ${recordWord}.`
  );
}
