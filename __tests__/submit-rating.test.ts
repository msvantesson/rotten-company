import { describe, expect, it, vi, beforeEach } from "vitest";

const upsertMock = vi.fn();
const getUserMock = vi.fn();
const selectMock = vi.fn();
const eqMock = vi.fn();

vi.mock("@/lib/supabase-server", () => ({
  supabaseServer: vi.fn(async () => ({
    auth: { getUser: getUserMock },
    from: vi.fn(() => ({
      upsert: upsertMock,
      select: selectMock,
      eq: eqMock,
    })),
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

beforeEach(() => {
  vi.clearAllMocks();

  getUserMock.mockResolvedValue({ data: { user: { id: "user-1", email: "u@example.com", user_metadata: {} } }, error: null });

  const ratingSelectChain = {
    select: vi.fn(() => ({ single: vi.fn() })),
  };

  upsertMock.mockReturnValue(ratingSelectChain);
  selectMock.mockReturnValue({ eq: eqMock });
  eqMock.mockReturnValue({ single: vi.fn() });
});

describe("POST /api/submit-rating", () => {
  it("accepts score 1", async () => {
    const response = await POST(makeRequest({ companySlug: "acme", categorySlug: "harms", score: 1 }));
    expect(response.status).not.toBe(400);
  });

  it("accepts score 5", async () => {
    const response = await POST(makeRequest({ companySlug: "acme", categorySlug: "harms", score: 5 }));
    expect(response.status).not.toBe(400);
  });

  it("rejects score 0", async () => {
    const response = await POST(makeRequest({ companySlug: "acme", categorySlug: "harms", score: 0 }));
    expect(response.status).toBe(400);
  });

  it("rejects score 6", async () => {
    const response = await POST(makeRequest({ companySlug: "acme", categorySlug: "harms", score: 6 }));
    expect(response.status).toBe(400);
  });

  it("rejects decimal scores", async () => {
    const response = await POST(makeRequest({ companySlug: "acme", categorySlug: "harms", score: 1.5 }));
    expect(response.status).toBe(400);
  });

  it("rejects unauthenticated requests", async () => {
    getUserMock.mockResolvedValueOnce({ data: { user: null }, error: null });
    const response = await POST(makeRequest({ companySlug: "acme", categorySlug: "harms", score: 3 }));
    expect(response.status).toBe(401);
  });
});
