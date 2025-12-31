// lib/rotten-score.ts

/**
 * Rotten Score engine (Option A: full taxonomy)
 *
 * - 18 harm categories with explicit weights
 * - Company size normalization (tiered, DB-aligned)
 * - Ownership-type multipliers
 * - Country/region multipliers (including "global")
 * - Franchise level metadata
 * - Flavor tier mapping (0–100) + micro-flavors per score
 *
 * Direction: 0 = clean, 100 = extremely rotten.
 */

import { FLAVOR_TEXT_BY_SCORE } from "./micro-flavors";


// ---------- Category taxonomy ----------

export type CategoryId =
  // Labor & Workplace Harm
  | "toxic_workplace"
  | "wage_abuse"
  | "union_busting"
  | "discrimination_harassment"
  // Environmental Harm
  | "greenwashing"
  | "pollution_environmental_damage"
  | "climate_obstruction"
  // Consumer Harm
  | "customer_trust"
  | "unfair_pricing"
  | "product_safety_failures"
  | "privacy_data_abuse"
  // Governance & Ethics
  | "ethics_failures"
  | "corruption_bribery"
  | "fraud_financial_misconduct"
  // Social Harm
  | "community_harm"
  | "public_health_risk"
  // Brand Integrity
  | "broken_promises"
  | "misleading_marketing";

export interface CategoryScoreInput {
  categoryId: CategoryId;
  /**
   * Average rating for this category, already normalized 0–100.
   * 0 = no/low harm, 100 = extreme harm.
   */
  avgScore: number;
}

/**
 * Category weights across the full taxonomy.
 *
 * These weights are ethical design choices and should be
 * documented publicly as part of Rotten Company's methodology.
 *
 * They sum to 1.0.
 */
export const CATEGORY_WEIGHTS: Record<CategoryId, number> = {
  // Labor & Workplace Harm (total: 0.32)
  toxic_workplace: 0.11,
  wage_abuse: 0.08,
  union_busting: 0.06,
  discrimination_harassment: 0.07,

  // Environmental Harm (total: 0.20)
  greenwashing: 0.05,
  pollution_environmental_damage: 0.10,
  climate_obstruction: 0.05,

  // Consumer Harm (total: 0.20)
  customer_trust: 0.06,
  unfair_pricing: 0.06,
  product_safety_failures: 0.04,
  privacy_data_abuse: 0.04,

  // Governance & Ethics (total: 0.14)
  ethics_failures: 0.05,
  corruption_bribery: 0.04,
  fraud_financial_misconduct: 0.05,

  // Social Harm (total: 0.06)
  community_harm: 0.03,
  public_health_risk: 0.03,

  // Brand Integrity (total: 0.08)
  broken_promises: 0.04,
  misleading_marketing: 0.04,
};

// ---------- Company size normalization (tiered) ----------

export type CompanySizeTier =
  | "micro" // 1–10
  | "small" // 11–50
  | "medium" // 51–250
  | "large" // 251–1000
  | "enterprise"; // 1000+

export const SIZE_MULTIPLIERS: Record<CompanySizeTier, number> = {
  micro: 0.8,
  small: 0.9,
  medium: 1.0,
  large: 1.1,
  enterprise: 1.2,
};

/**
 * Derive size tier from employee count.
 * Used as a fallback if no explicit sizeTier is provided.
 */
export function deriveSizeTier(
  sizeEmployees: number | null | undefined
): CompanySizeTier {
  if (sizeEmployees == null || sizeEmployees <= 0) return "medium";
  if (sizeEmployees <= 10) return "micro";
  if (sizeEmployees <= 50) return "small";
  if (sizeEmployees <= 250) return "medium";
  if (sizeEmployees <= 1000) return "large";
  return "enterprise";
}

// ---------- Ownership multipliers ----------

export type OwnershipType =
  | "independent"
  | "family_owned"
  | "public_company"
  | "private_equity_owned"
  | "hedge_fund_owned";

export const OWNERSHIP_MULTIPLIERS: Record<OwnershipType, number> = {
  independent: 1.0,
  family_owned: 0.95,
  public_company: 1.05,
  private_equity_owned: 1.2,
  hedge_fund_owned: 1.25,
};

