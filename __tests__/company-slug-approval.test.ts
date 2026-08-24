import { beforeEach, describe, expect, it, vi } from "vitest";

const redirectMock = vi.fn((url: string) => {
  throw new Error(`REDIRECT:${url}`);
});
const revalidatePathMock = vi.fn();
const supabaseServerMock = vi.fn();
const supabaseServiceMock = vi.fn();
const getModerationGateStatusMock = vi.fn();

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

vi.mock("@/lib/supabase-server", () => ({
  supabaseServer: supabaseServerMock,
}));

vi.mock("@/lib/supabase-service", () => ({
  supabaseService: supabaseServiceMock,
}));

vi.mock("@/lib/company-slug", async () => await import("../lib/company-slug"));

vi.mock("@/lib/moderation-guards", () => ({
  getModerationGateStatus: getModerationGateStatusMock,
}));

vi.mock("@/lib/indexnow", () => ({
  notifyIndexNow: vi.fn(),
  companyIndexNowUrl: vi.fn(() => "https://example.test/indexnow"),
}));

vi.mock("@/lib/company-edit-patch", () => ({
  buildCompanyEditPatch: vi.fn(() => ({})),
}));

vi.mock("@/lib/company/companyInsertFromRequest", () => ({
  companyInsertFromRequest: vi.fn((cr: { name: string }, slug: string) => ({
    name: cr.name,
    slug,
  })),
}));

vi.mock("@/lib/slugify", () => ({
  slugify: (input: string) => (input === "Nestlé" ? "nestle" : "generated-company-slug"),
}));

type QueryState = {
  eqs: Array<[string, unknown]>;
};

function createQuery(
  table: string,
  resolver: (table: string, state: QueryState, terminal: "maybeSingle" | "single" | "then") => unknown,
) {
  const state: QueryState = { eqs: [] };

  const query = {
    select: () => query,
    eq: (column: string, value: unknown) => {
      state.eqs.push([column, value]);
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
  authUser?: { id: string } | null;
  resolver: (table: string, state: QueryState, terminal: "maybeSingle" | "single" | "then") => unknown;
}) {
  return {
    auth: {
      getUser: vi.fn(async () => ({ data: { user: options.authUser ?? null } })),
    },
    from: (table: string) => createQuery(table, options.resolver),
  };
}

describe("company slug approval safeguards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getModerationGateStatusMock.mockResolvedValue({ allowed: true });
  });

  it("blocks company creation when the proposed slug is reserved by a historical redirect", async () => {
    supabaseServerMock.mockResolvedValue(
      createClientMock({
        authUser: { id: "mod-1" },
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
                name: "Nestlé",
                country: "CH",
                website: null,
                industry: null,
                description: null,
                hq_region: null,
                hq_city: null,
                size_employees: null,
                status: "pending",
                user_id: null,
                approved_company_id: null,
                assigned_moderator_id: "mod-1",
              },
              error: null,
            };
          }

          if (table === "companies" && terminal === "maybeSingle") {
            return { data: null, error: null };
          }

          if (
            table === "company_slug_redirects" &&
            terminal === "maybeSingle" &&
            state.eqs.some(([column, value]) => column === "old_slug" && value === "nestle")
          ) {
            return {
              data: { company_id: 1 },
              error: null,
            };
          }

          return { data: null, error: null };
        },
      }),
    );

    const { approveCompanyRequest } = await import("../app/moderation/company-requests/actions");
    const formData = new FormData();
    formData.set("request_id", "req-1");
    formData.set("moderator_note", "approved");

    await expect(approveCompanyRequest(formData)).rejects.toThrow(
      'REDIRECT:/moderation/company-requests/req-1?error=The%20proposed%20company%20slug%20%22nestle%22%20is%20reserved%20by%20a%20historical%20company%20URL%20redirect.',
    );
  });

  it("returns a conflict when the proposed slug already exists on a current company", async () => {
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
                name: "Nestlé",
                country: "CH",
                website: null,
                industry: null,
                description: null,
                hq_region: null,
                hq_city: null,
                size_employees: null,
                status: "pending",
                user_id: null,
                approved_company_id: null,
              },
              error: null,
            };
          }

          if (
            table === "companies" &&
            terminal === "maybeSingle" &&
            state.eqs.some(([column, value]) => column === "slug" && value === "nestle")
          ) {
            return { data: { id: 7 }, error: null };
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

    expect(response.status).toBe(409);
    await expect(response.text()).resolves.toContain(
      'The proposed company slug "nestle" is already used by an existing company.',
    );
  });
});
