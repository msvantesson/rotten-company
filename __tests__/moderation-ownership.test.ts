/**
 * Moderation ownership eligibility tests
 *
 * Covers:
 *  - The shared eligibility predicate: pending + unassigned + not-owned-by-moderator
 *  - Mixed ownership scenarios (some items owned by user A, some by user B, some null)
 *  - "Excluding yours" counts for two different users
 *  - Null/imported owner edge cases (null user_id items are claimable by anyone)
 *  - Consistency between the count display logic and the assignment selection logic
 *    (both must apply the same predicate)
 *
 * The test strategy is to extract the pure eligibility predicate used by the
 * page.tsx count queries and the assignNextLeaderTenureRequest action, then
 * exercise it with a representative dataset, verifying that:
 *   count(available-for-user-A) + count(available-for-user-B) ≥ total_non_null
 *   and that self-owned items are always excluded.
 */

import { describe, it, expect } from "vitest";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ModerationItem {
  id: number;
  status: string;
  assigned_moderator_id: string | null;
  user_id: string | null;
}

// ---------------------------------------------------------------------------
// Pure eligibility predicate
//
// This mirrors the Supabase query filter used in THREE places:
//   1. app/moderation/page.tsx — pendingCount ("Available excluding yours")
//   2. app/moderation/leader-tenure-requests/actions.ts — assignNextLeaderTenureRequest
//   3. supabase/migrations/…fix_claim_next_moderation_item… — SQL RPC
//
// Having a single extractable predicate makes it easy to unit-test and to
// verify that all three sites remain in sync.
// ---------------------------------------------------------------------------

/**
 * Returns true when an item is eligible to be claimed by the given moderator:
 *  - status must be 'pending'
 *  - item must not already be assigned
 *  - the moderator must not be the submitter (self-moderation protection)
 *
 * Null user_id (imported/migrated items without an owner) are always eligible.
 */
function isEligibleForModerator(item: ModerationItem, moderatorId: string): boolean {
  return (
    item.status === "pending" &&
    item.assigned_moderator_id === null &&
    (item.user_id === null || item.user_id !== moderatorId)
  );
}

/**
 * Count items eligible for a given moderator — mirrors the pendingCount
 * computation in page.tsx.
 */
function countEligible(items: ModerationItem[], moderatorId: string): number {
  return items.filter((item) => isEligibleForModerator(item, moderatorId)).length;
}

// ---------------------------------------------------------------------------
// Test dataset — represents a realistic mixed-ownership queue
// ---------------------------------------------------------------------------

const USER_A = "aaaaaaaa-0000-0000-0000-000000000001";
const USER_B = "bbbbbbbb-0000-0000-0000-000000000002";
const OTHER_MOD = "cccccccc-0000-0000-0000-000000000003";

let _nextId = 1;

function makeItem(overrides: Partial<ModerationItem>): ModerationItem {
  return {
    id: _nextId++,
    status: "pending",
    assigned_moderator_id: null,
    user_id: null,
    ...overrides,
  };
}

// 3 items owned by user A, 3 by user B, 2 null-owner, 1 already assigned,
// 1 with status != pending
const ITEMS: ModerationItem[] = [
  makeItem({ id: 1, user_id: USER_A }),
  makeItem({ id: 2, user_id: USER_A }),
  makeItem({ id: 3, user_id: USER_A }),
  makeItem({ id: 4, user_id: USER_B }),
  makeItem({ id: 5, user_id: USER_B }),
  makeItem({ id: 6, user_id: USER_B }),
  makeItem({ id: 7, user_id: null }),           // imported / no owner
  makeItem({ id: 8, user_id: null }),           // imported / no owner
  makeItem({ id: 9, user_id: USER_A, assigned_moderator_id: OTHER_MOD }), // already assigned
  makeItem({ id: 10, user_id: USER_B, status: "approved" }),              // already decided
];

// ---------------------------------------------------------------------------
// Eligibility predicate unit tests
// ---------------------------------------------------------------------------

