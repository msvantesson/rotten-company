import { FLAVOR_TEXT_BY_SCORE } from "@/lib/micro-flavors";

export function getFlavor(score: number) {
  const rounded = Math.round(score);

  // Macro tier (subtle classification)
  let macroTier: string;
  if (score >= 90) macroTier = "Working for Satan";
  else if (score >= 75) macroTier = "Working for the Empire from Star Wars";
  else if (score >= 60) macroTier = "Rotten but Redeemable";
  else if (score >= 45) macroTier = "Suspicious but Salvageable";
  else if (score >= 30) macroTier = "Needs Watching";
  else if (score >= 15) macroTier = "Mildly Sketchy";
  else macroTier = "Mostly Clean";

  // Micro flavor (primary voice)
  const microFlavor =
    FLAVOR_TEXT_BY_SCORE[rounded] ??
    "No flavor text available.";

  return {
    score,
    microFlavor,
    macroTier,
  };
}
