import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/seo", () => ({
  canonicalUrl: (path: string) =>
    `https://rotten-company.com${path === "/" ? "" : path}`,
}));

const EXPECTED_TITLE = "Rotten Company | Evidence-Based Corporate Accountability";
const EXPECTED_URL = "https://rotten-company.com";

describe("Homepage metadata", () => {
  it("title equals the corrected ASCII-separator value", async () => {
    const { homepageMetadata } = await import("../lib/homepage-seo");
    expect(homepageMetadata.title).toBe(EXPECTED_TITLE);
  });

  it("openGraph.title equals the corrected title", async () => {
    const { homepageMetadata } = await import("../lib/homepage-seo");
    const og = homepageMetadata.openGraph as { title?: string };
    expect(og?.title).toBe(EXPECTED_TITLE);
  });

  it("twitter.title equals the corrected title", async () => {
    const { homepageMetadata } = await import("../lib/homepage-seo");
    const tw = homepageMetadata.twitter as { title?: string };
    expect(tw?.title).toBe(EXPECTED_TITLE);
  });

  it("title contains no corrupted encoding sequences", async () => {
    const { homepageMetadata } = await import("../lib/homepage-seo");
    const title = String(homepageMetadata.title ?? "");
    expect(title).not.toMatch(/â/);
    expect(title).not.toContain("&#8212;");
    expect(title).not.toContain("&mdash;");
  });

  it("canonical URL is https://rotten-company.com", async () => {
    const { homepageMetadata } = await import("../lib/homepage-seo");
    const canonical = (homepageMetadata.alternates as { canonical?: string })?.canonical ?? "";
    expect(canonical).toBe(EXPECTED_URL);
    const ogUrl = (homepageMetadata.openGraph as { url?: string })?.url ?? "";
    expect(ogUrl).toBe(EXPECTED_URL);
  });
});
