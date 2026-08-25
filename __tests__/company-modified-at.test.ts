import { describe, expect, it } from "vitest";
import { calculateCompanyModifiedAt, latestValidIsoDate } from "../lib/company-modified-at";

describe("company modification timestamp helpers", () => {
  it("uses company.updated_at when it is the only valid timestamp", () => {
    const modifiedAt = calculateCompanyModifiedAt({
      companyUpdatedAt: "2026-01-01T00:00:00.000Z",
    });

    expect(modifiedAt).toBe("2026-01-01T00:00:00.000Z");
  });

  it("prefers newer approved evidence timestamp", () => {
    const modifiedAt = calculateCompanyModifiedAt({
      companyUpdatedAt: "2026-01-01T00:00:00.000Z",
      approvedEvidenceUpdatedAt: "2026-02-01T00:00:00.000Z",
    });

    expect(modifiedAt).toBe("2026-02-01T00:00:00.000Z");
  });

  it("prefers newer score timestamp when available", () => {
    const modifiedAt = calculateCompanyModifiedAt({
      companyUpdatedAt: "2026-01-01T00:00:00.000Z",
      approvedEvidenceUpdatedAt: "2026-02-01T00:00:00.000Z",
      scoreUpdatedAt: "2026-03-01T00:00:00.000Z",
    });

    expect(modifiedAt).toBe("2026-03-01T00:00:00.000Z");
  });

  it("ignores null and invalid timestamps safely", () => {
    const modifiedAt = latestValidIsoDate(
      null,
      undefined,
      "not-a-date",
      "2026-02-01T00:00:00.000Z",
    );

    expect(modifiedAt).toBe("2026-02-01T00:00:00.000Z");
  });

  it("never falls back to current request time", () => {
    const modifiedAt = latestValidIsoDate(null, undefined, "invalid");
    expect(modifiedAt).toBeNull();
  });
});
