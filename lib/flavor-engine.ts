// /lib/flavor-engine.ts

/**
 * ═══════════════════════════════════════════════════════════════════════
 *                      🎨 FLAVOR ENGINE - CANONICAL
 * ═══════════════════════════════════════════════════════════════════════
 * 
 * This file converts NUMERIC SCORES into HUMAN-READABLE text and colors.
 * 
 * NOTHING ELSE should implement flavor/tier/color logic!
 * 
 * VISUAL FLOW:
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  INPUT: Rotten Score (0-100)                                   │
 * └────────────────────────┬────────────────────────────────────────┘
 *                          │
 *          ┌───────────────┼───────────────┬────────────────┐
 *          ▼               ▼               ▼                ▼
 *    
 *    Macro Tier      Micro Flavor     Color Map     Category Flavor
 *    (8 buckets)     (101 unique)     (7 colors)    (per category)
 *    
 *    0-10:           Score 0:         0-15:         Category 1:
 *    "Mostly         "Dream job"      #2E8B57       "Rotten to
 *    Decent"                          (green)        the core"
 *    
 *    10-25:          Score 10:        15-30:        Category 2:
 *    "Mildly         "Few red         #A9A9A9       "Smells like
 *    Rotten"         flags"           (gray)         spin"
 *    
 *    ...             ...              ...            ...
 *    
 *    95-100:         Score 100:       90-100:       Category 13:
 *    "Working        "Abandon         #8B0000       "Customer trust?
 *    for Satan"      all hope"        (dark red)     Never heard"
 *    
 *          │               │               │                │
 *          └───────────────┴───────────────┴────────────────┘
 *                          ▼
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  OUTPUT: RottenFlavor Object                                   │
 * │  {                                                              │
 * │    score: 73.5,                                                 │
 * │    roundedScore: 74,                                            │
 * │    macroTier: "Corporate Disaster Zone",                        │
 * │    microFlavor: "A toxic mess with a smile",                    │
 * │    color: "#B22222"                                             │
 * │  }                                                              │
 * └─────────────────────────────────────────────────────────────────┘
 * 
 * TIER LADDER (Macro Tiers):
 * ┌──────┬────────────────────────────────────┐
 * │ 0-10 │ ✨ Mostly Decent                   │
 * │10-25 │ 🟡 Mildly Rotten                   │
 * │25-40 │ 🟠 Rotten Enough to Notice         │
 * │40-55 │ 🔴 Serious Rot Detected            │
 * │55-70 │ 💀 Rotten but Redeemable           │
 * │70-85 │ 🏴 Corporate Disaster Zone         │
 * │85-95 │ ⭐ Working for the Empire          │
 * │95-100│ 😈 Working for Satan               │
 * └──────┴────────────────────────────────────┘
 * 
 * ═══════════════════════════════════════════════════════════════════════
 */

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
// ═══════════════════════════════════════════════════════════════════════
//                    🌈 COLOR MAPPING FOR ROTTEN SCORE
// ═══════════════════════════════════════════════════════════════════════
//
// Returns a hex color for visual score meter display.
// 7-color gradient from green (clean) to dark red (rotten)
//
// Visual Gradient:
// 
//  0 ─────────────────────────────────────────────────────────────► 100
//  │                                                                  │
//  🟢 Green          Gray     Tan    Gold   Orange    Red      Dark Red 🔴
//  #2E8B57       #A9A9A9  #CD853F #DAA520 #D2691E  #B22222   #8B0000
//  0─15          15─30    30─45   45─60   60─75    75─90     90─100
//  
//  Clean        Minor    Notice  Warning  Serious   Very Bad  Rotten
//  
// Color Palette:
//   0-15:  #2E8B57 🟢 SeaGreen     - Mostly clean, safe
//  15-30:  #A9A9A9 ⚪ DarkGray     - Some issues
//  30-45:  #CD853F 🟤 Peru/Tan     - Noticeable problems
//  45-60:  #DAA520 🟡 Goldenrod    - Warning zone
//  60-75:  #D2691E 🟠 Chocolate    - Serious issues
//  75-90:  #B22222 🔴 Firebrick    - Very bad
//  90-100: #8B0000 ⚫ DarkRed      - Extremely rotten
//
// This palette is carefully chosen to be:
// • Colorblind-friendly (uses lightness/darkness)
// • Intuitive (green = good, red = bad)
// • Distinct (clear boundaries between tiers)
//
// ═══════════════════════════════════════════════════════════════════════

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
