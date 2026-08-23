/**
 * Utilities for building the country dropdown options on the Rotten Index page.
 *
 * Country options are derived from the **complete** company dataset, independent
 * of the current page subset or applied filters, so every country that has at
 * least one company in the index always appears in the dropdown.
 */

export function normalizeCountryOption(value: string | null | undefined): string | null {
  return value?.trim() || null;
}

/**
 * Build a sorted, deduplicated list of country strings suitable for use as
 * <option> values in the Rotten Index country filter dropdown.
 *
 * Rules:
 * - Trims whitespace from each value.
 * - Excludes null / empty / whitespace-only entries.
 * - Deduplicates (case-sensitive, matching the stored values).
 * - Sorts alphabetically (locale-aware ascending).
 * - Does NOT prepend "All countries" – that is the caller's responsibility.
 */
export function buildCountryOptions(rows: Array<{ country: string | null | undefined }>): string[] {
  return Array.from(
    new Set(
      rows
        .map((r) => normalizeCountryOption(r.country))
        .filter((country): country is string => Boolean(country)),
    ),
  ).sort((a, b) => a.localeCompare(b));
}
