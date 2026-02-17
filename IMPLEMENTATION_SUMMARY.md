# CEO Staging Implementation Summary

## Overview
This implementation adds optional CEO staging to company request flows, allowing users to optionally submit CEO information when requesting a new company. The CEO data is staged in a separate table and materialized (created in the main leaders and leader_tenures tables) when a moderator approves the company request.

## Changes Made

### 1. Database Schema (Migration SQL)
**File:** `supabase/migrations/add_ceo_staging.sql`

Added:
- `company_request_leader_tenures` table for staging CEO information
- `linkedin_url` column to `leaders` table
- `role` column to `leader_tenures` table (if not exists)

Key features:
- Foreign key to `company_requests` with CASCADE delete
- CHECK constraint: `ended_at >= started_at` when provided
- Index on `company_request_id` for efficient lookups during approval

### 2. Client-Side Form Updates

#### File: `app/company/request/request-client.tsx`
Added optional CEO section with:
- CEO Name field (text input)
- CEO LinkedIn URL field (URL input)
- CEO Start Date field (date input with helper text "Defaults to today if not specified")

Form submission now includes:
```typescript
{
  // ... existing fields
  ceo_name: ceoName.trim() || null,
  ceo_linkedin_url: ceoLinkedinUrl.trim() || null,
  ceo_started_at: ceoStartedAt.trim() || null,
}
```

#### File: `app/submit-company/page.tsx`
Added optional CEO section (server-rendered form) with same fields as above.

### 3. API Route Updates

#### File: `app/api/company/request/route.ts`
- Accepts optional CEO fields from request body
- Validates `ceo_started_at` format (YYYY-MM-DD) if provided
- Inserts into `company_request_leader_tenures` ONLY if `ceo_name` is present
- Defaults `started_at` to today if not provided
- Does not fail the entire request if CEO staging insert fails (logs error but continues)

#### File: `app/submit-company/actions.ts`
- Extracts CEO fields from FormData
- Fetches company_request.id after insert using `.select("id").single()`
- Inserts CEO staging data if `ceoName` is present
- Same defensive behavior as API route

### 4. Moderation Approval Logic

#### File: `app/api/moderation/company-requests/approve/route.ts`

Added `normalizeLinkedinUrl()` utility function to trim and remove trailing slashes.

**New materialization flow (after company creation, before request status update):**

1. Fetch staged CEO tenures for the approved request
2. For each staged CEO:
   - **Defensive check**: Verify no active CEO tenure already exists for the company
     - If exists, return `409 Conflict` with clear error message
   - **Find or create leader:**
     - Try to match by `linkedin_url` (normalized, exact match)
     - Fall back to matching by slugified name
     - Create new leader if no match found (includes `linkedin_url` in insert)
   - **Create leader tenure:**
     - `started_at`: Use staged value or default to today (NOT NULL requirement)
     - `ended_at`: null (active tenure)
     - `role`: 'ceo' or staged role

**Key implementation details:**
- LinkedIn URL matching uses simple normalization (trim + remove trailing slash)
- Leader creation includes `linkedin_url` field (only when creating new)
- Tenure `started_at` is guaranteed NOT NULL (defaults to today defensively)
- 409 error prevents replacing existing active CEO

## Testing Considerations

### Scenarios to Test:
1. ✅ Submit company request without CEO info → Should succeed, no staging row created
2. ✅ Submit company request with CEO name only → Should stage with defaults
3. ✅ Submit company request with full CEO info → Should stage all fields
4. ✅ Approve request without staged CEO → Should work as before
5. ✅ Approve request with staged CEO → Should materialize leader + tenure
6. ✅ Date validation: Invalid `started_at` format → Should return 400
7. ✅ Duplicate CEO check: Try to add CEO when one exists → Should return 409

### Edge Cases Handled:
- Empty/blank CEO name is treated as "no CEO" (no staging row created)
- Missing `started_at` defaults to today's date
- CEO staging insert failure doesn't fail the entire company request
- LinkedIn URL matching is case-sensitive and requires exact match after normalization
- Leader slug conflicts are handled by existing logic (not modified)

## Validation Logic

### Date Format Validation
```typescript
if (ceoStartedAt && !/^\d{4}-\d{2}-\d{2}$/.test(ceoStartedAt)) {
  return new NextResponse("Invalid CEO start date format (use YYYY-MM-DD)", {
    status: 400,
  });
}
```

### Database-Level Validation
```sql
CONSTRAINT valid_tenure_dates CHECK (ended_at IS NULL OR ended_at >= started_at)
```

## UI Changes

### Before (Original Form)
```
Company Request Form
├── Name *
├── Country
├── Website
├── Description
└── Why *
```

### After (With CEO Section)
```
Company Request Form
├── Name *
├── Country
├── Website
├── Description
├── Why *
└── CEO Information (Optional)
    ├── CEO Name
    ├── CEO LinkedIn URL
    └── CEO Start Date (defaults to today)
```

## Minimal Change Approach

This implementation follows the principle of minimal changes:
- No modifications to existing company request flow when CEO is not provided
- Reuses existing patterns (slugify, moderation logging, defensive checks)
- Doesn't modify unrelated code or fix unrelated linting issues
- Maintains backward compatibility (all CEO fields are optional)
- Follows existing code style and error handling patterns

## Security Considerations

1. **Input Validation**: Date format validated before database insert
2. **Database Constraints**: CHECK constraint on tenure dates at DB level
3. **Defensive Checks**: Prevents duplicate active CEO tenures (409 response)
4. **Null Safety**: All optional fields handled with null coalescing
5. **Error Isolation**: CEO staging failures don't cascade to company request
