# 🚀 API Routes Visual Guide

Complete visual documentation of all API endpoints in the Rotten Company platform.

---

## 📍 API Routes Map

```
app/api/
│
├── 📊 CORE SCORING APIS
│   │
│   ├── submit-rating/route.ts
│   │   POST /api/submit-rating
│   │   Submit a rating for a company
│   │   
│   ├── score/recalculate/route.ts
│   │   POST /api/score/recalculate
│   │   Manually trigger score recalculation
│   │
│   └── rotten-index/route.ts
│       GET /api/rotten-index
│       Fetch leaderboard/index data
│
├── 📝 EVIDENCE SUBMISSION
│   │
│   └── evidence/submit/route.ts
│       POST /api/evidence/submit
│       Submit evidence against a company
│
├── 🔐 AUTHENTICATION
│   │
│   └── auth/me/route.ts
│       GET /api/auth/me
│       Get current user info
│
├── 🐛 DEBUG & UTILITIES
│   │
│   ├── rotten-index-debug/route.ts
│   │   GET /api/rotten-index-debug
│   │   Debug version with extra data
│   │
│   └── og/company/route.ts
│       GET /api/og/company
│       Generate Open Graph images
│
└── 📧 EXTERNAL (not in app/api/)
    │
    └── api/sendNotifications.js
        Email notification service
```

---

## 🔄 API Flow Diagrams

### Evidence Submission Flow

```
┌──────────────────────────────────────────────────────────────┐
│                  POST /api/evidence/submit                   │
└──────────────────────────────────────────────────────────────┘

Client Side:
┌─────────────────────┐
│  EvidenceUpload     │
│  Component          │
│  • Collects data    │
│  • Validates form   │
└──────┬──────────────┘
       │
       │ POST request with:
       │ {
       │   companyId: number,
       │   categoryRatings: {category_id: rating}[],
       │   evidenceText: string,
       │   sourceUrl?: string,
       │   country: string
       │ }
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│                 Server: route.ts Handler                     │
│                                                              │
│  Step 1: Authentication Check                               │
│    ├─► Get user session                                     │
│    ├─► Check if logged in                                   │
│    └─► Return 401 if not authenticated                      │
│                                                              │
│  Step 2: Input Validation                                   │
│    ├─► Validate companyId exists                            │
│    ├─► Validate categories are valid                        │
│    ├─► Validate ratings are 0-100                           │
│    └─► Return 400 if validation fails                       │
│                                                              │
│  Step 3: Rate Limiting                                      │
│    ├─► Check user hasn't submitted too recently             │
│    └─► Return 429 if rate limited                           │
│                                                              │
│  Step 4: Save Evidence                                      │
│    ├─► Insert into 'evidence' table                         │
│    ├─► Store category ratings                               │
│    ├─► Link to user and company                             │
│    └─► Generate submission ID                               │
│                                                              │
│  Step 5: Trigger Score Recalculation                        │
│    ├─► Call calculateRottenScore()                          │
│    ├─► Update company's overall score                       │
│    └─► Update category breakdowns                           │
│                                                              │
│  Step 6: Send Notifications                                 │
│    ├─► Email company owner (if configured)                  │
│    ├─► Notify moderators (if flagged)                       │
│    └─► Send confirmation to submitter                       │
│                                                              │
│  Step 7: Return Success                                     │
│    └─► Return 201 with submission ID                        │
│                                                              │
└──────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────┐
│  Client Receives    │
│  Success Response   │
│  • Shows confirm    │
│  • Redirects        │
└─────────────────────┘
```

---

## 📊 Score Recalculation API

