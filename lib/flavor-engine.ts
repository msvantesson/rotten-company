// /lib/flavor-engine.ts

//
// Canonical flavor engine for Rotten Company
//
// This file centralizes ALL flavor logic:
// - Micro flavor (per exact score, 0–100)
// - Macro tier (8 buckets, 0–100)
// - Category flavor (per category_id)
// - Color mapping
// - Combined RottenFlavor helper
//
// Nothing else in the codebase should implement its own
// score → flavor / tier / color logic.
//

import { FLAVOR_TEXT_BY_SCORE } from "@/lib/micro-flavors";

//
// Types
//

export type RottenFlavor = {
  score: number;
  roundedScore: number;
  macroTier: string;
  microFlavor: string;
  color: string;
};

//
// Micro flavor (primary narrative voice)
//

/**
 * Returns the micro-flavor text for a given Rotten Score.
 * - Clamps to [0, 100]
 * - Rounds to nearest integer
 * - Falls back to a generic line if somehow missing
 */
export function getMicroFlavor(score: number): string {
  const clamped = Math.max(0, Math.min(100, score));
  const rounded = Math.round(clamped);

  return (
    FLAVOR_TEXT_BY_SCORE[rounded] ??
    "No flavor text available for this score yet."
  );
}

//
// Macro tier (overall severity buckets)
//

/**
 * Canonical macro tier ladder (0–100):
 *
 * 0–10   Mostly Decent
 * 10–25  Mildly Rotten
 * 25–40  Rotten Enough to Notice
 * 40–55  Serious Rot Detected
 * 55–70  Rotten but Redeemable
 * 70–85  Corporate Disaster Zone
 * 85–95  Working for the Empire from Star Wars
 * 95–100 Working for Satan
 */
export function getMacroTier(score: number): string {
  const clamped = Math.max(0, Math.min(100, score));

  if (clamped >= 95) {
    return "Working for Satan";
  }
  if (clamped >= 85) {
    return "Working for the Empire from Star Wars";
  }
  if (clamped >= 70) {
    return "Corporate Disaster Zone";
  }
  if (clamped >= 55) {
    return "Rotten but Redeemable";
  }
  if (clamped >= 40) {
    return "Serious Rot Detected";
  }
  if (clamped >= 25) {
    return "Rotten Enough to Notice";
  }
  if (clamped >= 10) {
    return "Mildly Rotten";
  }

  // 0–10
  return "Mostly Decent";
}

//
// Category-specific flavors
// (what kind of misconduct is happening)
//

/**
 * CATEGORY_FLAVORS describe *what kind* of misconduct is happening,
 * not how severe the overall company is.
 *
 * They are used in the category breakdown table.
 */
export const CATEGORY_FLAVORS: Record<number, string> = {
  1: "Rotten to the core",
  2: "Smells like spin",
  3: "Boardroom smoke and mirrors",
  4: "Toxic workplace vibes",
  5: "Ethics on life support",
  6: "Greenwashing deluxe",
  13: "Customer trust? Never heard of it",
};

/**
 * Returns a short category-flavor line for a given category_id.
 */
export function getCategoryFlavor(categoryId: number): string {
  return CATEGORY_FLAVORS[categoryId] ?? "No flavor assigned";
}

//
// Color mapping for the Rotten Score meter
//

/**
 * Returns a hex color for a given Rotten Score.
 *
 * This is aligned with the existing RottenScoreMeter palette:
 * - 0–15   clean green
 * - 15–30  dark gray
 * - 30–45  tan/brown
 * - 45–60  golden warning
 * - 60–75  burnt orange
 * - 75–90  imperial red
 * - 90–100 deep hell red
 */
export function getScoreColor(score: number): string {
  const clamped = Math.max(0, Math.min(100, score));

  if (clamped >= 90) return "#8B0000"; // deep hell red
  if (clamped >= 75) return "#B22222"; // imperial red
  if (clamped >= 60) return "#D2691E"; // burnt orange
  if (clamped >= 45) return "#DAA520"; // golden warning
  if (clamped >= 30) return "#CD853F"; // tan/brown
  if (clamped >= 15) return "#A9A9A9"; // dark gray

  // 0–15
  return "#2E8B57"; // clean green
}

//
// Combined flavor helper (canonical API for the UI)
//

/**
 * Canonical helper for UI components.
 *
 * Given a Rotten Score, returns:
 * - the original score
 * - the rounded score used for micro flavor
 * - the macro tier
 * - the micro flavor text
 * - the color for the meter
 */
export type MacroTierStyle = {
  /** Tailwind classes for the badge pill background + text color */
  badgeClass: string;
};

/**
 * Returns Tailwind classes for the macro tier badge.
 * Derives color from the same score thresholds as getMacroTier().
 */
export function getMacroTierStyle(score: number): MacroTierStyle {
  const clamped = Math.max(0, Math.min(100, score));

  if (clamped >= 95) {
    // Working for Satan → almost black / very dark red
    return { badgeClass: "bg-[#3b0a0a] text-red-200" };
  }
  if (clamped >= 85) {
    // Working for the Empire from Star Wars → dark red
    return { badgeClass: "bg-red-900 text-red-100" };
  }
  if (clamped >= 70) {
    // Corporate Disaster Zone → muted red
    return { badgeClass: "bg-red-700 text-red-50" };
  }
  if (clamped >= 55) {
    // Rotten but Redeemable → deep orange (muted)
    return { badgeClass: "bg-orange-700 text-orange-50" };
  }
  if (clamped >= 40) {
    // Serious Rot Detected → muted orange
    return { badgeClass: "bg-orange-600 text-white" };
  }
  if (clamped >= 25) {
    // Rotten Enough to Notice → muted amber
    return { badgeClass: "bg-amber-500 text-amber-950" };
  }
  if (clamped >= 10) {
    // Mildly Rotten → muted green
    return { badgeClass: "bg-green-700 text-green-50" };
  }
  // Mostly Decent → slate / gray
  return { badgeClass: "bg-slate-500 text-slate-50" };
}

export function getRottenFlavor(score: number): RottenFlavor {
  const clamped = Math.max(0, Math.min(100, score));
  const roundedScore = Math.round(clamped);

  const microFlavor = getMicroFlavor(clamped);
  const macroTier = getMacroTier(clamped);
  const color = getScoreColor(clamped);

  return {
    score: clamped,
    roundedScore,
    microFlavor,
    macroTier,
    color,
  };
}
