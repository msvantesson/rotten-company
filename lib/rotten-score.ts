// lib/rotten-score.ts

/**
 * ═══════════════════════════════════════════════════════════════════════
 *                      🎯 ROTTEN SCORE ENGINE 🎯
 * ═══════════════════════════════════════════════════════════════════════
 * 
 * This is the CORE SCORING ALGORITHM that calculates how "rotten" a company is.
 * 
 * VISUAL FLOW:
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  INPUT: Evidence from users (ratings per category)             │
 * └────────────────────────┬────────────────────────────────────────┘
 *                          ▼
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  STEP 1: Aggregate by Category (18 categories)                 │
 * │  • toxic_workplace, wage_abuse, greenwashing, etc.             │
 * │  • Average all evidence per category → 0-100                   │
 * └────────────────────────┬────────────────────────────────────────┘
 *                          ▼
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  STEP 2: Apply Category Weights                                │
 * │  • Labor issues (32% weight) - most important                  │
 * │  • Environmental (20%) + Consumer (20%)                        │
 * │  • Governance (14%), Social (6%), Brand (8%)                   │
 * │  → Weighted average = Base Score                               │
 * └────────────────────────┬────────────────────────────────────────┘
 *                          ▼
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  STEP 3: Apply Company Size Multiplier                         │
 * │  • micro (1-10):      ×0.8  (smaller impact)                   │
 * │  • small (11-50):     ×0.9                                     │
 * │  • medium (51-250):   ×1.0  (baseline)                         │
 * │  • large (251-1000):  ×1.1                                     │
 * │  • enterprise (1000+):×1.2  (greater responsibility)           │
 * └────────────────────────┬────────────────────────────────────────┘
 *                          ▼
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  STEP 4: Apply Ownership Type Multiplier                       │
 * │  • independent:       ×1.0  (baseline)                         │
 * │  • family_owned:      ×0.95 (slightly less scrutiny)           │
 * │  • public_company:    ×1.05 (shareholder pressure)             │
 * │  • private_equity:    ×1.2  (profit optimization)              │
 * │  • hedge_fund:        ×1.25 (maximum profit pressure)          │
 * └────────────────────────┬────────────────────────────────────────┘
 *                          ▼
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  STEP 5: Apply Geographic/Region Multiplier                    │
 * │  • non_western: ×1.0  (baseline)                               │
 * │  • western:     ×1.1  (higher standards expected)              │
 * │  • global:      ×1.2  (multinational impact)                   │
 * └────────────────────────┬────────────────────────────────────────┘
 *                          ▼
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  OUTPUT: Final Rotten Score (0-100)                            │
 * │  • 0-5:    Halo Shining                                        │
 * │  • 5-25:   Mostly Clean                                        │
 * │  • 25-50:  Yellow Flags                                        │
 * │  • 50-75:  Red Flags Everywhere                                │
 * │  • 75-90:  Working for the Empire (Star Wars)                  │
 * │  • 90-100: Working for Satan                                   │
 * └─────────────────────────────────────────────────────────────────┘
 *
 * KEY CONCEPTS:
 * • Direction: 0 = clean, 100 = extremely rotten
 * • All multipliers make scores HIGHER (more rotten) for same harm
 * • Category weights reflect ethical priorities (labor matters most)
 * • Larger companies & certain ownership types face stricter standards
 * 
 * ═══════════════════════════════════════════════════════════════════════
 */

import { FLAVOR_TEXT_BY_SCORE } from "./micro-flavors";


