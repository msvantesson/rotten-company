import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";

let hookState: unknown[] = [];
let hookIndex = 0;
let effectCallbacks: Array<() => void | Promise<void>> = [];

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");

  return {
    ...actual,
    useState: <T,>(initial: T | (() => T)) => {
      const index = hookIndex++;
      if (hookState[index] === undefined) {
        hookState[index] = typeof initial === "function" ? (initial as () => T)() : initial;
      }

      return [
        hookState[index] as T,
        (value: T | ((prev: T) => T)) => {
          const previous = hookState[index] as T;
          hookState[index] = typeof value === "function" ? (value as (prev: T) => T)(previous) : value;
        },
      ] as const;
    },
    useEffect: (callback: () => void | Promise<void>) => {
      effectCallbacks.push(callback);
    },
  };
});

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode; [key: string]: unknown }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("@/components/MacroTierBadge", () => ({
  default: ({ score }: { score: number }) => <span>Tier {score}</span>,
}));

vi.mock("../app/rotten-index/ExportCsvButton", () => ({
  default: () => <button type="button">Export CSV</button>,
}));

vi.mock("../app/rotten-index/CompanyCardList", () => ({
  default: ({ rows }: { rows: Array<{ name: string }> }) => <div>{rows.map((row) => row.name).join(", ")}</div>,
}));

vi.mock("../app/rotten-index/FindCompanyInline", () => ({
  default: () => <div>Find company</div>,
}));

type ClientProps = {
  initialType: "company" | "leader";
  initialCountry: string | null;
  initialLimit: number;
  initialQuery: string | null;
  initialSort: "rotten_score" | "approved_evidence_count" | "name" | "industry";
  initialDir: "asc" | "desc";
  initialRows: Array<{
    id: number;
    name: string;
    slug: string;
    country?: string | null;
    rotten_score: number | null;
    industry?: string | null;
    approved_evidence_count?: number;
    company_name?: string | null;
    company_slug?: string | null;
    started_at?: string | null;
    ended_at?: string | null;
  }>;
  initialOptions: string[];
};

function resetHooks() {
  hookState = [];
  hookIndex = 0;
  effectCallbacks = [];
}

function rerender(Component: (props: ClientProps) => ReactElement, props: ClientProps) {
  hookIndex = 0;
  effectCallbacks = [];
  return Component(props);
}

async function runEffects() {
  const callbacks = [...effectCallbacks];
  effectCallbacks = [];
  for (const callback of callbacks) {
    await callback();
  }
}

function collectElements(node: ReactNode): ReactElement[] {
  if (node == null || typeof node === "boolean" || typeof node === "string" || typeof node === "number") {
    return [];
  }

  if (Array.isArray(node)) {
    return node.flatMap(collectElements);
  }

  if (!isValidElement(node)) {
    return [];
  }

  const element = node as ReactElement<{ children?: ReactNode }>;
  return [element, ...collectElements(element.props.children)];
}

type ElementWithProps = ReactElement<Record<string, unknown>>;

function findElement(
  tree: ReactElement,
  predicate: (element: ElementWithProps) => boolean,
) {
  return collectElements(tree).find((element) => predicate(element as ElementWithProps)) as ElementWithProps | undefined;
}

function getElementProp<T>(element: ElementWithProps | undefined, key: string) {
  return element?.props[key] as T | undefined;
}

