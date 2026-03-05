/**
 * Legacy `evidence.category` column has a CHECK constraint:
 *   category IN (1, 2, 3, 4, 5, 6, 13)
 *
 * The canonical FK is `category_id` → `categories.id`, but the NOT NULL /
 * CHECK constraint on the legacy column must still be satisfied until a DB
 * migration removes it.
 *
 * This module provides a pure helper so the mapping logic can be tested
 * independently of the API route.
 */

export const ALLOWED_LEGACY_CATEGORIES = [1, 2, 3, 4, 5, 6, 13] as const;
export type LegacyCategory = (typeof ALLOWED_LEGACY_CATEGORIES)[number];

/** Fallback used when the canonical category id is not in the allowed set. */
export const LEGACY_CATEGORY_FALLBACK: LegacyCategory = 13;

/**
 * Maps a `categories.id` value to an allowed legacy category integer.
 *
 * - If `id` is already in the allowed set it is returned unchanged.
 * - Otherwise the fallback value (13) is returned so the DB constraint is met.
 */
export function toLegacyCategory(id: number): LegacyCategory {
  if ((ALLOWED_LEGACY_CATEGORIES as readonly number[]).includes(id)) {
    return id as LegacyCategory;
  }
  return LEGACY_CATEGORY_FALLBACK;
}

// ---------------------------------------------------------------------------
// Inline self-checks (executed once at module load in development / build).
// These act as lightweight regression guards without requiring a test runner.
// ---------------------------------------------------------------------------
/* c8 ignore start */
if (process.env.NODE_ENV !== "production") {
  const assert = (condition: boolean, msg: string) => {
    if (!condition) throw new Error(`[legacy-category] assertion failed: ${msg}`);
  };

  assert(toLegacyCategory(1) === 1, "allowed value 1 should pass through");
  assert(toLegacyCategory(6) === 6, "allowed value 6 should pass through");
  assert(toLegacyCategory(13) === 13, "allowed value 13 should pass through");
  assert(toLegacyCategory(7) === 13, "out-of-range value should fall back to 13");
  assert(toLegacyCategory(100) === 13, "large out-of-range value should fall back to 13");
  assert(toLegacyCategory(0) === 13, "zero should fall back to 13");
}
/* c8 ignore stop */
