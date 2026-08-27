# Investigation: potential moderation ownership/counting inconsistency

**Status:** open — production data not yet inspected  
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

**Neither interpretation can be confirmed without inspecting production data.**

---

## What has been verified (by code inspection only)

- `app/moderation/page.tsx` applies the self-exclusion filter consistently
  across all three content types (evidence, company\_requests,
  leader\_tenure\_requests).
- `app/moderation/leader-tenure-requests/actions.ts`
  (`assignNextLeaderTenureRequest`) uses the identical `(user_id IS NULL OR
  user_id != userId)` filter when selecting the next item to assign.
- The TypeScript-side count queries and the TypeScript-side assignment action
  are therefore consistent with each other.

---

## What has NOT been verified

1. **Yahoo account UUID** — the authenticated UUID for `svante01@yahoo.com` has
   not been retrieved from `auth.users`.

2. **Ownership of the 23 records** — the `user_id` values of the 23 pending
   records, and which table(s) they live in, have not been queried.  
   Required query (run as service role):
   ```sql
   SELECT 'evidence'         AS source, id, user_id, created_at FROM evidence         WHERE status = 'pending' AND assigned_moderator_id IS NULL
   UNION ALL
   SELECT 'company_requests' AS source, id, user_id, created_at FROM company_requests WHERE status = 'pending' AND assigned_moderator_id IS NULL
   UNION ALL
   SELECT 'leader_tenure_requests' AS source, id, user_id, created_at FROM leader_tenure_requests WHERE status = 'pending' AND assigned_moderator_id IS NULL
   ORDER BY source, created_at;
   ```

3. **Live `claim_next_moderation_item` definition** — the `CREATE FUNCTION`
   body is absent from this repository's migration history. Only an
   `ALTER FUNCTION ... SET search_path` migration exists
   (`supabase/migrations/20260311000000_fix_function_search_path_mutable.sql`).  
   Required retrieval (connect to production Postgres):
   ```sql
   SELECT prosrc
   FROM   pg_proc
   WHERE  proname = 'claim_next_moderation_item';
   ```
   Or via `psql`:
   ```
   \df+ claim_next_moderation_item
   ```

4. **RPC self-exclusion behaviour** — it is unknown whether the live RPC
   applies `user_id != p_moderator_id`. If it does not, a moderator who owns
   all pending items would see 0 in the count display (correct) but the RPC
   could still assign one of their own items to them (a self-moderation
   bypass).

---

## Required follow-up steps (before any fix PR)

1. Obtain the Yahoo account's auth UUID from `auth.users` where
   `email = 'svante01@yahoo.com'`.

2. Run the query above to list all 23 pending records and their `user_id`
   values. Compare each to the Yahoo UUID.
   - If all 23 match → ownership is correct; the display is accurate.
   - If some or all do not match → attribution is incorrect; a backfill
     migration is needed before or alongside any fix.

3. Retrieve the live `claim_next_moderation_item` function body and compare
   its eligibility predicate to the TypeScript count query.
   - If the RPC applies `user_id != p_moderator_id` → the TypeScript and SQL
     layers are consistent; no fix needed unless attribution is wrong.
   - If the RPC does NOT apply this filter → a focused SQL migration is needed
     to add it, and a database-level test (using a seeded schema) must be
     added to validate: atomic assignment, self-exclusion, null-owner
     claimability, and correct handling of all three content types.

4. Open a separate fix PR only if step 2 or step 3 identifies a genuine bug.

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
unverified (see point 4 above).
