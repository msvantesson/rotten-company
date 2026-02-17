# Manual Testing Guide for CEO Staging Feature

This document provides step-by-step testing instructions for the CEO staging feature.

## Prerequisites

1. Database must have the migration applied (run `supabase/migrations/add_ceo_staging.sql`)
2. Application running with valid Supabase credentials
3. User account with moderator privileges for approval testing

## Test Scenarios

### Scenario 1: Submit Company Request WITHOUT CEO Information

**Endpoint:** `/company/request` or `/submit-company`

**Steps:**
1. Navigate to the company request form
2. Fill in ONLY the required company fields:
   - Name: "Test Company 1"
   - Why: "Test submission without CEO"
3. Leave ALL CEO fields empty/blank
4. Submit the form

**Expected Result:**
- ✅ Company request created successfully
- ✅ NO row created in `company_request_leader_tenures` table
- ✅ Verify in database:
  ```sql
  SELECT * FROM company_requests WHERE name = 'Test Company 1';
  -- Should have a record
  
  SELECT * FROM company_request_leader_tenures 
  WHERE company_request_id = '<request_id>';
  -- Should return 0 rows
  ```

---

### Scenario 2: Submit Company Request WITH CEO Name Only

**Endpoint:** `/company/request` or `/submit-company`

**Steps:**
1. Navigate to the company request form
2. Fill in company fields:
   - Name: "Test Company 2"
   - Why: "Test submission with CEO name only"
3. Fill in ONLY CEO name:
   - CEO Name: "John Doe"
   - Leave LinkedIn URL empty
   - Leave Start Date empty
4. Submit the form

**Expected Result:**
- ✅ Company request created successfully
- ✅ CEO staging row created in `company_request_leader_tenures`
- ✅ Verify in database:
  ```sql
  SELECT * FROM company_request_leader_tenures 
  WHERE company_request_id = '<request_id>';
  -- Should have:
  -- leader_name: "John Doe"
  -- started_at: today's date (YYYY-MM-DD format)
  -- ended_at: NULL
  -- role: "ceo"
  -- linkedin_url: NULL
  ```

---

### Scenario 3: Submit Company Request WITH Full CEO Information

**Endpoint:** `/company/request` or `/submit-company`

**Steps:**
1. Navigate to the company request form
2. Fill in company fields:
   - Name: "Test Company 3"
   - Why: "Test submission with full CEO info"
3. Fill in ALL CEO fields:
   - CEO Name: "Jane Smith"
   - CEO LinkedIn URL: "https://linkedin.com/in/janesmith"
   - CEO Start Date: "2020-01-15"
4. Submit the form

**Expected Result:**
- ✅ Company request created successfully
- ✅ CEO staging row created with all data
- ✅ Verify in database:
  ```sql
  SELECT * FROM company_request_leader_tenures 
  WHERE company_request_id = '<request_id>';
  -- Should have:
  -- leader_name: "Jane Smith"
  -- started_at: "2020-01-15"
  -- ended_at: NULL
  -- role: "ceo"
  -- linkedin_url: "https://linkedin.com/in/janesmith"
  ```

---

### Scenario 4: Date Format Validation (Client-Side)

**Endpoint:** `/company/request` (API endpoint)

**Steps:**
1. Use an API client (Postman, curl) to POST to `/api/company/request`
2. Send request with invalid date format:
   ```json
   {
     "name": "Test Company",
     "why": "Testing date validation",
     "ceo_name": "Test CEO",
     "ceo_started_at": "2020/01/15"  // Invalid format
   }
   ```

**Expected Result:**
- ✅ HTTP 400 Bad Request
- ✅ Error message: "Invalid CEO start date format (use YYYY-MM-DD)"

---

### Scenario 5: Approve Request WITHOUT Staged CEO

**Endpoint:** `/api/moderation/company-requests/approve`

**Prerequisites:** 
- Company request exists with status "pending"
- NO staged CEO data

**Steps:**
1. Login as moderator
2. Navigate to moderation queue
3. Approve a company request that has no CEO staging data
4. Verify approval succeeds

**Expected Result:**
- ✅ Company created in `companies` table
- ✅ Request status updated to "approved"
- ✅ NO leader or leader_tenure created
- ✅ Approval flow works exactly as before

---

### Scenario 6: Approve Request WITH Staged CEO (New Leader)

**Endpoint:** `/api/moderation/company-requests/approve`

**Prerequisites:** 
- Company request exists with status "pending"
- CEO staging data exists for the request
- Leader does NOT exist yet (new CEO)

**Steps:**
1. Login as moderator
2. Navigate to moderation queue
3. Approve the company request
4. Verify in database

**Expected Result:**
- ✅ Company created in `companies` table
- ✅ New leader created in `leaders` table:
  ```sql
  SELECT * FROM leaders WHERE name = '<ceo_name>';
  -- Should have:
  -- name: from staging
  -- slug: slugified name
  -- role: "ceo"
  -- company_id: new company ID
  -- linkedin_url: from staging (if provided)
  ```
- ✅ Leader tenure created in `leader_tenures` table:
  ```sql
  SELECT * FROM leader_tenures WHERE leader_id = '<new_leader_id>';
  -- Should have:
  -- leader_id: newly created leader
  -- company_id: new company ID
  -- started_at: from staging (NOT NULL)
  -- ended_at: NULL
  -- role: "ceo"
  ```

---

### Scenario 7: Approve Request WITH Staged CEO (Existing Leader by LinkedIn)

**Endpoint:** `/api/moderation/company-requests/approve`

**Prerequisites:** 
- Company request exists with CEO staging that has LinkedIn URL
- A leader already exists with SAME LinkedIn URL

