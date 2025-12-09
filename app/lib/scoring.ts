// app/lib/scoring.ts
export function badgeForScore(score: number) {
  if (score >= 80) return "Rotten";
  if (score >= 50) return "Spoiled";
  return "Fresh";
}
