/**
 * Moderation self-review rule verification
 *
 * These tests import and call the real action functions; they do not
 * reimplement the eligibility predicate in isolation. If the self-moderation
 * checks inside approveEvidence, rejectEvidence, or assignNextLeaderTenureRequest
 * are removed or changed, one or more tests here will fail.
 *
 * Rule under test:
 *   A moderator must not be able to approve, reject, or claim an item they
 *   submitted. Items whose user_id is NULL (imported / no owner) are not
 *   owned by anyone and must remain claimable by any moderator.
 *
 * Observed production scenario that prompted this verification:
 *   svante01@yahoo.com : 23 total, 0 available excluding yours
 *   svante01@gmail.com : 23 total, 23 available excluding yours
 *
 * If the Yahoo account created all 23 submissions the display is correct:
 *   - Yahoo cannot claim/approve/reject its own submissions (0 available).
 *   - Gmail can see and claim all 23 (23 available).
 *
 * Whether the 23 production records are actually attributed to the Yahoo UUID
 * remains unverified (requires a production DB query; see
 * docs/investigations/moderation-ownership-inconsistency.md).
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Module mocks (must be hoisted before any import of the real modules)
// ---------------------------------------------------------------------------

const redirectMock = vi.fn((url: string) => {
  throw new Error(`REDIRECT:${url}`);
});
const revalidatePathMock = vi.fn();
const supabaseServerMock = vi.fn();
const supabaseServiceMock = vi.fn();
const getModerationGateStatusMock = vi.fn();
const logDebugMock = vi.fn();

vi.mock("next/navigation", () => ({ redirect: redirectMock }));
vi.mock("next/cache", () => ({ revalidatePath: revalidatePathMock }));
vi.mock("@/lib/supabase-server", () => ({ supabaseServer: supabaseServerMock }));
vi.mock("@/lib/supabase-service", () => ({ supabaseService: supabaseServiceMock }));
vi.mock("@/lib/moderation-guards", () => ({
  getModerationGateStatus: getModerationGateStatusMock,
}));
vi.mock("@/lib/log", () => ({ logDebug: logDebugMock }));
vi.mock("@/lib/indexnow", () => ({
  notifyIndexNow: vi.fn(),
  companyIndexNowUrl: vi.fn(() => "https://example.test/indexnow"),
}));
vi.mock("@/lib/getAssignedModerationItems", () => ({
  getAssignedModerationItems: vi.fn(async () => []),
}));

// ---------------------------------------------------------------------------
// Shared IDs
// ---------------------------------------------------------------------------

const MODERATOR_ID = "aaaaaa00-0000-0000-0000-000000000001";
const SUBMITTER_ID = "bbbbbb00-0000-0000-0000-000000000002";
const EVIDENCE_ID = 42;
const LEADER_REQUEST_ID = 99;

// ---------------------------------------------------------------------------
// Query-builder helpers
//
// These track the filter calls made by the action under test so that tests
// can assert on the exact filter strings passed to the Supabase client —
// e.g. what was given to `.or()`.
// ---------------------------------------------------------------------------

type QueryState = {
  table: string;
  eqs: Array<[string, unknown]>;
  isFilters: Array<[string, unknown]>;
  orFilter: string | null;
  updatePayload: unknown;
  insertPayload: unknown;
};

function makeQuery(
  table: string,
  resolver: (state: QueryState, terminal: string) => unknown,
) {
  const state: QueryState = {
    table,
    eqs: [],
    isFilters: [],
    orFilter: null,
    updatePayload: undefined,
    insertPayload: undefined,
  };

  const q: Record<string, unknown> = {};
  const chain = () => q;

  q.select = () => chain();
  q.eq = (col: string, val: unknown) => { state.eqs.push([col, val]); return chain(); };
  q.is = (col: string, val: unknown) => { state.isFilters.push([col, val]); return chain(); };
  q.or = (filter: string) => { state.orFilter = filter; return chain(); };
  q.not = () => chain();
  q.order = () => chain();
  q.limit = () => chain();
  q.update = (payload: unknown) => { state.updatePayload = payload; return chain(); };
  q.insert = (payload: unknown) => { state.insertPayload = payload; return chain(); };
  q.maybeSingle = async () => resolver(state, "maybeSingle");
  q.single = async () => resolver(state, "single");
  q.then = <T, E>(
    ok?: ((v: unknown) => T | PromiseLike<T>) | null,
    fail?: ((r: unknown) => E | PromiseLike<E>) | null,
  ) => Promise.resolve(resolver(state, "then")).then(ok, fail);

  return q;
}

function makeServiceClient(
  resolver: (state: QueryState, terminal: string) => unknown,
) {
  return { from: (table: string) => makeQuery(table, resolver) };
}

function makeServerClient(userId: string | null) {
  return {
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: userId ? { id: userId } : null },
        error: null,
      })),
    },
    from: (table: string) =>
      makeQuery(table, (_s, _t) => ({ data: null, error: null })),
  };
}

// ---------------------------------------------------------------------------
// approveEvidence — self-moderation guard
// ---------------------------------------------------------------------------

describe("approveEvidence — self-moderation rule (real action code)", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("blocks approval when the moderator is the evidence submitter", async () => {
    supabaseServerMock.mockResolvedValue(makeServerClient(MODERATOR_ID));

    supabaseServiceMock.mockReturnValue(
      makeServiceClient((state, terminal) => {
        // fetchEvidenceMeta query: returns evidence owned by the same moderator
        if (state.table === "evidence" && terminal === "maybeSingle") {
          return {
            data: {
              user_id: MODERATOR_ID,          // <-- owner == moderator
              assigned_moderator_id: null,
              evidence_type: "misconduct",
            },
            error: null,
          };
        }
        return { data: null, error: null };
      }),
    );

    const { approveEvidence } = await import("../app/moderation/actions");
    const fd = new FormData();
    fd.set("evidence_id", String(EVIDENCE_ID));
    fd.set("severity", "medium");

    const result = await approveEvidence(fd);
    expect(result).toEqual({
      ok: false,
      error: "Moderators cannot approve their own submissions.",
    });
  });

  it("allows approval when the evidence was submitted by a different user", async () => {
    supabaseServerMock.mockResolvedValue(makeServerClient(MODERATOR_ID));

    supabaseServiceMock.mockReturnValue(
      makeServiceClient((state, terminal) => {
        if (state.table === "evidence" && terminal === "maybeSingle") {
          return {
            data: {
              user_id: SUBMITTER_ID,           // <-- different user
              assigned_moderator_id: null,
              evidence_type: "misconduct",
            },
            error: null,
          };
        }
        // update, notification queries etc — return success
        return { data: null, error: null };
      }),
    );

    const { approveEvidence } = await import("../app/moderation/actions");
    const fd = new FormData();
    fd.set("evidence_id", String(EVIDENCE_ID));
    fd.set("severity", "medium");

    const result = await approveEvidence(fd);
    expect(result.ok).toBe(true);
  });

  it("allows approval when evidence user_id is null (imported / no owner)", async () => {
    supabaseServerMock.mockResolvedValue(makeServerClient(MODERATOR_ID));

    supabaseServiceMock.mockReturnValue(
      makeServiceClient((state, terminal) => {
        if (state.table === "evidence" && terminal === "maybeSingle") {
          return {
            data: {
              user_id: null,                   // <-- no owner
              assigned_moderator_id: null,
              evidence_type: "misconduct",
            },
            error: null,
          };
        }
        return { data: null, error: null };
      }),
    );

    const { approveEvidence } = await import("../app/moderation/actions");
    const fd = new FormData();
    fd.set("evidence_id", String(EVIDENCE_ID));
    fd.set("severity", "medium");

    const result = await approveEvidence(fd);
    expect(result.ok).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// rejectEvidence — self-moderation guard
// ---------------------------------------------------------------------------

describe("rejectEvidence — self-moderation rule (real action code)", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("blocks rejection when the moderator is the evidence submitter", async () => {
    supabaseServerMock.mockResolvedValue(makeServerClient(MODERATOR_ID));

    supabaseServiceMock.mockReturnValue(
      makeServiceClient((state, terminal) => {
        if (state.table === "evidence" && terminal === "maybeSingle") {
          return {
            data: {
              user_id: MODERATOR_ID,
              assigned_moderator_id: null,
              evidence_type: "misconduct",
            },
            error: null,
          };
        }
        return { data: null, error: null };
      }),
    );

    const { rejectEvidence } = await import("../app/moderation/actions");
    const fd = new FormData();
    fd.set("evidence_id", String(EVIDENCE_ID));
    fd.set("moderator_note", "Not relevant");

    const result = await rejectEvidence(fd);
    expect(result).toEqual({
      ok: false,
      error: "Moderators cannot reject their own submissions.",
    });
  });

  it("allows rejection when the evidence was submitted by a different user", async () => {
    supabaseServerMock.mockResolvedValue(makeServerClient(MODERATOR_ID));

    supabaseServiceMock.mockReturnValue(
      makeServiceClient((state, terminal) => {
        if (state.table === "evidence" && terminal === "maybeSingle") {
          return {
            data: {
              user_id: SUBMITTER_ID,
              assigned_moderator_id: null,
              evidence_type: "misconduct",
            },
            error: null,
          };
        }
        return { data: null, error: null };
      }),
    );

    const { rejectEvidence } = await import("../app/moderation/actions");
    const fd = new FormData();
    fd.set("evidence_id", String(EVIDENCE_ID));
    fd.set("moderator_note", "Does not meet policy.");

    const result = await rejectEvidence(fd);
    expect(result.ok).toBe(true);
  });

  it("allows rejection when evidence user_id is null (imported / no owner)", async () => {
    supabaseServerMock.mockResolvedValue(makeServerClient(MODERATOR_ID));

    supabaseServiceMock.mockReturnValue(
      makeServiceClient((state, terminal) => {
        if (state.table === "evidence" && terminal === "maybeSingle") {
          return {
            data: {
              user_id: null,
              assigned_moderator_id: null,
              evidence_type: "misconduct",
            },
            error: null,
          };
        }
        return { data: null, error: null };
      }),
    );

    const { rejectEvidence } = await import("../app/moderation/actions");
    const fd = new FormData();
    fd.set("evidence_id", String(EVIDENCE_ID));
    fd.set("moderator_note", "Does not meet policy.");

    const result = await rejectEvidence(fd);
    expect(result.ok).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// assignNextLeaderTenureRequest — self-exclusion filter verification
//
// These tests verify that the real action passes the correct self-exclusion
// string to .or() on every invocation. If the filter is removed or its string
// changes, the tests fail on the spy assertion — before any data changes.
// ---------------------------------------------------------------------------

describe("assignNextLeaderTenureRequest — self-exclusion filter (real action code)", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    getModerationGateStatusMock.mockResolvedValue({ allowed: true });
  });

  it("passes the self-exclusion filter to the leader_tenure_requests query", async () => {
    supabaseServerMock.mockResolvedValue(makeServerClient(MODERATOR_ID));

    // Capture the .or() argument by recording it in a closure variable
    let capturedOrFilter: string | null = null;

    supabaseServiceMock.mockReturnValue(
      makeServiceClient((state, terminal) => {
        if (state.table === "leader_tenure_requests" && terminal === "maybeSingle") {
          capturedOrFilter = state.orFilter;
          // Return no pending item so the action redirects away cleanly
          return { data: null, error: null };
        }
        return { data: null, error: null };
      }),
    );

    const { assignNextLeaderTenureRequest } = await import(
      "../app/moderation/leader-tenure-requests/actions"
    );

    // The action redirects when nothing is found; that's the expected path here
    await expect(assignNextLeaderTenureRequest()).rejects.toThrow(/REDIRECT:/);

    // The critical assertion: the self-exclusion filter must be present
    expect(capturedOrFilter).not.toBeNull();
    expect(capturedOrFilter).toContain(`user_id.neq.${MODERATOR_ID}`);
    expect(capturedOrFilter).toContain("user_id.is.null");
  });

  it("redirects away (no item claimed) when the only pending item is owned by the moderator", async () => {
    supabaseServerMock.mockResolvedValue(makeServerClient(MODERATOR_ID));

    supabaseServiceMock.mockReturnValue(
      makeServiceClient((state, terminal) => {
        if (state.table === "leader_tenure_requests" && terminal === "maybeSingle") {
          // Simulate: the query with the self-exclusion filter finds nothing
          // (the one pending item is owned by the moderator, so it's excluded)
          return { data: null, error: null };
        }
        return { data: null, error: null };
      }),
    );

    const { assignNextLeaderTenureRequest } = await import(
      "../app/moderation/leader-tenure-requests/actions"
    );

    await expect(assignNextLeaderTenureRequest()).rejects.toThrow("REDIRECT:/moderation");
  });

  it("redirects to the item when a pending item owned by a different user is available", async () => {
    supabaseServerMock.mockResolvedValue(makeServerClient(MODERATOR_ID));

    supabaseServiceMock.mockReturnValue(
      makeServiceClient((state, terminal) => {
        if (state.table === "leader_tenure_requests" && terminal === "maybeSingle") {
          // Return a pending item owned by someone else — action should claim it
          return { data: { id: LEADER_REQUEST_ID }, error: null };
        }
        if (state.table === "leader_tenure_requests" && terminal === "then") {
          // The optimistic UPDATE (sets assigned_moderator_id) — succeed silently
          return { data: null, error: null };
        }
        return { data: null, error: null };
      }),
    );

    const { assignNextLeaderTenureRequest } = await import(
      "../app/moderation/leader-tenure-requests/actions"
    );

    await expect(assignNextLeaderTenureRequest()).rejects.toThrow(
      `REDIRECT:/moderation/leader-tenure-requests/${LEADER_REQUEST_ID}`,
    );
  });

  it("treats pending items with null user_id as claimable (no owner exclusion applies)", async () => {
    supabaseServerMock.mockResolvedValue(makeServerClient(MODERATOR_ID));

    supabaseServiceMock.mockReturnValue(
      makeServiceClient((state, terminal) => {
        if (state.table === "leader_tenure_requests" && terminal === "maybeSingle") {
          // Null-owner item — the .or() filter includes user_id.is.null so
          // this item is returned (i.e., claimable)
          return { data: { id: LEADER_REQUEST_ID }, error: null };
        }
        return { data: null, error: null };
      }),
    );

    const { assignNextLeaderTenureRequest } = await import(
      "../app/moderation/leader-tenure-requests/actions"
    );

    await expect(assignNextLeaderTenureRequest()).rejects.toThrow(
      `REDIRECT:/moderation/leader-tenure-requests/${LEADER_REQUEST_ID}`,
    );
  });
});
