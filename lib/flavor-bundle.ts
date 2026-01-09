// lib/flavor-bundle.ts

import { getTier } from "./rotten-tiers";
import { FLAVOR_TEXT_BY_SCORE } from "./micro-flavors";

export interface FlavorBundle {
  score: number;
  tierName: string;
  tierColor: string;
  tierMicroFlavor: string;
  scoreMicroFlavor: string;
}

export function getFlavorBundle(rawScore: number): FlavorBundle {
  // Clamp score between 0–100
  const clamped = Math.max(0, Math.min(100, rawScore));

  // Determine tier
  const tier = getTier(clamped);

  // Tier micro flavor (single string)
  const tierMicroFlavor = tier.microFlavor;

  // Score-specific micro flavor
  const scoreMicroFlavor = FLAVOR_TEXT_BY_SCORE[clamped];

  return {
    score: clamped,
    tierName: tier.name,
    tierColor: tier.color,
    tierMicroFlavor,
    scoreMicroFlavor,
  };
}
