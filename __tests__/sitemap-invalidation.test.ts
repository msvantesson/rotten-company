import { beforeEach, describe, expect, it, vi } from "vitest";

const revalidatePathMock = vi.fn();
const redirectMock = vi.fn((url: string) => {
  throw new Error(`REDIRECT:${url}`);
});
const supabaseServerMock = vi.fn();
const supabaseServiceMock = vi.fn();
const canModerateMock = vi.fn();
const notifyIndexNowMock = vi.fn();
const companyIndexNowUrlMock = vi.fn((slug: string) => `https://example.test/company/${slug}`);
const buildCompanyEditPatchMock = vi.fn(() => ({ website: "https://example.test" }));
const companyInsertFromRequestMock = vi.fn((cr: { name: string }, slug: string) => ({
  name: cr.name,
  slug,
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: unknown; [key: string]: unknown }) => ({
    type: "a",
    props: { href, ...rest, children },
  }),
}));

vi.mock("@/lib/supabase-server", () => ({
  supabaseServer: supabaseServerMock,
}));

vi.mock("@/lib/supabase-service", () => ({
  supabaseService: supabaseServiceMock,
}));

vi.mock("@/lib/moderation-guards", () => ({
  canModerate: canModerateMock,
  getModerationGateStatus: vi.fn(async () => ({ allowed: true })),
}));

vi.mock("@/lib/indexnow", () => ({
  notifyIndexNow: notifyIndexNowMock,
  companyIndexNowUrl: companyIndexNowUrlMock,
}));

vi.mock("@/lib/company-edit-patch", () => ({
  buildCompanyEditPatch: buildCompanyEditPatchMock,
}));

vi.mock("@/lib/company/companyInsertFromRequest", () => ({
  companyInsertFromRequest: companyInsertFromRequestMock,
}));

type QueryState = {
  selectArg?: string;
  eqs: Array<[string, unknown]>;
  nots: Array<[string, string, unknown]>;
  updatePayload?: unknown;
  insertPayload?: unknown;
};

function createQuery(table: string, resolver: (table: string, state: QueryState, terminal: string) => unknown) {
  const state: QueryState = {
    eqs: [],
    nots: [],
  };

  const query = {
    select: (selectArg?: string) => {
      state.selectArg = selectArg;
      return query;
    },
    eq: (column: string, value: unknown) => {
      state.eqs.push([column, value]);
      return query;
    },
    not: (column: string, operator: string, value: unknown) => {
      state.nots.push([column, operator, value]);
      return query;
    },
    update: (payload: unknown) => {
      state.updatePayload = payload;
      return query;
    },
    insert: (payload: unknown) => {
      state.insertPayload = payload;
      return query;
    },
    maybeSingle: async () => resolver(table, state, "maybeSingle"),
    single: async () => resolver(table, state, "single"),
    then: <TResult1 = unknown, TResult2 = never>(
      onfulfilled?: ((value: unknown) => TResult1 | PromiseLike<TResult1>) | null,
      onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
    ) => Promise.resolve(resolver(table, state, "then")).then(onfulfilled, onrejected),
  };

  return query;
}

function createClientMock(options: {
  authUser?: { id: string; email?: string } | null;
  resolver: (table: string, state: QueryState, terminal: string) => unknown;
}) {
  return {
    auth: {
      getUser: vi.fn(async () => ({ data: { user: options.authUser ?? null } })),
    },
    from: (table: string) => createQuery(table, options.resolver),
  };
}

function findFormAction(node: unknown): ((formData: FormData) => Promise<void>) | null {
  if (!node || typeof node !== "object") return null;

  const candidate = node as { type?: unknown; props?: { action?: unknown; children?: unknown } };

  if (candidate.type === "form" && typeof candidate.props?.action === "function") {
    return candidate.props.action as (formData: FormData) => Promise<void>;
  }

  const children = candidate.props?.children;
  if (Array.isArray(children)) {
    for (const child of children) {
      const found = findFormAction(child);
      if (found) return found;
    }
    return null;
  }

  return findFormAction(children);
}

