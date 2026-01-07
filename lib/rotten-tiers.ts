// lib/rotten-tiers.ts

export type RottenTier = {
  name: string;
  color: string;
  microFlavor: string;
  minScore: number;
};

export const ROTTEN_TIERS: RottenTier[] = [
  {
    name: "Working for Satan",
    color: "#8B0000",
    microFlavor: "Hellish abuse, systemic cruelty, no accountability.",
    minScore: 90,
  },
  {
    name: "Working for the Empire from Star Wars",
    color: "#B22222",
    microFlavor: "Authoritarian, exploitative, and proud of it.",
    minScore: 75,
  },
  {
    name: "Rotten to the Core",
    color: "#DC143C",
    microFlavor: "Deeply broken culture with repeated harm.",
    minScore: 60,
  },
  {
    name: "Troubling Patterns",
    color: "#FF8C00",
    microFlavor: "Multiple issues, some systemic, some ignored.",
    minScore: 45,
  },
  {
    name: "Mixed Signals",
    color: "#FFD700",
    microFlavor: "Some problems, some progress, unclear direction.",
    minScore: 30,
  },
  {
    name: "Mostly Clean",
    color: "#32CD32",
    microFlavor: "Minor issues, generally responsible behavior.",
    minScore: 15,
  },
  {
    name: "Squeaky Clean",
    color: "#00CED1",
    microFlavor: "No reported problems, strong accountability.",
    minScore: 0,
  },
];

export function getTier(score: number): RottenTier {
  return (
    ROTTEN_TIERS.find((tier) => score >= tier.minScore) ??
    ROTTEN_TIERS[ROTTEN_TIERS.length - 1]
  );
}