```
┌──────────────────────────────────────────────────────────────┐
│              POST /api/score/recalculate                     │
└──────────────────────────────────────────────────────────────┘

Request Body:
{
  companyId: number,      // Company to recalculate
  force?: boolean         // Skip cache/throttling
}

┌─────────────────────────────────────────────────────────────┐
│                    Processing Flow                          │
│                                                             │
│  1. Fetch Company Data                                     │
│     ├─► Get company metadata (size, ownership, country)    │
│     └─► Get current score (for comparison)                 │
│                                                             │
│  2. Fetch All Evidence                                     │
│     ├─► Get all submissions for this company               │
│     ├─► Group by category                                  │
│     └─► Filter out moderated/rejected evidence             │
│                                                             │
│  3. Calculate Category Scores                              │
│     ├─► For each of 18 categories:                         │
│     │   ├─► Average all ratings                            │
│     │   ├─► Weight by recency (newer = more weight)        │
│     │   └─► Normalize to 0-100                             │
│     └─► Output: categoryScores object                      │
│                                                             │
│  4. Apply Scoring Algorithm                                │
│     └─► Call calculateRottenScore() from rotten-score.ts   │
│         Input:                                              │
│         • categoryScores                                    │
│         • companySize (small/medium/large/enterprise)       │
│         • ownershipType (public/private/etc)                │
│         • country                                           │
│         Output:                                             │
│         • finalScore (0-100)                                │
│         • categoryBreakdown                                 │
│         • appliedMultipliers                                │
│                                                             │
│  5. Update Database                                        │
│     ├─► Update companies.rotten_score                      │
│     ├─► Update companies.category_scores                   │
│     ├─► Update companies.last_calculated                   │
│     └─► Log calculation in audit trail                     │
│                                                             │
│  6. Invalidate Caches                                      │
│     ├─► Clear company page cache                           │
│     ├─► Clear leaderboard cache                            │
│     └─► Clear category index cache                         │
│                                                             │
│  7. Return Result                                          │
│     └─► Return new score + change delta                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘

Response:
{
  success: true,
  oldScore: 65.3,
  newScore: 73.8,
  delta: +8.5,
  calculatedAt: "2026-01-28T11:15:00Z"
}
```

---

## 📋 Rotten Index (Leaderboard) API

```
┌──────────────────────────────────────────────────────────────┐
│                  GET /api/rotten-index                       │
└──────────────────────────────────────────────────────────────┘

Query Parameters:
?category=toxic_workplace    // Filter by category
?country=US                  // Filter by country
?size=large                  // Filter by company size
?ownership=public            // Filter by ownership type
?sort=score_desc             // Sort order (score_desc, score_asc, etc.)
?limit=50                    // Results per page
?offset=0                    // Pagination offset

┌─────────────────────────────────────────────────────────────┐
│                    Processing Flow                          │
│                                                             │
│  1. Parse Query Parameters                                 │
│     └─► Validate filters and sort options                  │
│                                                             │
│  2. Build Database Query                                   │
│     ├─► Start with companies table                         │
│     ├─► Apply filters (category, country, size, etc.)      │
│     ├─► Join evidence counts                               │
│     └─► Order by requested sort                            │
│                                                             │
│  3. Execute Query                                          │
│     └─► Fetch companies with scores                        │
│                                                             │
│  4. Enhance Data                                           │
│     For each company:                                       │
│     ├─► Get rank/position in overall list                  │
│     ├─► Calculate percentile                               │
│     ├─► Get flavor data (macro tier, color)                │
│     └─► Get top categories (highest scoring)               │
│                                                             │
│  5. Cache Result                                           │
│     └─► Cache for 5 minutes (frequently changing)          │
│                                                             │
│  6. Return Response                                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘

Response:
{
  companies: [
    {
      id: 1,
      name: "Evil Corp",
      slug: "evil-corp",
      score: 94.2,
      rank: 1,
      percentile: 99,
      macroTier: "Working for Satan",
      color: "#8B0000",
      evidenceCount: 247,
      topCategories: [
        {id: "toxic_workplace", score: 98},
        {id: "wage_abuse", score: 92}
      ]
    },
    // ... more companies
  ],
  total: 150,
  filters: {category: null, country: null, ...},
  sort: "score_desc"
}
```

---

## 🔐 Authentication API

