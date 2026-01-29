import { computeRottenScore } from "./rotten-score";
import type { CategoryId } from "./rotten-score";

type EvidenceRow = {
  category: CategoryId;
  severity: number; // already normalized 0–100
};

export function computeLeaderScoreFromEvidence({
  evidence,
  companyContext,
}: {
  evidence: EvidenceRow[];
  companyContext: {
    sizeTier?: any;
    sizeEmployees?: number | null;
    ownershipType: any;
    countryRegion?: any;
    franchiseLevel?: any;
  };
}) {
  if (!evidence.length) {
    return computeRottenScore({
      categories: [],
      ownershipType: companyContext.ownershipType,
      sizeTier: companyContext.sizeTier,
      sizeEmployees: companyContext.sizeEmployees,
      countryRegion: companyContext.countryRegion,
      franchiseLevel: companyContext.franchiseLevel,
    });
  }

  const byCategory = new Map<CategoryId, number[]>();

  for (const ev of evidence) {
    if (!byCategory.has(ev.category)) {
      byCategory.set(ev.category, []);
    }
    byCategory.get(ev.category)!.push(ev.severity);
  }

  const categories = Array.from(byCategory.entries()).map(
    ([categoryId, severities]) => ({
      categoryId,
      avgScore:
        severities.reduce((a, b) => a + b, 0) / severities.length,
    })
  );

  return computeRottenScore({
    categories,
    ownershipType: companyContext.ownershipType,
    sizeTier: companyContext.sizeTier,
    sizeEmployees: companyContext.sizeEmployees,
    countryRegion: companyContext.countryRegion,
    franchiseLevel: companyContext.franchiseLevel,
  });
}