// ═══════════════════════════════════════════════════════════════════════
//                      📊 CATEGORY TAXONOMY (18 Categories)
// ═══════════════════════════════════════════════════════════════════════
//
//  Visual breakdown of harm categories:
//
//  👥 LABOR & WORKPLACE (4 categories) - 32% total weight
//     Most heavily weighted - worker harm is core focus
//     ├─ toxic_workplace
//     ├─ wage_abuse
//     ├─ union_busting
//     └─ discrimination_harassment
//
//  🌍 ENVIRONMENTAL (3 categories) - 20% total weight
//     ├─ greenwashing
//     ├─ pollution_environmental_damage
//     └─ climate_obstruction
//
//  🛒 CONSUMER (4 categories) - 20% total weight
//     ├─ customer_trust
//     ├─ unfair_pricing
//     ├─ product_safety_failures
//     └─ privacy_data_abuse
//
//  ⚖️ GOVERNANCE & ETHICS (3 categories) - 14% total weight
//     ├─ ethics_failures
//     ├─ corruption_bribery
//     └─ fraud_financial_misconduct
//
//  🏘️ SOCIAL (2 categories) - 6% total weight
//     ├─ community_harm
//     └─ public_health_risk
//
//  🏷️ BRAND INTEGRITY (2 categories) - 8% total weight
//     ├─ broken_promises
//     └─ misleading_marketing
//
// ═══════════════════════════════════════════════════════════════════════

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
 * ═══════════════════════════════════════════════════════════════════════
 *                    ⚖️ CATEGORY WEIGHTS (Sum = 1.0)
 * ═══════════════════════════════════════════════════════════════════════
 * 
 * These weights determine how much each category contributes to the 
 * final Rotten Score. They reflect our ethical priorities.
 *
 * Visual Distribution:
 * 
 * 👥 Labor & Workplace ████████████████ 32%
 *    toxic_workplace        ██████  11% (highest single category)
 *    wage_abuse             ████    8%
 *    discrimination         ███     7%
 *    union_busting          ███     6%
 *
 * 🌍 Environmental     ██████████ 20%
 *    pollution              █████   10%
 *    greenwashing           ██      5%
 *    climate_obstruction    ██      5%
 *
 * 🛒 Consumer          ██████████ 20%
 *    customer_trust         ███     6%
 *    unfair_pricing         ███     6%
 *    safety_failures        ██      4%
 *    privacy_abuse          ██      4%
 *
 * ⚖️ Governance        ███████ 14%
 *    ethics_failures        ██      5%
 *    fraud                  ██      5%
 *    corruption             ██      4%
 *
 * 🏷️ Brand            ████ 8%
 *    broken_promises        ██      4%
 *    misleading_marketing   ██      4%
 *
 * 🏘️ Social           ███ 6%
 *    community_harm         █       3%
 *    public_health_risk     █       3%
 *
 * WHY THESE WEIGHTS?
 * • Labor issues affect the most people directly (employees)
 * • Environmental + Consumer = 40% (broad societal impact)
 * • Governance issues are serious but often indirect
 * • Brand/marketing issues are least severe (annoying vs harmful)
 *
 * ═══════════════════════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════════════════════
//                    📏 COMPANY SIZE MULTIPLIERS
// ═══════════════════════════════════════════════════════════════════════
//
// Larger companies face stricter standards (higher multipliers)
// 
// Visual Scale:
//   micro (1-10)        [████    ] ×0.8  Small impact, learning curve
//   small (11-50)       [█████   ] ×0.9  Growing pains acceptable
//   medium (51-250)     [██████  ] ×1.0  BASELINE - no adjustment
//   large (251-1000)    [███████ ] ×1.1  Should know better
//   enterprise (1000+)  [████████] ×1.2  Maximum responsibility
//
// RATIONALE:
// • Small companies: Less resources, more forgiveness
// • Large companies: More resources = higher expectations
// • Same harm = worse score for bigger company
//
// ═══════════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════════
//                    🏢 OWNERSHIP TYPE MULTIPLIERS
// ═══════════════════════════════════════════════════════════════════════
//
// Different ownership structures create different incentives
//
// Visual Scale (showing profit pressure):
//   independent       [█████   ] ×1.00  BASELINE - owner-operated
//   family_owned      [████    ] ×0.95  Long-term thinking (slight credit)
//   public_company    [██████  ] ×1.05  Shareholder pressure
//   private_equity    [████████] ×1.20  Aggressive optimization
//   hedge_fund        [█████████] ×1.25 Maximum extraction mode
//
// RATIONALE:
// • PE/Hedge funds: Short-term profit maximization → higher risk of harm
// • Public companies: Quarterly earnings pressure
// • Independent/Family: More aligned with long-term sustainability
//
// ═══════════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════════
//                    🌍 GEOGRAPHIC REGION MULTIPLIERS
// ═══════════════════════════════════════════════════════════════════════
//
// Companies in developed regions face higher expectations
//
// Visual Scale (regulatory maturity):
//   non_western    [█████  ] ×1.0  BASELINE - developing standards
//   western        [██████ ] ×1.1  Established labor/env protections
//   global         [███████] ×1.2  Multinational reach = more impact
//
// REGIONS:
// • "global"      → Multinationals with systemic, cross-border impact
// • "western"     → US, EU, UK, CA, AU, NZ (mature regulations)
// • "non_western" → Other regions (different regulatory context)
//
// RATIONALE:
// • Western nations: More resources + stronger regulations = higher bar
// • Global companies: Can't hide behind borders, massive scale
// • This accounts for regional labor/environmental standards
//
// ═══════════════════════════════════════════════════════════════════════

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