// ---------- Country / region multipliers ----------

/**
 * Country / region context.
 *
 * "global"      → multinational with systemic, cross-border impact.
 * "western"     → US, EU, UK, CA, AU, NZ, etc.
 * "non_western" → baseline for other contexts.
 */
export type CountryRegion = "global" | "western" | "non_western";

export const COUNTRY_REGION_MULTIPLIERS: Record<CountryRegion, number> = {
  global: 1.2,
  western: 1.1,
  non_western: 1.0,
};

// ---------- Franchise levels ----------

export type FranchiseLevel = "local" | "regional" | "global_brand";

// ---------- Flavor tiers ----------

export type RottenFlavorTier =
  | "no_data"
  | "halo_shining"
  | "mostly_clean"
  | "yellow_flags"
  | "red_flags_everywhere"
  | "working_for_the_empire"
  | "working_for_satan";

export interface RottenFlavor {
  tier: RottenFlavorTier;
  label: string;
  description: string;
  /**
   * Micro-flavor for the exact score (0–100) or no-data state.
   * This is where all the personality lives.
   */
  microFlavor: string;
}

/**
 * Map numeric score to a flavor tier (semantic bucket).
 * Score: 0 (clean) → 100 (extremely rotten)
 */
export function mapScoreToFlavorTier(score: number): RottenFlavorTier {
  const s = clamp(score, 0, 100);

  if (s <= 5) return "halo_shining";
  if (s <= 25) return "mostly_clean";
  if (s <= 50) return "yellow_flags";
  if (s <= 75) return "red_flags_everywhere";
  if (s <= 90) return "working_for_the_empire";
  return "working_for_satan";
}

/**
 * Build the full RottenFlavor object from score or no-data.
 */
export function buildFlavor(score: number | null): RottenFlavor {
  if (score == null) {
    return {
      tier: "no_data",
      label: "No Rotten Score Yet",
      description: "This company has no reported misconduct or evidence.",
      microFlavor: "No red flags on record. Maybe they’re actually decent.",
    };
  }

  const tier = mapScoreToFlavorTier(score);
  const label = (() => {
    switch (tier) {
      case "halo_shining":
        return "Halo Shining";
      case "mostly_clean":
        return "Mostly Clean";
      case "yellow_flags":
        return "Yellow Flags";
      case "red_flags_everywhere":
        return "Red Flags Everywhere";
      case "working_for_the_empire":
        return "Working for the Empire (Star Wars)";
      case "working_for_satan":
        return "Working for Satan";
      case "no_data":
      default:
        return "No Rotten Score Yet";
    }
  })();

  const description = (() => {
    switch (tier) {
      case "halo_shining":
        return "No meaningful negative evidence found. Either genuinely clean or not yet scrutinized.";
      case "mostly_clean":
        return "Some issues, but nothing suggesting systemic harm. Keep an eye on this one.";
      case "yellow_flags":
        return "Recurring or multi-category issues. Not a lost cause, but caution is warranted.";
      case "red_flags_everywhere":
        return "Serious and/or systemic misconduct across multiple harm areas. Proceed at your own risk.";
      case "working_for_the_empire":
        return "This place operates like a villainous empire. You’re not just a cog; you’re crewing the Death Star.";
      case "working_for_satan":
        return "Comically, cartoonishly bad. If hell had a careers page, this company would be featured.";
      case "no_data":
      default:
        return "This company has no reported misconduct or evidence.";
    }
  })();

  const rounded = clamp(Math.round(score), 0, 100);
  const microFlavor =
    FLAVOR_TEXT_BY_SCORE[rounded] ??
    "No red flags on record. Maybe they’re actually decent.";

  return {
    tier,
    label,
    description,
    microFlavor,
  };
}

// ---------- Input / output types ----------

export interface RottenScoreInput {
  categories: CategoryScoreInput[];

  /**
   * Directly from DB: companies.size_tier
   * If missing, we fall back to deriveSizeTier(sizeEmployees).
   */
  sizeTier?: CompanySizeTier;