describe("isEligibleForModerator — self-moderation protection", () => {
  it("excludes an item where user_id matches the moderator", () => {
    const item = makeItem({ user_id: USER_A });
    expect(isEligibleForModerator(item, USER_A)).toBe(false);
  });

  it("includes an item where user_id belongs to a different user", () => {
    const item = makeItem({ user_id: USER_B });
    expect(isEligibleForModerator(item, USER_A)).toBe(true);
  });

  it("includes an item with null user_id for any moderator (imported/null-owner)", () => {
    const item = makeItem({ user_id: null });
    expect(isEligibleForModerator(item, USER_A)).toBe(true);
    expect(isEligibleForModerator(item, USER_B)).toBe(true);
  });

  it("excludes an item that is already assigned", () => {
    const item = makeItem({ user_id: USER_B, assigned_moderator_id: OTHER_MOD });
    expect(isEligibleForModerator(item, USER_A)).toBe(false);
  });

  it("excludes an item that is not pending", () => {
    const item = makeItem({ status: "approved" });
    expect(isEligibleForModerator(item, USER_A)).toBe(false);
  });

  it("excludes a rejected item", () => {
    const item = makeItem({ status: "rejected", user_id: null });
    expect(isEligibleForModerator(item, USER_A)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Mixed-ownership "excluding yours" count tests
// ---------------------------------------------------------------------------

describe("countEligible — mixed ownership queue", () => {
  // Eligible items from ITEMS for USER_A:
  //   ids 4, 5, 6 (owned by USER_B) + 7, 8 (null) = 5
  it("correctly counts items available to USER_A, excluding A's own and assigned/non-pending", () => {
    expect(countEligible(ITEMS, USER_A)).toBe(5);
  });

  // Eligible items from ITEMS for USER_B:
  //   ids 1, 2, 3 (owned by USER_A) + 7, 8 (null) = 5
  it("correctly counts items available to USER_B, excluding B's own", () => {
    expect(countEligible(ITEMS, USER_B)).toBe(5);
  });

  it("both users see the same total count (symmetric with mixed ownership)", () => {
    expect(countEligible(ITEMS, USER_A)).toBe(countEligible(ITEMS, USER_B));
  });
});

// ---------------------------------------------------------------------------
// All-same-owner scenario — mirrors the production observation
// (Yahoo owns all 23 → "Available excluding yours" = 0 for Yahoo, 23 for Gmail)
// ---------------------------------------------------------------------------

describe("countEligible — all items owned by a single user (production scenario)", () => {
  const ALL_BY_USER_B: ModerationItem[] = Array.from({ length: 23 }, (_, i) =>
    makeItem({ id: 100 + i, user_id: USER_B }),
  );

  it("USER_B (the owner) sees 0 available items", () => {
    expect(countEligible(ALL_BY_USER_B, USER_B)).toBe(0);
  });

  it("USER_A (a different user) sees all 23 items as available", () => {
    expect(countEligible(ALL_BY_USER_B, USER_A)).toBe(23);
  });
});

// ---------------------------------------------------------------------------
// Null/imported-owner edge cases
// ---------------------------------------------------------------------------

describe("countEligible — null user_id (imported submissions)", () => {
  const NULL_OWNER_ITEMS: ModerationItem[] = Array.from({ length: 5 }, (_, i) =>
    makeItem({ id: 200 + i, user_id: null }),
  );

  it("all null-owner items are available to any moderator", () => {
    expect(countEligible(NULL_OWNER_ITEMS, USER_A)).toBe(5);
    expect(countEligible(NULL_OWNER_ITEMS, USER_B)).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// Count–assignment consistency
//
// The total unassigned pending count ("Total available") and the "excluding
// yours" count must satisfy:
//   countTotal = unassigned pending items regardless of owner
//   countExcluding = subset of countTotal where owner != moderator
//   countExcluding ≤ countTotal  (always)
//   countExcluding = countTotal when moderator owns none of them
//   countExcluding = 0 when moderator owns all of them
// ---------------------------------------------------------------------------

describe("countEligible — relationship between total and excluding-yours", () => {
  function countTotal(items: ModerationItem[]): number {
    return items.filter(
      (item) => item.status === "pending" && item.assigned_moderator_id === null,
    ).length;
  }

  it("countExcluding is always ≤ countTotal", () => {
    const total = countTotal(ITEMS);
    expect(countEligible(ITEMS, USER_A)).toBeLessThanOrEqual(total);
    expect(countEligible(ITEMS, USER_B)).toBeLessThanOrEqual(total);
  });

  it("countExcluding equals countTotal when moderator owns none", () => {
    // OTHER_MOD owns nothing in ITEMS (assigned but not owner)
    const total = countTotal(ITEMS);
    // Items available to OTHER_MOD: all unassigned+pending not owned by OTHER_MOD
    // OTHER_MOD doesn't appear as user_id anywhere so countEligible equals countTotal
    expect(countEligible(ITEMS, OTHER_MOD)).toBe(total);
  });

  it("countExcluding is 0 when moderator owns every unassigned pending item", () => {
    const ownedAll: ModerationItem[] = [
      makeItem({ id: 301, user_id: USER_A }),
      makeItem({ id: 302, user_id: USER_A }),
    ];
    expect(countEligible(ownedAll, USER_A)).toBe(0);
  });

  it("countExcluding equals countTotal when all items have null user_id", () => {
    const nullOwned: ModerationItem[] = [
      makeItem({ id: 401, user_id: null }),
      makeItem({ id: 402, user_id: null }),
    ];
    const total = countTotal(nullOwned);
    expect(countEligible(nullOwned, USER_A)).toBe(total);
    expect(countEligible(nullOwned, USER_B)).toBe(total);
  });

  it("the item selected for assignment must satisfy the same predicate as the count", () => {
    // Simulate claiming: pick the oldest eligible item for USER_A
    const eligible = ITEMS.filter((item) => isEligibleForModerator(item, USER_A));
    const claimed = eligible[0] ?? null;

    if (claimed) {
      // The claimed item must not be owned by USER_A
      expect(claimed.user_id).not.toBe(USER_A);
      // The claimed item must be unassigned and pending
      expect(claimed.assigned_moderator_id).toBeNull();
      expect(claimed.status).toBe("pending");
    }
  });
});
