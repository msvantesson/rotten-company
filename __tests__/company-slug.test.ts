import { describe, expect, it } from "vitest";
import {
  ensureCompanySlugAvailable,
  resolveCompanySlug,
} from "../lib/company-slug";

type TableRows = Record<string, Array<Record<string, unknown>>>;

function createSupabase(rows: TableRows) {
  return {
    from(table: string) {
      return {
        select() {
          return {
            eq(column: string, value: unknown) {
              return {
                async maybeSingle() {
                  const match =
                    rows[table]?.find((row) => row?.[column] === value) ?? null;
                  return { data: match, error: null };
                },
              };
            },
          };
        },
      };
    },
  };
}

describe("resolveCompanySlug", () => {
  it("treats the stored company slug as canonical", async () => {
    const supabase = createSupabase({
      companies: [{ id: 1, slug: "nestle" }],
      company_slug_redirects: [],
    });

    await expect(resolveCompanySlug(supabase, "nestle")).resolves.toEqual({
      kind: "canonical",
      companyId: 1,
      canonicalSlug: "nestle",
    });
  });

  it("redirects legacy slugs to the company's current stored slug instead of redirect.new_slug", async () => {
    const supabase = createSupabase({
      companies: [{ id: 7, slug: "current-canonical-slug" }],
      company_slug_redirects: [
        {
          company_id: 7,
          old_slug: "legacy-slug",
          new_slug: "intermediate-stale-slug",
        },
      ],
    });

    await expect(resolveCompanySlug(supabase, "legacy-slug")).resolves.toEqual({
      kind: "redirect",
      companyId: 7,
      canonicalSlug: "current-canonical-slug",
    });
  });

  it("returns not_found for unknown slugs", async () => {
    const supabase = createSupabase({
      companies: [],
      company_slug_redirects: [],
    });

    await expect(resolveCompanySlug(supabase, "missing-company")).resolves.toEqual({
      kind: "not_found",
    });
  });

  it("rejects self-redirect records safely", async () => {
    const supabase = createSupabase({
      companies: [{ id: 4, slug: "current-company-slug" }],
      company_slug_redirects: [
        {
          company_id: 4,
          old_slug: "legacy-slug",
          new_slug: "legacy-slug",
        },
      ],
    });

    await expect(resolveCompanySlug(supabase, "legacy-slug")).resolves.toEqual({
      kind: "not_found",
    });
  });

  it("handles missing redirect-company relationships safely", async () => {
    const supabase = createSupabase({
      companies: [],
      company_slug_redirects: [
        {
          company_id: 99,
          old_slug: "legacy-slug",
          new_slug: "new-slug",
        },
      ],
    });

    await expect(resolveCompanySlug(supabase, "legacy-slug")).resolves.toEqual({
      kind: "not_found",
    });
  });
});

describe("ensureCompanySlugAvailable", () => {
  it("rejects collisions with current company slugs", async () => {
    const supabase = createSupabase({
      companies: [{ id: 1, slug: "nestle" }],
      company_slug_redirects: [],
    });

    await expect(ensureCompanySlugAvailable(supabase, "nestle")).resolves.toMatchObject({
      available: false,
      conflict: "current",
      slug: "nestle",
    });
  });

  it("rejects collisions with historical redirect slugs", async () => {
    const supabase = createSupabase({
      companies: [],
      company_slug_redirects: [
        {
          company_id: 1,
          old_slug: "nestl",
          new_slug: "nestle",
        },
      ],
    });

    await expect(ensureCompanySlugAvailable(supabase, "nestl")).resolves.toMatchObject({
      available: false,
      conflict: "historical",
      slug: "nestl",
    });
  });
});