describe("RottenIndexClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetHooks();
    vi.stubGlobal("fetch", vi.fn());
    vi.stubGlobal("window", {
      history: { replaceState: vi.fn() },
    });
  });

  it("renders initial server data without an immediate API fetch", async () => {
    const { default: RottenIndexClient } = await import("../app/rotten-index/RottenIndexClient");

    const props: ClientProps = {
      initialType: "company",
      initialCountry: null,
      initialLimit: 10,
      initialQuery: null,
      initialSort: "rotten_score",
      initialDir: "desc",
      initialRows: [
        {
          id: 1,
          name: "Acme Corp",
          slug: "acme-corp",
          country: "Belgium",
          industry: "Finance",
          rotten_score: 42.5,
          approved_evidence_count: 7,
        },
      ],
      initialOptions: ["Belgium", "Portugal"],
    };

    const tree = rerender(RottenIndexClient, props);
    await runEffects();

    expect(renderToStaticMarkup(tree)).toContain("Acme Corp");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("fetches updated rows for user-driven filter changes", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue({
      ok: true,
      text: async () =>
        JSON.stringify({
          rows: [
            {
              id: 2,
              name: "Belgium Co",
              slug: "belgium-co",
              country: "Belgium",
              industry: "Energy",
              rotten_score: 88.1,
              approved_evidence_count: 12,
            },
          ],
        }),
    } as Response);

    const { default: RottenIndexClient } = await import("../app/rotten-index/RottenIndexClient");

    const props: ClientProps = {
      initialType: "company",
      initialCountry: null,
      initialLimit: 10,
      initialQuery: null,
      initialSort: "rotten_score",
      initialDir: "desc",
      initialRows: [
        {
          id: 1,
          name: "Acme Corp",
          slug: "acme-corp",
          country: "Portugal",
          industry: "Finance",
          rotten_score: 42.5,
          approved_evidence_count: 7,
        },
      ],
      initialOptions: ["Belgium", "Portugal"],
    };

    let tree = rerender(RottenIndexClient, props);
    const countrySelect = findElement(tree, (element) => element.type === "select" && element.props.name === "country");
    const limitSelect = findElement(tree, (element) => element.type === "select" && element.props.name === "limit");

    expect(countrySelect).toBeDefined();
    expect(limitSelect).toBeDefined();

    getElementProp<(event: { target: { value: string } }) => void>(countrySelect, "onChange")?.({
      target: { value: "Belgium" },
    });
    getElementProp<(event: { target: { value: string } }) => void>(limitSelect, "onChange")?.({
      target: { value: "25" },
    });

    tree = rerender(RottenIndexClient, props);
    const form = findElement(tree, (element) => element.type === "form");
    expect(form).toBeDefined();

    await getElementProp<(event: { preventDefault: () => void }) => Promise<void>>(form, "onSubmit")?.({
      preventDefault: vi.fn(),
    });
    tree = rerender(RottenIndexClient, props);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/rotten-index?type=company&limit=25&country=Belgium&sort=rotten_score&dir=desc",
      { cache: "no-store" },
    );
    expect(window.history.replaceState).toHaveBeenCalledWith(
      {},
      "",
      "/rotten-index?type=company&limit=25&country=Belgium&sort=rotten_score&dir=desc",
    );
    expect(renderToStaticMarkup(tree)).toContain("Belgium Co");
  });

  it("shows loading during a user fetch and surfaces errors safely", async () => {
    let resolveFetch: ((value: Response) => void) | undefined;
    const fetchPromise = new Promise<Response>((resolve) => {
      resolveFetch = resolve;
    });
    vi.mocked(fetch).mockReturnValue(fetchPromise);

    const { default: RottenIndexClient } = await import("../app/rotten-index/RottenIndexClient");

    const props: ClientProps = {
      initialType: "company",
      initialCountry: null,
      initialLimit: 10,
      initialQuery: null,
      initialSort: "rotten_score",
      initialDir: "desc",
      initialRows: [
        {
          id: 1,
          name: "Acme Corp",
          slug: "acme-corp",
          country: "Portugal",
          industry: "Finance",
          rotten_score: 42.5,
          approved_evidence_count: 7,
        },
      ],
      initialOptions: ["Belgium", "Portugal"],
    };

    let tree = rerender(RottenIndexClient, props);
    const form = findElement(tree, (element) => element.type === "form");
    expect(form).toBeDefined();

    const submitPromise = getElementProp<(event: { preventDefault: () => void }) => Promise<void>>(form, "onSubmit")?.({
      preventDefault: vi.fn(),
    });
    tree = rerender(RottenIndexClient, props);
    expect(renderToStaticMarkup(tree)).toContain("Loading…");

    resolveFetch?.({
      ok: false,
      status: 500,
      text: async () => "",
    } as Response);
    await submitPromise;

    tree = rerender(RottenIndexClient, props);
    const html = renderToStaticMarkup(tree);
    expect(html).toContain("Unable to load the Rotten Index. Please try again.");
    expect(html).not.toContain("Loading…");
  });
});
