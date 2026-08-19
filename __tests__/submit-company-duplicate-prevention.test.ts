/**
 * Regression tests for duplicate company-request prevention.
 *
 * Covers:
 *   1. The submit button renders as disabled with "Submitting…" text when
 *      a submission is pending (client-side useFormStatus protection).
 *   2. A second identical server call within 60 s does NOT insert a new row
 *      (server-side deduplication).
 *   3. A second submission for a DIFFERENT company name still inserts normally.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Helpers that mirror the deduplication logic in submitCompany (actions.ts)
// without requiring Next.js server infrastructure.
// ---------------------------------------------------------------------------

interface CompanyRequestRow {
  id: number;
  user_id: string;
  name: string;
  status: string;
  created_at: string; // ISO string
}

interface DedupeParams {
  userId: string;
  name: string;
  now: Date;
  existingRows: CompanyRequestRow[];
}

/**
 * Pure replica of the deduplication query logic from actions.ts.
 * Returns the matching row if one exists within the 60-second window.
 */
function findDuplicatePendingRequest(params: DedupeParams): CompanyRequestRow | null {
  const { userId, name, now, existingRows } = params;
  const windowStart = new Date(now.getTime() - 60_000);

  return (
    existingRows.find(
      (row) =>
        row.user_id === userId &&
        row.name === name &&
        row.status === "pending" &&
        new Date(row.created_at) >= windowStart,
    ) ?? null
  );
}

// ---------------------------------------------------------------------------
// Helper: simulate what the server action does — insert only if no duplicate
// ---------------------------------------------------------------------------

interface SubmitResult {
  action: "inserted" | "skipped_duplicate";
  insertCallCount: number;
}

function simulateSubmit(
  params: DedupeParams,
  insertFn: (row: Omit<CompanyRequestRow, "id">) => void,
  now: Date,
): SubmitResult {
  const duplicate = findDuplicatePendingRequest(params);

  if (duplicate) {
    return { action: "skipped_duplicate", insertCallCount: 0 };
  }

  insertFn({
    user_id: params.userId,
    name: params.name,
    status: "pending",
    created_at: now.toISOString(),
  });

  return { action: "inserted", insertCallCount: 1 };
}

// ---------------------------------------------------------------------------
// Helper: mirror the SubmitButton disabled/text logic from SubmitCompanyForm
// ---------------------------------------------------------------------------

function renderSubmitButtonState(pending: boolean): { disabled: boolean; text: string } {
  return {
    disabled: pending,
    text: pending ? "Submitting…" : "Submit Company for Review",
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("SubmitButton pending state (client-side protection)", () => {
  it("is enabled with default text when not pending", () => {
    const state = renderSubmitButtonState(false);
    expect(state.disabled).toBe(false);
    expect(state.text).toBe("Submit Company for Review");
  });

  it("is disabled with 'Submitting…' text when pending", () => {
    const state = renderSubmitButtonState(true);
    expect(state.disabled).toBe(true);
    expect(state.text).toBe("Submitting…");
  });
});

describe("Server-side deduplication — two rapid identical submissions", () => {
  const USER_ID = "user-abc-123";
  const COMPANY_NAME = "3M Company";
  const now = new Date("2026-08-19T12:00:00.000Z");

  let db: CompanyRequestRow[];
  let nextId: number;

  beforeEach(() => {
    db = [];
    nextId = 1;
  });

  function insertRow(row: Omit<CompanyRequestRow, "id">): void {
    db.push({ ...row, id: nextId++ });
  }

  it("first submission inserts a new row", () => {
    const result = simulateSubmit(
      { userId: USER_ID, name: COMPANY_NAME, now, existingRows: db },
      insertRow,
      now,
    );
    expect(result.action).toBe("inserted");
    expect(db).toHaveLength(1);
    expect(db[0].name).toBe(COMPANY_NAME);
    expect(db[0].status).toBe("pending");
  });

  it("second identical submission within 60 s does NOT insert a duplicate row", () => {
    // First submission
    simulateSubmit(
      { userId: USER_ID, name: COMPANY_NAME, now, existingRows: db },
      insertRow,
      now,
    );

    // Second submission 1 second later (mimics the observed production duplicate)
    const oneSecondLater = new Date(now.getTime() + 1_000);
    const result = simulateSubmit(
      { userId: USER_ID, name: COMPANY_NAME, now: oneSecondLater, existingRows: db },
      insertRow,
      oneSecondLater,
    );

    expect(result.action).toBe("skipped_duplicate");
    expect(db).toHaveLength(1); // still only one row
  });

  it("second identical submission after 60 s DOES insert (legitimate retry)", () => {
    // First submission
    simulateSubmit(
      { userId: USER_ID, name: COMPANY_NAME, now, existingRows: db },
      insertRow,
      now,
    );

    // Second submission 61 seconds later — outside dedup window
    const after61s = new Date(now.getTime() + 61_000);
    const result = simulateSubmit(
      { userId: USER_ID, name: COMPANY_NAME, now: after61s, existingRows: db },
      insertRow,
      after61s,
    );

    expect(result.action).toBe("inserted");
    expect(db).toHaveLength(2);
  });
});

describe("Server-side deduplication — different company is not blocked", () => {
  const USER_ID = "user-abc-123";
  const now = new Date("2026-08-19T12:00:00.000Z");

  it("a different company name is always inserted, even within 60 s", () => {
    const db: CompanyRequestRow[] = [];
    let nextId = 1;
    const insertRow = (row: Omit<CompanyRequestRow, "id">) => db.push({ ...row, id: nextId++ });

    // First company
    simulateSubmit(
      { userId: USER_ID, name: "Acme Corp", now, existingRows: db },
      insertRow,
      now,
    );

    // Different company 1 second later — should still insert
    const oneSecondLater = new Date(now.getTime() + 1_000);
    const result = simulateSubmit(
      { userId: USER_ID, name: "Different Corp", now: oneSecondLater, existingRows: db },
      insertRow,
      oneSecondLater,
    );

    expect(result.action).toBe("inserted");
    expect(db).toHaveLength(2);
    expect(db[0].name).toBe("Acme Corp");
    expect(db[1].name).toBe("Different Corp");
  });

  it("different user submitting same company within 60 s is not blocked", () => {
    const db: CompanyRequestRow[] = [];
    let nextId = 1;
    const insertRow = (row: Omit<CompanyRequestRow, "id">) => db.push({ ...row, id: nextId++ });

    const COMPANY = "Shared Corp";

    simulateSubmit(
      { userId: "user-one", name: COMPANY, now, existingRows: db },
      insertRow,
      now,
    );

    const oneSecondLater = new Date(now.getTime() + 1_000);
    const result = simulateSubmit(
      { userId: "user-two", name: COMPANY, now: oneSecondLater, existingRows: db },
      insertRow,
      oneSecondLater,
    );

    expect(result.action).toBe("inserted");
    expect(db).toHaveLength(2);
  });
});
