import { describe, expect, it } from "vitest";
import { latestValidIsoDate } from "../lib/latest-valid-iso-date";

describe("latestValidIsoDate", () => {
  it("returns company.updated_at when it is the only valid timestamp", () => {
    expect(latestValidIsoDate("2024-01-01T00:00:00.000Z")).toBe("2024-01-01T00:00:00.000Z");
  });

  it("returns newer evidence timestamp when it is more recent than company.updated_at", () => {
    const result = latestValidIsoDate("2024-01-01T00:00:00.000Z", "2025-06-15T12:00:00.000Z");
    expect(result).toBe("2025-06-15T12:00:00.000Z");
  });

  it("returns newer company timestamp when it is more recent than evidence timestamp", () => {
    const result = latestValidIsoDate("2026-01-01T00:00:00.000Z", "2025-06-15T12:00:00.000Z");
    expect(result).toBe("2026-01-01T00:00:00.000Z");
  });

  it("ignores null timestamps", () => {
    expect(latestValidIsoDate(null, "2024-03-01T00:00:00.000Z", null)).toBe("2024-03-01T00:00:00.000Z");
  });

  it("ignores undefined timestamps", () => {
    expect(latestValidIsoDate(undefined, "2024-03-01T00:00:00.000Z", undefined)).toBe("2024-03-01T00:00:00.000Z");
  });

  it("ignores malformed timestamp strings", () => {
    expect(latestValidIsoDate("not-a-date", "2024-03-01T00:00:00.000Z")).toBe("2024-03-01T00:00:00.000Z");
  });

  it("returns undefined when all candidates are null/undefined/malformed", () => {
    expect(latestValidIsoDate(null, undefined, "garbage")).toBeUndefined();
  });

  it("returns undefined when called with no arguments", () => {
    expect(latestValidIsoDate()).toBeUndefined();
  });

  it("accepts Date objects", () => {
    const d = new Date("2024-05-01T00:00:00.000Z");
    expect(latestValidIsoDate(d)).toBe("2024-05-01T00:00:00.000Z");
  });

  it("never uses current request time (result is deterministic from inputs)", () => {
    const before = Date.now();
    const result = latestValidIsoDate("2024-01-01T00:00:00.000Z");
    const after = Date.now();
    const resultMs = new Date(result!).getTime();
    // Result must not be current time — it must match the input exactly.
    expect(resultMs).toBeLessThan(before);
    expect(resultMs).toBeLessThan(after);
    expect(result).toBe("2024-01-01T00:00:00.000Z");
  });
});
