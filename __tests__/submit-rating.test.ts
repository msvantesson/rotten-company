import { describe, expect, it, vi, beforeEach } from "vitest";

const upsertMock = vi.fn();
const getUserMock = vi.fn();
const selectMock = vi.fn();
const eqMock = vi.fn();
const fromMock = vi.fn();

vi.mock("@/lib/supabase-server", () => ({
  supabaseServer: vi.fn(async () => ({
    auth: { getUser: getUserMock },
    from: fromMock,
  })),
}));

vi.mock("next/server", async () => {
  const actual = await vi.importActual<typeof import("next/server")>("next/server");
  return actual;
});

import { POST } from "@/app/api/submit-rating/route";

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/submit-rating", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeSingleResult<T>(result: { data: T; error: unknown }) {
  return vi.fn().mockResolvedValue(result);
}

beforeEach(() => {
  vi.clearAllMocks();

  getUserMock.mockResolvedValue({ data: { user: { id: "user-1", email: "u@example.com", user_metadata: {} } }, error: null });

  const companySingle = makeSingleResult({ data: { id: 101 }, error: null });
  const categorySingle = makeSingleResult({ data: { id: 7 }, error: null });

  upsertMock.mockImplementation((payload: { score?: number }, options?: { onConflict?: string }) => {
    if (options?.onConflict === "id") {
      return Promise.resolve({ error: null });
    }

    return {
      select: vi.fn((selection: string) => {
        expect(selection).toContain("score");
        return {
          single: vi.fn().mockResolvedValue({
            data: {
              id: 1,
              user_id: "user-1",
              company_id: 101,
              category: 7,
              score: payload.score,
              created_at: "2026-09-11T00:00:00.000Z",
            },
            error: null,
          }),
        };
      }),
    };
  });

  selectMock.mockImplementation((selection: string) => {
    expect(selection).toBe("id");
    return {
      eq: eqMock.mockImplementation((column: string, value: string) => {
        expect(column).toBe("slug");
        return {
          single:
            value === "acme"
              ? companySingle
              : value === "harms"
                ? categorySingle
                : makeSingleResult({ data: null, error: { message: "not found" } }),
        };
      }),
    };
  });

  fromMock.mockImplementation((table: string) => {
    if (table === "users" || table === "ratings") {
      return {
        upsert: upsertMock,
      };
    }

    if (table === "companies" || table === "categories") {
      return {
        select: selectMock,
      };
    }

    throw new Error(`Unexpected table: ${table}`);
  });
});

describe("POST /api/submit-rating", () => {
  it("accepts score 1", async () => {
    const response = await POST(makeRequest({ companySlug: "acme", categorySlug: "harms", score: 1 }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      rating: { score: 1, user_id: "user-1", company_id: 101, category: 7 },
    });
  });

  it("accepts score 5", async () => {
    const response = await POST(makeRequest({ companySlug: "acme", categorySlug: "harms", score: 5 }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      rating: { score: 5, user_id: "user-1", company_id: 101, category: 7 },
    });
  });

  it("rejects score 0", async () => {
    const response = await POST(makeRequest({ companySlug: "acme", categorySlug: "harms", score: 0 }));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "invalid_request",
      field: "score",
      message: "score must be an integer from 1 to 5",
    });
  });

  it("rejects score 6", async () => {
    const response = await POST(makeRequest({ companySlug: "acme", categorySlug: "harms", score: 6 }));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "invalid_request",
      field: "score",
      message: "score must be an integer from 1 to 5",
    });
  });

  it("rejects decimal scores", async () => {
    const response = await POST(makeRequest({ companySlug: "acme", categorySlug: "harms", score: 1.5 }));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "invalid_request",
      field: "score",
      message: "score must be an integer from 1 to 5",
    });
  });

  it("rejects unauthenticated requests", async () => {
    getUserMock.mockResolvedValueOnce({ data: { user: null }, error: null });
    const response = await POST(makeRequest({ companySlug: "acme", categorySlug: "harms", score: 3 }));
    expect(response.status).toBe(401);
  });
});