**Steps:**
1. Create an existing leader with linkedin_url: "https://linkedin.com/in/johndoe"
2. Submit a company request with CEO having same LinkedIn URL
3. Approve the request

**Expected Result:**
- ✅ NO new leader created
- ✅ Existing leader linked to new company via leader_tenure
- ✅ Verify in database:
  ```sql
  SELECT * FROM leader_tenures 
  WHERE leader_id = '<existing_leader_id>' 
  AND company_id = '<new_company_id>';
  -- Should find the new tenure linking existing leader to new company
  ```

---

### Scenario 8: Approve Request WITH Staged CEO (Existing Leader by Slug)

**Endpoint:** `/api/moderation/company-requests/approve`

**Prerequisites:** 
- Company request exists with CEO staging (no LinkedIn URL)
- A leader already exists with matching slug

**Steps:**
1. Create an existing leader with name "John Doe" (slug: "john-doe")
2. Submit a company request with CEO name "John Doe" (no LinkedIn)
3. Approve the request

**Expected Result:**
- ✅ NO new leader created
- ✅ Existing leader linked to new company via leader_tenure

---

### Scenario 9: Prevent Duplicate Active CEO (409 Error)

**Endpoint:** `/api/moderation/company-requests/approve`

**Prerequisites:** 
- Company already has an active CEO tenure (ended_at IS NULL, role = 'ceo')
- Trying to approve another request that would add a second CEO

**Setup:**
```sql
-- Manually create a company with an active CEO
INSERT INTO companies (name, slug, country) 
VALUES ('Existing Company', 'existing-company', 'US');

INSERT INTO leaders (name, slug, role, company_id) 
VALUES ('Existing CEO', 'existing-ceo', 'ceo', <company_id>);

INSERT INTO leader_tenures (leader_id, company_id, started_at, role) 
VALUES (<leader_id>, <company_id>, '2020-01-01', 'ceo');
-- Note: ended_at is NULL (active tenure)
```

**Steps:**
1. Try to approve a company request that targets the same company
2. Request has staged CEO data

**Expected Result:**
- ✅ HTTP 409 Conflict
- ✅ Error message: "Cannot add CEO: company already has an active CEO tenure. Please end the existing tenure first."
- ✅ Request status remains "pending"
- ✅ NO new leader or tenure created

---

### Scenario 10: LinkedIn URL Normalization

**Test Cases:**

1. **Trailing slash removal:**
   - Input: "https://linkedin.com/in/johndoe/"
   - Normalized: "https://linkedin.com/in/johndoe"
   - Should MATCH existing leader with "https://linkedin.com/in/johndoe"

2. **Exact match required (case-sensitive):**
   - Input: "https://linkedin.com/in/JohnDoe"
   - Should NOT match "https://linkedin.com/in/johndoe"
   - Will create a NEW leader

3. **Protocol difference:**
   - Input: "http://linkedin.com/in/johndoe"
   - Should NOT match "https://linkedin.com/in/johndoe"
   - Will create a NEW leader
   - Note: This is intentional per code review comments

---

## Database Verification Queries

### Check Staging Data
```sql
SELECT 
  crt.*,
  cr.name as company_name,
  cr.status as request_status
FROM company_request_leader_tenures crt
JOIN company_requests cr ON crt.company_request_id = cr.id
ORDER BY crt.created_at DESC;
```

### Check Materialized Leaders
```sql
SELECT 
  l.name as leader_name,
  l.linkedin_url,
  c.name as company_name,
  lt.started_at,
  lt.ended_at,
  lt.role
FROM leaders l
JOIN leader_tenures lt ON l.id = lt.leader_id
JOIN companies c ON lt.company_id = c.id
WHERE l.created_at > NOW() - INTERVAL '1 day'
ORDER BY l.created_at DESC;
```

### Find Active CEO Conflicts
```sql
SELECT 
  c.name as company_name,
  l.name as ceo_name,
  lt.started_at
FROM leader_tenures lt
JOIN leaders l ON lt.leader_id = l.id
JOIN companies c ON lt.company_id = c.id
WHERE lt.role = 'ceo' 
  AND lt.ended_at IS NULL
ORDER BY c.name;
```

---

## Edge Cases to Test

1. **Empty CEO name with LinkedIn URL provided:** Should NOT create staging row
2. **CEO name with only whitespace:** Should be trimmed to empty, no staging row
3. **Invalid date values (e.g., "2020-13-45"):** Database constraint should reject
4. **Special characters in CEO name:** Should be slugified correctly
5. **Very long CEO names:** Should be handled by slug length limit (80 chars)

---

## UI Visual Verification

### Company Request Form Screenshot Checklist

- [ ] CEO section is visually separated from company fields (border/heading)
- [ ] All CEO fields are marked as optional (no asterisks)
- [ ] Helper text shows "Defaults to today if not specified" for date field
- [ ] LinkedIn URL field has type="url" for browser validation
- [ ] Date field has type="date" for date picker widget
- [ ] Form can be submitted with empty CEO fields
- [ ] Form can be submitted with only CEO name filled

---

## Performance Considerations

- Approval process adds 2-3 database queries per staged CEO (read staging, check conflict, find/create leader)
- LinkedIn URL normalization is O(1) string operation
- Slug-based leader lookup uses index on `slug` column
- No N+1 query issues expected

---

## Rollback Plan

If issues are discovered in production:

1. Stop processing new company request approvals
2. Revert approval route changes
3. Run migration rollback:
   ```sql
   DROP TABLE IF EXISTS company_request_leader_tenures;
   ALTER TABLE leaders DROP COLUMN IF EXISTS linkedin_url;
   ALTER TABLE leader_tenures DROP COLUMN IF EXISTS role;
   ```
4. Deploy previous version of code
5. Investigate and fix issues
6. Re-deploy with fixes
