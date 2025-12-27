// /lib/flavors.ts

// -----------------------------
// CATEGORY-SPECIFIC FLAVORS
// -----------------------------
// These describe *what kind* of misconduct is happening.
// They appear in the category breakdown table.

export const CATEGORY_FLAVORS: Record<number, string> = {
  1: "Rotten to the core",
  2: "Smells like spin",
  3: "Boardroom smoke and mirrors",
  4: "Toxic workplace vibes",
  5: "Ethics on life support",
  6: "Greenwashing deluxe",
  13: "Customer trust? Never heard of it",
};

export function getFlavor(categoryId: number): string {
  return CATEGORY_FLAVORS[categoryId] ?? "No flavor assigned";
}

// -----------------------------
// GLOBAL ROTTEN SCORE TIERS
// -----------------------------
// These describe *how bad the company is overall*.
// They appear in the Rotten Score meter.

export function getScoreFlavor(score: number): string {
  if (score < 20) {
    return "Corporate culture straight out of the Empire from Star Wars — endless bureaucracy, fear‑based management, and the constant sense that someone, somewhere, is building a superweapon.";
  }

  if (score < 40) {
    return "So rotten it feels like clocking in for Satan himself — where the break room is a pit of despair and HR is just a ceremonial dagger.";
  }

  if (score < 60) {
    return "The moral compass here is spinning like a broken fidget spinner.";
  }

  if (score < 80) {
    return "Glossy PR on the outside, questionable behavior on the inside.";
  }

  return "Cleaner than a whistle and twice as shiny.";
}
