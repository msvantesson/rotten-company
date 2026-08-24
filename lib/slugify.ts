/**
 * Characters that Unicode NFD decomposition does not reliably convert to ASCII.
 * Applied before NFD normalization so diacritics on the replacements are also stripped.
 */
const SPECIAL_CHAR_MAP: Array<[RegExp, string]> = [
  [/[Øø]/g, "o"],
  [/[Ææ]/g, "ae"],
  [/[Ðð]/g, "d"],
  [/[Þþ]/g, "th"],
  [/[Łł]/g, "l"],
  [/ß/g, "ss"],
];

/**
 * Converts a company name to a URL-safe slug.
 *
 * 1. Apply manual transliterations for characters that NFD cannot handle.
 * 2. Apply Unicode NFD normalisation and strip combining diacritical marks.
 * 3. Lower-case, trim, collapse non-alphanumeric runs to hyphens, strip leading/trailing hyphens.
 *
 * Examples:
 *   "Nestlé"            → "nestle"
 *   "Société Générale"  → "societe-generale"
 *   "Müller"            → "muller"
 *   "Ørsted"            → "orsted"
 */
export function slugify(input: string): string {
  let s = input;

  for (const [pattern, replacement] of SPECIAL_CHAR_MAP) {
    s = s.replace(pattern, replacement);
  }

  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/['"]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