```
┌──────────────────────────────────────────────────────────────┐
│                    GET /api/auth/me                          │
└──────────────────────────────────────────────────────────────┘

Purpose: Get current logged-in user info

┌─────────────────────────────────────────────────────────────┐
│                    Processing Flow                          │
│                                                             │
│  1. Get Session                                            │
│     └─► Check Supabase session cookie                      │
│                                                             │
│  2. If No Session                                          │
│     └─► Return 401 Unauthorized                            │
│                                                             │
│  3. Fetch User Profile                                     │
│     ├─► Get user from auth.users                           │
│     ├─► Get profile from public.profiles                   │
│     └─► Get roles/permissions                              │
│                                                             │
│  4. Return User Data                                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘

Response (Success):
{
  id: "user-uuid",
  email: "user@example.com",
  displayName: "John Doe",
  roles: ["user", "moderator"],
  country: "US",
  createdAt: "2025-01-15T10:00:00Z",
  evidenceSubmitted: 5
}

Response (Not Logged In):
{
  error: "Not authenticated",
  status: 401
}
```

---

## 🖼️ Open Graph Image API

```
┌──────────────────────────────────────────────────────────────┐
│                  GET /api/og/company                         │
└──────────────────────────────────────────────────────────────┘

Purpose: Generate dynamic Open Graph images for social media sharing

Query Parameters:
?slug=evil-corp      // Company slug
?score=73.5          // Rotten score
?tier=Corporate%20Disaster%20Zone  // Macro tier

┌─────────────────────────────────────────────────────────────┐
│                    Processing Flow                          │
│                                                             │
│  1. Parse Parameters                                       │
│     └─► Get slug, score, tier from query                   │
│                                                             │
│  2. Fetch Company Data                                     │
│     └─► Get company name, logo if not provided             │
│                                                             │
│  3. Get Flavor Data                                        │
│     └─► Call getRottenFlavor(score)                        │
│                                                             │
│  4. Generate Image                                         │
│     ├─► Create canvas (1200x630px - OG standard)           │
│     ├─► Add background (color based on score)              │
│     ├─► Add company name                                   │
│     ├─► Add score meter graphic                            │
│     ├─► Add tier text                                      │
│     └─► Add branding                                       │
│                                                             │
│  5. Return Image                                           │
│     └─► Return as PNG with proper headers                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘

Generated Image Example:
┌─────────────────────────────────────────────────┐
│                                                 │
│   [Logo]  ROTTEN COMPANY                       │
│                                                 │
│   Evil Corp                                    │
│                                                 │
│   [████████████░░░░░░] 73.5                    │
│                                                 │
│   Corporate Disaster Zone                      │
│                                                 │
│   Transparency platform exposing toxicity      │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## 📧 Email Notification API

```
┌──────────────────────────────────────────────────────────────┐
│           api/sendNotifications.js (External)                │
└──────────────────────────────────────────────────────────────┘

Purpose: Send email notifications for evidence submissions

Called by: /api/evidence/submit after successful submission

Function Signature:
sendNotifications({
  type: 'evidence_submitted',
  companyId: number,
  companyName: string,
  evidenceId: number,
  submitterEmail: string,
  ownerEmail?: string,
  categoryRatings: object,
  newScore: number,
  oldScore: number
})

Email Types:

1. To Company Owner:
   Subject: "New Evidence Submitted - [Company Name]"
   Content:
   • Evidence summary
   • Category ratings
   • Score change (old → new)
   • Link to review evidence
   • Link to respond/dispute

2. To Submitter:
   Subject: "Evidence Submitted Successfully"
   Content:
   • Confirmation of submission
   • Estimated review time
   • Link to view company page
   • Reminder about guidelines

3. To Moderators (if flagged):
   Subject: "Evidence Requires Review - [Company Name]"
   Content:
   • Flagged content
   • Reason for flag
   • Link to moderation panel
```

---

## 🔍 API Request/Response Examples

### Submit Evidence
```bash
# Request
POST /api/evidence/submit
Content-Type: application/json
Authorization: Bearer <user-token>

