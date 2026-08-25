import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";

const notFoundMock = vi.fn(() => {
  throw new Error("NOT_FOUND");
});

// Supabase mock — returns { data, error } for each call
let supabaseMockResult: { data: unknown; error: unknown } = { data: null, error: null };

vi.mock("@/app/lib/data", () => ({
  supabase: {
    from: () => ({
      select: function () { return this; },
      eq: function () { return this; },
      maybeSingle: () => Promise.resolve(supabaseMockResult),
      in: function () { return this; },
      then: (resolve: (v: { data: unknown[]; error: null }) => unknown) =>
        Promise.resolve({ data: [], error: null }).then(resolve),
    }),
  },
  fetchApprovedEvidence: vi.fn(async () => []),
}));

vi.mock("next/navigation", () => ({
  notFound: notFoundMock,
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("@/lib/category-help", () => ({
  getCategoryHelp: () => null,
}));

vi.mock("@/lib/flavor-engine", () => ({
  getCategoryFlavor: () => "Some flavor text",
}));

vi.mock("@/components/BackLink", () => ({
  default: ({ children }: { children: ReactNode }) => <a>{children}</a>,
}));

vi.mock("@/lib/seo", () => ({
  canonicalUrl: (path: string) => `https://example.test${path}`,
  buildBreadcrumbJsonLd: (items: unknown[]) => ({
    "@type": "BreadcrumbList",
    itemListElement: items,
  }),
}));

function makeCategory(overrides = {}) {
  return {
    id: 1,
    slug: "false_claims",
    name: "False Claims",
    description: "Claims that are false",
    ...overrides,
  };
}

describe("/category/[slug] page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabaseMockResult = { data: null, error: null };
  });

  it("renders normally for a valid false_claims category", async () => {
    supabaseMockResult = { data: makeCategory({ slug: "false_claims", name: "False Claims" }), error: null };
    const { default: CategoryPage } = await import("../app/category/[slug]/page");
    const html = renderToStaticMarkup(await CategoryPage({ params: { slug: "false_claims" } }));
    expect(html).toContain("False Claims");
    expect(notFoundMock).not.toHaveBeenCalled();
  });

  it("renders normally for a valid broken_promises category", async () => {
    supabaseMockResult = { data: makeCategory({ slug: "broken_promises", name: "Broken Promises" }), error: null };
    const { default: CategoryPage } = await import("../app/category/[slug]/page");
    const html = renderToStaticMarkup(await CategoryPage({ params: { slug: "broken_promises" } }));
    expect(html).toContain("Broken Promises");
    expect(notFoundMock).not.toHaveBeenCalled();
  });

  it("renders normally for a valid private-equity-fallout category", async () => {
    supabaseMockResult = { data: makeCategory({ slug: "private-equity-fallout", name: "Private Equity Fallout" }), error: null };
    const { default: CategoryPage } = await import("../app/category/[slug]/page");
    const html = renderToStaticMarkup(await CategoryPage({ params: { slug: "private-equity-fallout" } }));
    expect(html).toContain("Private Equity Fallout");
    expect(notFoundMock).not.toHaveBeenCalled();
  });

  it("calls notFound() for a missing category", async () => {
    supabaseMockResult = { data: null, error: null };
    const { default: CategoryPage } = await import("../app/category/[slug]/page");
    await expect(CategoryPage({ params: { slug: "this-category-does-not-exist" } })).rejects.toThrow("NOT_FOUND");
    expect(notFoundMock).toHaveBeenCalled();
  });

  it("does NOT call notFound() on database error", async () => {
    supabaseMockResult = { data: null, error: { message: "connection refused", code: "500" } };
    const { default: CategoryPage } = await import("../app/category/[slug]/page");
    await expect(CategoryPage({ params: { slug: "false_claims" } })).rejects.toMatchObject({
      message: "connection refused",
    });
    expect(notFoundMock).not.toHaveBeenCalled();
  });

  it("propagates database error as a server error", async () => {
    const dbError = { message: "connection refused", code: "500" };
    supabaseMockResult = { data: null, error: dbError };
    const { default: CategoryPage } = await import("../app/category/[slug]/page");
    await expect(CategoryPage({ params: { slug: "false_claims" } })).rejects.toMatchObject(dbError);
  });

  it("does not render soft-404 markup", async () => {
    supabaseMockResult = { data: makeCategory(), error: null };
    const { default: CategoryPage } = await import("../app/category/[slug]/page");
    const html = renderToStaticMarkup(await CategoryPage({ params: { slug: "false_claims" } }));
    expect(html).not.toContain("No category found for slug");
  });
});

describe("/category/[slug] generateMetadata", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabaseMockResult = { data: null, error: null };
  });

  it("returns normal metadata for a valid category", async () => {
    supabaseMockResult = { data: makeCategory({ name: "False Claims" }), error: null };
    const { generateMetadata } = await import("../app/category/[slug]/page");
    const meta = await generateMetadata({ params: { slug: "false_claims" } });
    expect(meta.title).toContain("False Claims");
    expect((meta as { robots?: unknown }).robots).toBeUndefined();
  });

  it("returns fallback metadata on database error without calling notFound()", async () => {
    supabaseMockResult = { data: null, error: { message: "DB error", code: "500" } };
    const { generateMetadata } = await import("../app/category/[slug]/page");
    const meta = await generateMetadata({ params: { slug: "false_claims" } });
    expect(meta.title).toBe("Category Not Found");
    expect(notFoundMock).not.toHaveBeenCalled();
  });
});
