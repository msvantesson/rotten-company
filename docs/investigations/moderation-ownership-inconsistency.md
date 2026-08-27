# Investigation: potential moderation ownership/counting inconsistency

**Status:** partially verified — Yahoo account UUID and one record confirmed;
full 23-record ownership scan and live RPC body still needed  
**No functional change is included in this document or in this PR.**

---

## Observed behaviour

During production verification with two accounts:

| Account | Total pending | Available excluding yours |
|---|---|---|
| `svante01@gmail.com` | 23 | 23 |
| `svante01@yahoo.com` | 23 | 0 |

The "Available excluding yours" count is computed in `app/moderation/page.tsx` as:

```
status = 'pending'
AND assigned_moderator_id IS NULL
AND (user_id IS NULL OR user_id != <authenticated moderator UUID>)
```

The same filter is applied to `evidence`, `company_requests`, and
`leader_tenure_requests`.

---

## What this may mean

- **Consistent and correct:** If the Yahoo account genuinely submitted all 23
  pending records, the display is accurate. The Gmail account sees all 23 as
  available because it owns none of them.

- **Inconsistent attribution:** If some or all of the 23 records were
  incorrectly attributed to the Yahoo UUID (e.g. due to a historical import or
  ownership-assignment bug), the display count and the claim RPC would both
  exclude items that should be claimable by Yahoo — silently preventing that
  account from moderating.

---

## Production data inspected so far

### Yahoo account UUID (confirmed)

Running the following query against production:

```sql
WITH all_submissions AS (
  SELECT 'evidence'              AS submission_type, id::text AS submission_id,
         user_id, status::text, created_at FROM public.evidence
  UNION ALL
  SELECT 'company_request',      id::text, user_id, status::text, created_at
         FROM public.company_requests
  UNION ALL
  SELECT 'leader_tenure_request', id::text, user_id, status::text, created_at
         FROM public.leader_tenure_requests
)
SELECT s.*, u.email AS creator_email,
       CASE
         WHEN lower(u.email) = 'svante01@yahoo.com' THEN 'YES — Yahoo account created it'
         WHEN u.email IS NULL                        THEN 'No creator email found'
         ELSE                                             'NO — created by another account'
       END AS result
FROM all_submissions s
LEFT JOIN auth.users u ON u.id = s.user_id
ORDER BY s.created_at DESC
LIMIT 1;
```

Result (single row, most-recent submission only):

```json
{
  "submission_type": "evidence",
  "submission_id": "1351",
  "status": "pending",
  "created_at": "2026-08-27 07:34:24.750901+00",
  "creator_user_id": "64f825ed-5420-499e-9f1d-e238b26d8611",
  "creator_email": "svante01@yahoo.com",
  "result": "YES — Yahoo account created it"
}
```

**What this proves:**
- Yahoo account UUID: `64f825ed-5420-499e-9f1d-e238b26d8611`
- The most recent pending evidence record (`id = 1351`) was created by that
  account.

**What this does NOT prove:**
- Whether all remaining 22 pending records also have
  `user_id = 64f825ed-5420-499e-9f1d-e238b26d8611`. The query used `LIMIT 1`
  and returns only the single most-recent row.

---

## What has been verified

**By static code inspection:**

- `app/moderation/page.tsx` applies the self-exclusion filter consistently
  across all three content types (evidence, company\_requests,
  leader\_tenure\_requests).
- `app/moderation/leader-tenure-requests/actions.ts`
  (`assignNextLeaderTenureRequest`) uses the identical `(user_id IS NULL OR
  user_id != userId)` filter when selecting the next item to assign.
- `approveEvidence` and `rejectEvidence` in `app/moderation/actions.ts` reject
  with an error when the authenticated moderator UUID matches the evidence
  `user_id`.
- The TypeScript-side count queries and the TypeScript-side assignment/approval
  actions are therefore consistent with each other.

**By automated tests** (`__tests__/moderation-self-review.test.ts`):