{
  "companyId": 42,
  "categoryRatings": [
    {"categoryId": "toxic_workplace", "rating": 85},
    {"categoryId": "wage_abuse", "rating": 70}
  ],
  "evidenceText": "Management creates hostile environment...",
  "sourceUrl": "https://example.com/news",
  "country": "US"
}

# Response (Success)
HTTP/1.1 201 Created
{
  "success": true,
  "evidenceId": 1234,
  "message": "Evidence submitted successfully",
  "scoreUpdated": {
    "oldScore": 65.3,
    "newScore": 67.8,
    "delta": +2.5
  }
}

# Response (Error)
HTTP/1.1 400 Bad Request
{
  "error": "Invalid category ID",
  "field": "categoryRatings[0].categoryId",
  "validCategories": ["toxic_workplace", "wage_abuse", ...]
}
```

### Get Leaderboard
```bash
# Request
GET /api/rotten-index?category=toxic_workplace&limit=10&sort=score_desc

# Response
HTTP/1.1 200 OK
{
  "companies": [
    {
      "id": 1,
      "name": "Evil Corp",
      "slug": "evil-corp",
      "score": 94.2,
      "rank": 1,
      "macroTier": "Working for Satan",
      "evidenceCount": 247
    },
    // ... 9 more companies
  ],
  "total": 150,
  "page": 1,
  "perPage": 10
}
```

### Recalculate Score
```bash
# Request
POST /api/score/recalculate
Content-Type: application/json
Authorization: Bearer <admin-token>

{
  "companyId": 42,
  "force": true
}

# Response
HTTP/1.1 200 OK
{
  "success": true,
  "companyId": 42,
  "oldScore": 65.3,
  "newScore": 73.8,
  "delta": +8.5,
  "calculatedAt": "2026-01-28T11:15:00Z",
  "categoryScores": {
    "toxic_workplace": 82,
    "wage_abuse": 75,
    // ... other categories
  }
}
```

---

## 🔒 Authentication & Authorization

### Public Endpoints (No Auth Required)
- `GET /api/rotten-index` - View leaderboard
- `GET /api/og/company` - Generate OG images

### User Endpoints (Requires Login)
- `POST /api/evidence/submit` - Submit evidence
- `GET /api/auth/me` - Get own profile

### Admin/Moderator Endpoints
- `POST /api/score/recalculate` - Manual score recalc
- `POST /api/moderation/*` - Moderation actions

### Auth Flow
```
Request with Auth
  ↓
Check Supabase session
  ↓
Validate user token
  ↓
Check user roles/permissions
  ↓
Allow or Deny (401/403)
```

---

## ⚡ Rate Limiting

```
Evidence Submission:
  • 5 submissions per hour per user
  • 20 submissions per day per user
  • 3 submissions per hour per IP (prevents abuse)

Score Recalculation:
  • 1 recalculation per minute per company
  • 10 recalculations per hour per admin

API Reads:
  • 100 requests per minute per IP
  • 1000 requests per hour per user
```

---

## 🐛 Error Handling

All APIs return consistent error format:
```json
{
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "field": "fieldName",  // For validation errors
  "details": {}          // Additional context
}
```

Common HTTP Status Codes:
- `200` - Success
- `201` - Created (evidence submitted)
- `400` - Bad Request (validation error)
- `401` - Unauthorized (not logged in)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (company doesn't exist)
- `429` - Too Many Requests (rate limited)
- `500` - Server Error

---

## 📊 API Performance

**Response Times (Target):**
- Evidence submission: < 500ms
- Score recalculation: < 2s
- Leaderboard fetch: < 200ms
- Auth check: < 100ms

**Caching Strategy:**
- Leaderboard: 5 minutes
- Company pages: 10 minutes
- User sessions: 1 hour
- OG images: 24 hours

---

*All APIs are designed to be RESTful, stateless, and follow Next.js App Router conventions.*
