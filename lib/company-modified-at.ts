export type TimestampLike = string | Date | null | undefined;

function toValidDate(value: TimestampLike): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function latestValidIsoDate(...timestamps: TimestampLike[]): string | null {
  let latest: Date | null = null;

  for (const timestamp of timestamps) {
    const parsed = toValidDate(timestamp);
    if (!parsed) continue;

    if (!latest || parsed.getTime() > latest.getTime()) {
      latest = parsed;
    }
  }

  return latest ? latest.toISOString() : null;
}

export function calculateCompanyModifiedAt(params: {
  companyUpdatedAt: TimestampLike;
  approvedEvidenceUpdatedAt?: TimestampLike;
  scoreUpdatedAt?: TimestampLike;
}): string | null {
  return latestValidIsoDate(
    params.companyUpdatedAt,
    params.approvedEvidenceUpdatedAt,
    params.scoreUpdatedAt,
  );
}
