// app/lib/flavor-bundle.ts

import { ROTTEN_TIERS, getTier } from "./rotten-tiers";
import { FLAVOR_TEXT_BY_SCORE } from "./micro-flavors";


export interface FlavorBundle {
  score: number;
  tierName: string;
  tierColor: string;
  tierMicroFlavor: string;
  scoreMicroFlavor: string;
}

/**
 * Returns the full flavor bundle for a given Rotten Score.
 *
 * This is the single source of truth for:
 * - tier name
 * - tier color
 * - tier micro-flavor (tier-based)
 * - score micro-flavor (0–100 exact)
 */
export function getFlavorBundle(score: number): FlavorBundle {
  const clamped = Math.max(0, Math.min(score, 100));
  const tier = getTier(clamped);

  // Pick a random micro-flavor from the tier
  const tierMicroFlavor =
    tier.micro[Math.floor(Math.random() * tier.micro.length)];

  // Exact score micro-flavor
  const scoreMicroFlavor = FLAVOR_TEXT_BY_SCORE[clamped];

  return {
    score: clamped,
    tierName: tier.name,
    tierColor: tier.color,
    tierMicroFlavor,
    scoreMicroFlavor,
  };
}