describe("sitemap invalidation on approval paths", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    canModerateMock.mockResolvedValue(true);
  });

  it("approval server action invalidates /sitemap.xml", async () => {
    supabaseServerMock.mockResolvedValue(
      createClientMock({
        authUser: { id: "mod-1", email: "mod@example.test" },
        resolver: () => ({ data: null, error: null }),
      }),
    );

    supabaseServiceMock.mockReturnValue(
      createClientMock({
        resolver: (table, state, terminal) => {
          if (table === "company_requests" && terminal === "maybeSingle") {
            return {
              data: {
                id: "req-1",
                name: "New Company",
                country: "US",
                hq_region: null,
                hq_city: null,
                website: null,
                industry: null,
                description: null,
                size_employees: null,
                status: "pending",
                assigned_moderator_id: "mod-1",
                user_id: null,
                approved_company_id: null,
              },
              error: null,
            };
          }

          if (table === "companies" && terminal === "maybeSingle") {
            return { data: null, error: null };
          }

          if (table === "companies" && terminal === "single") {
            return { data: { id: 42, slug: "new-company" }, error: null };
          }

          if (table === "company_requests" && terminal === "then" && state.updatePayload) {
            return { data: [{ id: "req-1" }], error: null };
          }

          if ((table === "moderation_actions" || table === "notification_jobs") && terminal === "then") {
            return { error: null };
          }

          return { data: null, error: null };
        },
      }),
    );

    const { approveCompanyRequest } = await import("../app/moderation/company-requests/actions");

    const formData = new FormData();
    formData.set("request_id", "req-1");
    formData.set("moderator_note", "approved");

    await expect(approveCompanyRequest(formData)).rejects.toThrow("REDIRECT:/moderation");
    expect(revalidatePathMock).toHaveBeenCalledWith("/sitemap.xml");
  });

  it("admin approval path invalidates /sitemap.xml", async () => {
    let companyRequestMaybeSingleCount = 0;

    supabaseServerMock.mockResolvedValue(
      createClientMock({
        authUser: { id: "mod-1", email: "mod@example.test" },
        resolver: () => ({ data: null, error: null }),
      }),
    );

    supabaseServiceMock.mockReturnValue(
      createClientMock({
        resolver: (table, state, terminal) => {
          if (table === "company_requests" && terminal === "maybeSingle") {
            companyRequestMaybeSingleCount += 1;

            if (companyRequestMaybeSingleCount === 1) {
              return {
                data: {
                  id: "req-1",
                  name: "Admin Reviewed Company",
                  country: "US",
                  website: null,
                  description: null,
                  status: "pending",
                  user_id: null,
                  moderator_id: null,
                  decision_reason: null,
                  moderated_at: null,
                  assigned_moderator_id: "mod-1",
                  assigned_at: null,
                  created_at: "2026-08-20T00:00:00.000Z",
                },
                error: null,
              };
            }

            return {
              data: { approved_company_id: null },
              error: null,
            };
          }

          if (table === "company_requests" && terminal === "then" && state.updatePayload) {
            return { data: [{ id: "req-1" }], error: null };
          }

          return { data: null, error: null };
        },
      }),
    );

    const { default: AdminCompanyRequestPage } = await import("../app/admin/moderation/company-requests/[id]/page");
    const tree = await AdminCompanyRequestPage({ params: { id: "req-1" } });
    const action = findFormAction(tree);

    expect(action).not.toBeNull();

    const formData = new FormData();
    formData.set("note", "approved");

    await expect(action!(formData)).rejects.toThrow("REDIRECT:/moderation/company-requests");
    expect(revalidatePathMock).toHaveBeenCalledWith("/sitemap.xml");
  });

  it("existing API company-approval route still returns success and invalidates /sitemap.xml", async () => {
    supabaseServerMock.mockResolvedValue({
      auth: {
        getUser: vi.fn(async () => ({ data: { user: { id: "mod-1" } } })),
      },
      from: (table: string) =>
        createQuery(table, (_table, _state, terminal) => {
          if (table === "moderators" && terminal === "maybeSingle") {
            return { data: { user_id: "mod-1" }, error: null };
          }
          return { data: null, error: null };
        }),
    });

    supabaseServiceMock.mockReturnValue(
      createClientMock({
        resolver: (table, state, terminal) => {
          if (table === "company_requests" && terminal === "maybeSingle") {
            return {
              data: {
                id: "req-1",
                name: "API Company",
                country: "US",
                hq_region: null,
                hq_city: null,
                website: null,
                industry: null,
                description: null,
                size_employees: null,
                status: "pending",
                user_id: null,
                approved_company_id: null,
              },
              error: null,
            };
          }

          if (table === "companies" && terminal === "maybeSingle") {
            return { data: null, error: null };
          }

          if (table === "companies" && terminal === "single") {
            return { data: { id: 77, slug: "api-company" }, error: null };
          }

          if (table === "company_requests" && terminal === "then" && state.updatePayload) {
            return { data: [{ id: "req-1" }], error: null };
          }

          if (table === "moderation_actions" && terminal === "then") {
            return { error: null };
          }

          return { data: null, error: null };
        },
      }),
    );

    const { POST } = await import("../app/api/moderation/company-requests/approve/route");
    const response = await POST(
      new Request("https://example.test/api/moderation/company-requests/approve", {
        method: "POST",
        body: JSON.stringify({ id: "req-1", moderator_note: "approved" }),
        headers: { "content-type": "application/json" },
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      company_id: 77,
      slug: "api-company",
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/sitemap.xml");
  });

  it("existing API company-edit approval route still returns success and invalidates /sitemap.xml", async () => {
    supabaseServerMock.mockResolvedValue({
      auth: {
        getUser: vi.fn(async () => ({ data: { user: { id: "mod-1" } } })),
      },
      from: (table: string) =>
        createQuery(table, (_table, _state, terminal) => {
          if (table === "moderators" && terminal === "maybeSingle") {
            return { data: { user_id: "mod-1" }, error: null };
          }
          return { data: null, error: null };
        }),
    });

    supabaseServiceMock.mockReturnValue(
      createClientMock({
        resolver: (table, state, terminal) => {
          if (table === "company_requests" && terminal === "maybeSingle") {
            return {
              data: {
                id: "req-2",
                status: "pending",
                name: "Edited Company",
                website: "https://old.example.test",
                industry: null,
                description: null,
                country: "US",
                size_employees: null,
                proposed_name: null,
                approved_company_id: 88,
                user_id: null,
              },
              error: null,
            };
          }

          if (table === "companies" && terminal === "then" && state.updatePayload) {
            return { error: null };
          }

          if (table === "company_requests" && terminal === "then" && state.updatePayload) {
            return { data: [{ id: "req-2" }], error: null };
          }

          if (table === "moderation_actions" && terminal === "then") {
            return { error: null };
          }

          return { data: null, error: null };
        },
      }),
    );

    const { POST } = await import("../app/api/moderation/company-edits/approve/route");
    const response = await POST(
      new Request("https://example.test/api/moderation/company-edits/approve", {
        method: "POST",
        body: JSON.stringify({ id: "req-2", moderator_note: "approved" }),
        headers: { "content-type": "application/json" },
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(revalidatePathMock).toHaveBeenCalledWith("/sitemap.xml");
  });
});
