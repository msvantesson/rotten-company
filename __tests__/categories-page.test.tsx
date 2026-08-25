import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";

const supabaseServerMock = vi.fn();

vi.mock("../lib/supabase-server", () => ({
  supabaseServer: supabaseServerMock,
}));

vi.mock("../lib/seo", () => ({
  canonicalUrl: (path: string) => `https://example.test${path}`,
}));

vi.mock("../lib/supabase-browser", () => ({
  supabaseBrowser: () => ({
    auth: {
      signOut: vi.fn(),
    },
    from: vi.fn(),
  }),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

function createCategoriesSupabase(
  categories: Array<{
    id: number;
    slug: string;
    name: string;
    description: string | null;
  }>,
) {
  const from = (table: string) => {
    const state: {
      order?: { column: string; ascending: boolean | undefined };
    } = {};

    const query = {
      select: () => query,
      order: (column: string, options?: { ascending?: boolean }) => {
        state.order = { column, ascending: options?.ascending };
        return query;
      },
      then: <TResult1 = { data: unknown[]; error: null }, TResult2 = never>(
        onfulfilled?:
          | ((
              value: { data: unknown[]; error: null },
            ) => TResult1 | PromiseLike<TResult1>)
          | null,
        onrejected?:
          | ((reason: unknown) => TResult2 | PromiseLike<TResult2>)
          | null,
      ) => {
        const rows =
          table === "categories" ? [...categories] : [];

        if (state.order?.column === "name") {
          rows.sort((left, right) => left.name.localeCompare(right.name));
        }

        return Promise.resolve({ data: rows, error: null }).then(
          onfulfilled,
          onrejected,
        );
      },
    };

    return query;
  };

  return { from };
}

describe("/categories page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("server-renders a single ItemList JSON-LD payload while preserving the client UI", async () => {
    supabaseServerMock.mockResolvedValue(
      createCategoriesSupabase([
        {
          id: 2,
          slug: "alpha",
          name: "Alpha Category",
          description: "Alpha description",
        },
        {
          id: 1,
          slug: "zeta",
          name: "Zeta Category",
          description: null,
        },
      ]),
    );

    const { default: CategoriesPage } = await import("../app/categories/page");
    const html = renderToStaticMarkup(await CategoriesPage());

    const jsonLdScripts = Array.from(
      html.matchAll(
        /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g,
      ),
    );

    expect(jsonLdScripts).toHaveLength(1);
    expect(html).toContain("Loading categories…");

    const payload = JSON.parse(jsonLdScripts[0]?.[1] ?? "null");

    expect(payload["@type"]).toBe("ItemList");
    expect(payload.itemListElement).toHaveLength(2);
    expect(payload.itemListElement[0]).toMatchObject({
      "@type": "ListItem",
      position: 1,
      url: "https://example.test/category/alpha",
      item: {
        "@type": "CategoryCode",
        identifier: 2,
        name: "Alpha Category",
        description: "Alpha description",
        url: "https://example.test/category/alpha",
      },
    });
    expect(payload.itemListElement[1]).toMatchObject({
      "@type": "ListItem",
      position: 2,
      url: "https://example.test/category/zeta",
      item: {
        "@type": "CategoryCode",
        identifier: 1,
        name: "Zeta Category",
        description: null,
        url: "https://example.test/category/zeta",
      },
    });
  });
});
