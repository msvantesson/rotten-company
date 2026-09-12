import { beforeEach, describe, expect, it, vi } from "vitest";

const getUserMock = vi.fn();
const upsertMock = vi.fn();
const categoryMaybeSingleMock = vi.fn();
const insertSingleMock = vi.fn();
const insertSelectMock = vi.fn();
const insertMock = vi.fn();
const fromMock = vi.fn();

vi.mock("@/lib/supabase-server", () => ({
  supabaseServer: vi.fn(async () => ({
    auth: { getUser: getUserMock },
    from: fromMock,
    storage: {
      from: vi.fn(),
    },
  })),
}));

vi.mock("@/app/lib/legacy-category", () => ({
  toLegacyCategory: (categoryId: number) => categoryId,
}));

vi.mock("@/lib/severity-mapping", () => ({
  severityLabelToNumber: () => null,
}));

vi.mock("@/lib/evidence-timeline", () => ({
  normalizeEvidenceTimelineInput: (input: Record<string, unknown>) => ({
    ok: true,
    data: {
      event_start_date: input.event_start_date ?? null,
      event_start_precision: input.event_start_precision ?? null,
      event_end_date: input.event_end_date ?? null,
      event_end_precision: input.event_end_precision ?? null,
      event_is_ongoing: input.event_is_ongoing === "true",
      resolution_status: input.resolution_status ?? null,
      resolution_date: input.resolution_date ?? null,
      resolution_date_precision: input.resolution_date_precision ?? null,
    },
  }),
}));

import { POST } from "../app/api/evidence/submit/route";

function makeRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/evidence/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/evidence/submit", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    getUserMock.mockResolvedValue({
      data: {
        user: {
          id: "user-1",
          email: "user@example.com",
          user_metadata: {},
        },
      },
      error: null,
    });

    upsertMock.mockResolvedValue({ error: null });
    categoryMaybeSingleMock.mockResolvedValue({ data: { id: 7 }, error: null });
    insertSingleMock.mockResolvedValue({ data: { id: 123 }, error: null });
    insertSelectMock.mockReturnValue({ single: insertSingleMock });
    insertMock.mockReturnValue({ select: insertSelectMock });

    fromMock.mockImplementation((table: string) => {
      if (table === "users") {
        return { upsert: upsertMock };
      }

      if (table === "categories") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: categoryMaybeSingleMock,
            })),
          })),
        };
      }

      if (table === "evidence") {
        return { insert: insertMock };
      }

      throw new Error(`Unexpected table: ${table}`);
    });
  });

  it("uses the authenticated user id and leaves moderation/scoring fields unset", async () => {
    const response = await POST(
      makeRequest({
        entityType: "company",
        entityId: "101",
        title: "Evidence title",
        summary: "Documented issue with a public source https://example.com/report",
        category: "7",
        userId: "attacker-user",
        status: "approved",
        assigned_moderator_id: "mod-1",
        assigned_at: "2026-09-01T00:00:00.000Z",
        severity: 99,
        recency_weight: 99,
        file_weight: 99,
        total_weight: 99,
        created_at: "2000-01-01T00:00:00.000Z",
        event_start_date: "2026-01-01",
        event_start_precision: "day",
        event_is_ongoing: "true",
        resolution_status: "unresolved",
      }),
    );

    expect(response.status).toBe(200);
    expect(insertMock).toHaveBeenCalledTimes(1);

    const insertedRow = insertMock.mock.calls[0]?.[0]?.[0];
    expect(insertedRow).toMatchObject({
      entity_type: "company",
      entity_id: 101,
      company_id: 101,
      user_id: "user-1",
      category_id: 7,
      category: 7,
      title: "Evidence title",
    });
    expect(insertedRow).not.toHaveProperty("status");
    expect(insertedRow).not.toHaveProperty("assigned_moderator_id");
    expect(insertedRow).not.toHaveProperty("assigned_at");
    expect(insertedRow).not.toHaveProperty("severity");
    expect(insertedRow).not.toHaveProperty("recency_weight");
    expect(insertedRow).not.toHaveProperty("file_weight");
    expect(insertedRow).not.toHaveProperty("total_weight");
    expect(insertedRow).not.toHaveProperty("created_at");
  });

  it("rejects unauthenticated requests before insert", async () => {
    getUserMock.mockResolvedValueOnce({ data: { user: null }, error: null });

    const response = await POST(
      makeRequest({
        entityType: "company",
        entityId: "101",
        title: "Evidence title",
        summary: "Documented issue with a public source https://example.com/report",
        category: "7",
        event_start_date: "2026-01-01",
        event_start_precision: "day",
        event_is_ongoing: "true",
        resolution_status: "unresolved",
      }),
    );

    expect(response.status).toBe(401);
    expect(insertMock).not.toHaveBeenCalled();
  });
});