  /**
   * Fallback only if sizeTier is not provided.
   * Ideally you pass sizeTier from DB and ignore this.
   */
  sizeEmployees?: number | null;

  /**
   * Ownership context, derived from your ownership logic.
   */
  ownershipType: OwnershipType;

  /**
   * Directly from DB: companies.country_region
   * If missing, falls back to "non_western".
   */
  countryRegion?: CountryRegion;

  /**
   * Franchise level, if applicable (local, regional, global_brand).
   * If missing, defaults to "global_brand".
   */
  franchiseLevel?: FranchiseLevel;
}

export interface RottenScoreBreakdown {
  // Final Rotten Score, 0–100, or null if no data
  finalScore: number | null;

  // Intermediate scores (null if no data)
  baseCategoryScore: number | null;
  sizeAdjustedScore: number | null;
  ownershipAdjustedScore: number | null;
  countryAdjustedScore: number | null;

  // Context and multipliers used
  sizeTier: CompanySizeTier;
  ownershipType: OwnershipType;
  countryRegion: CountryRegion;
  franchiseLevel: FranchiseLevel;

  sizeMultiplier: number | null;
  ownershipMultiplier: number | null;
  countryMultiplier: number | null;

  // Flavor tier + micro-flavor
  flavor: RottenFlavor;
}

// ---------- Core calculation ----------

function computeBaseCategoryScore(categories: CategoryScoreInput[]): number {
  if (!categories.length) return 0;

  let total = 0;

  for (const c of categories) {
    const weight = CATEGORY_WEIGHTS[c.categoryId];
    if (typeof weight !== "number") continue;

    const clampedAvg = clamp(c.avgScore, 0, 100);
    total += clampedAvg * weight;
  }

  // Because weights sum to 1.0, total is already in [0, 100].
  return total;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Compute the Rotten Score and full breakdown for a single entity.
 *
 * This function is pure and deterministic: given the same input,
 * it will always return the same result.
 *
 * DB alignment:
 * - sizeTier  ← companies.size_tier (preferred)
 * - countryRegion ← companies.country_region (preferred)
 */
export function computeRottenScore(
  input: RottenScoreInput
): RottenScoreBreakdown {
  const sizeTier: CompanySizeTier =
    input.sizeTier ??
    deriveSizeTier(input.sizeEmployees ?? null);

  const countryRegion: CountryRegion =
    input.countryRegion ?? "non_western";

  // No category scores → no Rotten Score yet (positive "no data" state)
  if (!input.categories || input.categories.length === 0) {
    const flavor = buildFlavor(null);

    return {
      finalScore: null,
      baseCategoryScore: null,
      sizeAdjustedScore: null,
      ownershipAdjustedScore: null,
      countryAdjustedScore: null,

      sizeTier,
      ownershipType: input.ownershipType,
      countryRegion,
      franchiseLevel: input.franchiseLevel ?? "global_brand",

      sizeMultiplier: null,
      ownershipMultiplier: null,
      countryMultiplier: null,

      flavor,
    };
  }

  const baseCategoryScore = computeBaseCategoryScore(input.categories);

  const sizeMultiplier = SIZE_MULTIPLIERS[sizeTier];
  const ownershipMultiplier = OWNERSHIP_MULTIPLIERS[input.ownershipType];
  const countryMultiplier = COUNTRY_REGION_MULTIPLIERS[countryRegion];

  const sizeAdjustedScore = baseCategoryScore * sizeMultiplier;
  const ownershipAdjustedScore = sizeAdjustedScore * ownershipMultiplier;
  const countryAdjustedScore = ownershipAdjustedScore * countryMultiplier;

  const finalScore = clamp(countryAdjustedScore, 0, 100);
  const flavor = buildFlavor(finalScore);

  return {
    finalScore,
    baseCategoryScore,
    sizeAdjustedScore,
    ownershipAdjustedScore,
    countryAdjustedScore,
    sizeTier,
    ownershipType: input.ownershipType,
    countryRegion,
    franchiseLevel: input.franchiseLevel ?? "global_brand",
    sizeMultiplier,
    ownershipMultiplier,
    countryMultiplier,
    flavor,
  };
}
