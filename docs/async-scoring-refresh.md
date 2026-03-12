# Async Scoring Refresh

## Overview

Company scoring is based on materialized views. Refreshing those views on every evidence submission caused timeouts and 500 errors. This document describes the async dirty-flag approach that replaced synchronous refresh.

## Why we moved away from Vercel Cron

Vercel's Hobby plan does not support cron schedules more frequent than once per day (`0 0 * * *`). The `*/5 * * * *` schedule required for near-real-time scoring updates is only available on Vercel Pro and above.

**Solution:** GitHub Actions scheduled workflows (which support any valid cron expression, including `*/5 * * * *`) call a protected Next.js endpoint every 5 minutes to trigger the refresh.

## How the dirty-flag works

1. **Trigger on evidence change:** The DB trigger `trg_mark_scoring_dirty_on_evidence` fires after any `INSERT`, `UPDATE`, `DELETE`, or `TRUNCATE` on the `public.evidence` table and calls `public.mark_scoring_dirty()`, setting `public.scoring_refresh_state.dirty = true`.

2. **Periodic refresh:** Every 5 minutes the GitHub Actions workflow calls `GET /api/cron/refresh-scoring`. The endpoint validates the `X-Cron-Secret` header and then invokes the Supabase Edge Function `refresh_scoring_if_dirty`.

3. **Edge Function:** `refresh_scoring_if_dirty` runs `SELECT public.refresh_scoring_if_dirty();` using the service role. That DB function checks `dirty`; if `true`, it refreshes all scoring materialized views and resets `dirty = false`.

4. **No-op when clean:** If no evidence has changed since the last refresh, `dirty` is `false` and the DB function returns immediately — no unnecessary work.

### DB objects (already applied in Supabase, not managed by repo migrations)

| Object | Type | Purpose |
|---|---|---|
| `trg_mark_scoring_dirty_on_evidence` | Trigger (ENABLED) | Sets `dirty=true` on evidence changes |
| `trg_refresh_scoring_on_evidence` | Trigger (DISABLED) | Legacy sync refresh — kept disabled |
| `public.scoring_refresh_state` | Table | Single-row dirty flag |
| `public.mark_scoring_dirty()` | Function | Sets `dirty=true` |
| `public.refresh_scoring_if_dirty()` | Function | Refreshes matviews if dirty |

## Required secrets

### Vercel environment variables

| Variable | Description |
|---|---|
| `CRON_SECRET` | Shared secret checked by `GET /api/cron/refresh-scoring`. Must match the GitHub Actions secret below. |
| `SUPABASE_URL` | Your Supabase project URL (e.g. `https://<ref>.supabase.co`). |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key — allows calling the Edge Function with service privileges. |

### GitHub Actions secrets

| Secret | Description |
|---|---|
| `CRON_SECRET` | Same value as the Vercel `CRON_SECRET` env var. |

## Supabase Edge Function: `refresh_scoring_if_dirty`

This Edge Function must be created manually in the Supabase dashboard (or via the Supabase CLI).

### Create via Supabase UI

1. Go to your Supabase project → **Edge Functions** → **New Function**.
2. Name it `refresh_scoring_if_dirty`.
3. Paste the following code:

```typescript
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  // Only POST accepted (GitHub Actions cron calls POST)
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );

  const { error } = await supabase.rpc("refresh_scoring_if_dirty");
  if (error) {
    console.error("refresh_scoring_if_dirty error:", error);
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
```

4. Deploy the function.
5. No additional secrets are needed — Supabase injects `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` automatically.

> **Access control:** The function is called with `Authorization: Bearer <service_role_key>` from the Next.js route. Supabase Edge Functions reject requests without a valid Bearer token by default, so it is not publicly accessible.

## Architecture diagram

```
Evidence change in DB
        │
        ▼
trg_mark_scoring_dirty_on_evidence
        │
        ▼
scoring_refresh_state.dirty = true
        │
     (every 5 min)
        │
        ▼
GitHub Actions workflow
refresh_scoring_if_dirty.yml
        │  (outgoing: GET with X-Cron-Secret header)
        ▼
/api/cron/refresh-scoring  ← accepts GET, validates X-Cron-Secret
        │  (outgoing: POST with Authorization: Bearer service_role_key)
        ▼
Supabase Edge Function: refresh_scoring_if_dirty
        │
        ▼
SELECT public.refresh_scoring_if_dirty()
(refreshes matviews, sets dirty=false)
```

## Testing

1. Set `dirty = true` manually:
   ```sql
   UPDATE public.scoring_refresh_state SET dirty = true WHERE id = true;
   ```

2. Trigger the endpoint:
   ```bash
   curl -f -X GET \
     -H "X-Cron-Secret: <your-secret>" \
     https://rotten-company.com/api/cron/refresh-scoring
   ```

3. Verify `dirty` is back to `false`:
   ```sql
   SELECT dirty, dirty_since, last_refresh_error
   FROM public.scoring_refresh_state
   WHERE id = true;
   ```

4. Verify scores updated by checking `score_recalculation_logs` or the materialized views.

## Rollback plan

If the async refresh causes issues:

1. **Re-enable the sync trigger** in Supabase SQL editor:
   ```sql
   ALTER TABLE public.evidence ENABLE TRIGGER trg_refresh_scoring_on_evidence;
   ALTER TABLE public.evidence DISABLE TRIGGER trg_mark_scoring_dirty_on_evidence;
   ```

2. **Disable the GitHub Actions workflow** by removing or commenting out the `schedule` block in `.github/workflows/refresh_scoring_if_dirty.yml`.

3. The Next.js endpoint `/api/cron/refresh-scoring` will simply go unused — it is harmless to leave in place.
