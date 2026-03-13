/**
 * Hardcoded category descriptions for the "Rate this company" UI and category pages.
 * Keyed by canonical slug (hyphenated). An alias map handles underscore-based DB slugs.
 */

export type CategoryHelp = {
  /** Emoji + category name, e.g. "💼 Broken promises" */
  title: string;
  /** One-sentence definition of the category. */
  definition: string;
  /** Comma-separated examples of behavior that falls under this category. */
  examples: string;
};

const CATEGORY_HELP_MAP: Record<string, CategoryHelp> = {
  "broken-promises": {
    title: "💼 Broken promises",
    definition:
      "Commitments made to employees, customers, or the public that weren't honored.",
    examples:
      "bait\u2011and\u2011switch job terms, promised raises/bonuses that don't happen, \u201cflexible remote\u201d revoked after hiring, benefits quietly removed.",
  },
  exploitation: {
    title: "📰 Exploitation",
    definition:
      "Unfair labor practices or taking advantage of vulnerable workers, users, or communities.",
    examples:
      "unpaid overtime, wage theft, misclassifying contractors, abusive scheduling, coercive \u201calways on\u201d expectations, unsafe working conditions.",
  },
  fraud: {
    title: "🎭 Fraud",
    definition:
      "Intentional deception for gain, including financial wrongdoing, forged records, or scams.",
    examples:
      "falsified numbers, billing scams, fake customers/contracts, accounting manipulation, insider self\u2011dealing, knowingly selling defective services as compliant.",
  },
  "false-claims": {
    title: "🧪 Deceptive claims",
    definition:
      "Misleading or unsubstantiated statements in marketing, PR, or internal messaging.",
    examples:
      "exaggerated performance claims, hiding limitations, cherry\u2011picked data, \u201cAI-powered\u201d when it isn\u2019t, misleading \u201cbest in class\u201d assertions.",
  },
  "environmental-damage": {
    title: "🚨 Environmental damage",
    definition:
      "Measurable harm to ecosystems, pollution, waste, or destructive resource extraction.",
    examples:
      "pollution, toxic spills, illegal dumping, excessive emissions, deforestation, water contamination, habitat destruction.",
  },
  greenwashing: {
    title: "🌱 Greenwashing",
    definition:
      "Making environmental claims that overstate benefits or hide real impacts.",
    examples:
      'vague \u201ceco-friendly\u201d branding, fake/meaningless certifications, tiny green initiatives used as cover, misleading \u201ccarbon neutral\u201d claims.',
  },
  "management-by-fear": {
    title: "💸 Fear-based management",
    definition:
      "Control through intimidation: threats, retaliation, or a culture of fear.",
    examples:
      'threats about layoffs/visas, public shaming, retaliation for reporting issues, forced stack ranking, \u201cdo it or you\u2019re out\u201d culture.',
  },
  "private-equity-fallout": {
    title: "⚠️ Private equity fallout",
    definition:
      "Harm linked to PE ownership: cost-cutting, layoffs, asset stripping, or degraded quality.",
    examples:
      "aggressive cost\u2011cutting that reduces quality/safety, layoffs and chronic understaffing, asset stripping (sale\u2011leaseback), heavy debt/fees loaded onto the company, short\u2011term profit extraction over long\u2011term health.",
  },
};

/**
 * Aliases from DB/legacy slugs to the canonical help-map keys above.
 * Add entries here whenever a DB slug differs from the canonical hyphenated slug.
 */
const SLUG_ALIASES: Record<string, string> = {
  broken_promises: "broken-promises",
  fraud_financial_misconduct: "fraud",
  false_claims: "false-claims",
  pollution_environmental_damage: "environmental-damage",
  environmental_damage: "environmental-damage",
  management_by_fear: "management-by-fear",
  private_equity_fallout: "private-equity-fallout",
  private_equity_owned: "private-equity-fallout",
};

/**
 * Returns the hardcoded help content for a category slug, or null if not found.
 * Resolves both canonical (hyphenated) and aliased (underscored) slugs.
 */
export function getCategoryHelp(slug: string): CategoryHelp | null {
  const canonical = SLUG_ALIASES[slug] ?? slug;
  return CATEGORY_HELP_MAP[canonical] ?? null;
}