- `approveEvidence` returns `{ ok: false }` when moderator == submitter, and
  `{ ok: true }` when they are different or when `user_id` is null.
- `rejectEvidence` behaves identically.
- `assignNextLeaderTenureRequest` passes `user_id.neq.<moderatorId>` and
  `user_id.is.null` to its `.or()` filter on every invocation; removing or
  changing that string causes the test to fail.
- When only own items are pending (the query returns nothing due to the filter),
  the action redirects to `/moderation` without claiming anything.
- Items with `user_id = null` are returned by the filter and are claimable.

**By production query (partial):**

- Yahoo account UUID confirmed: `64f825ed-5420-499e-9f1d-e238b26d8611`
- The most-recent pending record (`evidence id 1351`) is owned by that account.

---

## What has NOT been verified

1. **Full ownership scan of all 23 pending records** — only the single most
   recent row was returned (`LIMIT 1`). Run without the limit to confirm all 23:
   ```sql
   SELECT 'evidence'              AS source, id, user_id, status, created_at
     FROM evidence         WHERE status = 'pending' AND assigned_moderator_id IS NULL
   UNION ALL
   SELECT 'company_requests',     id, user_id, status, created_at
     FROM company_requests WHERE status = 'pending' AND assigned_moderator_id IS NULL
   UNION ALL
   SELECT 'leader_tenure_requests', id, user_id, status, created_at
     FROM leader_tenure_requests WHERE status = 'pending' AND assigned_moderator_id IS NULL
   ORDER BY source, created_at;
   ```
   Expected result if attribution is correct: all 23 rows have
   `user_id = '64f825ed-5420-499e-9f1d-e238b26d8611'`.

2. **Live `claim_next_moderation_item` definition** — the `CREATE FUNCTION`
   body is absent from this repository's migration history. Only an
   `ALTER FUNCTION ... SET search_path` migration exists
   (`supabase/migrations/20260311000000_fix_function_search_path_mutable.sql`).
   Required retrieval (connect to production Postgres):
   ```sql
   SELECT prosrc FROM pg_proc WHERE proname = 'claim_next_moderation_item';
   ```
   Or via `psql`:
   ```
   \df+ claim_next_moderation_item
   ```

3. **RPC self-exclusion behaviour** — it is unknown whether the live RPC
   applies `user_id != p_moderator_id`. If it does not, a moderator who owns
   all pending items would see 0 in the count display (correct) but the RPC
   could still assign one of their own items to them (a self-moderation
   bypass).

---

## Required follow-up steps (before any fix PR)

1. Re-run the ownership query above **without** `LIMIT 1` and confirm that
   all 23 pending records have `user_id = '64f825ed-5420-499e-9f1d-e238b26d8611'`.
   - If all 23 match → ownership is correct; the 0/23 display is accurate.
   - If some do not match → attribution is incorrect; a backfill migration is
     needed.

2. Retrieve the live `claim_next_moderation_item` function body and compare
   its eligibility predicate to the TypeScript count query.
   - If the RPC applies `user_id != p_moderator_id` → TypeScript and SQL layers
     are consistent; no fix needed unless attribution is wrong.
   - If the RPC does NOT apply this filter → a focused SQL migration is needed,
     plus a database-level test (seeded schema) validating atomic assignment,
     self-exclusion, null-owner claimability, and all three content types.

3. Open a separate fix PR only if step 1 or step 2 identifies a genuine bug.

---

## Self-moderation protection (current state)

The following safeguards exist in the TypeScript layer and must not be weakened
by any future fix:

- `approveEvidence` / `rejectEvidence` in `app/moderation/actions.ts` check
  `ownerId === moderatorId` and return an error if they match.
- `assignNextLeaderTenureRequest` excludes `user_id = userId` in its SELECT.
- The displayed "Available excluding yours" count excludes items owned by the
  viewing moderator.

Whether the SQL RPC enforces the same constraint independently remains
unverified (see point 3 above).

