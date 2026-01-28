# 🏗️ Rotten Company - Visual Architecture Guide

This document provides a visual overview of the codebase structure and how different parts work together.

## 📁 Project Structure Overview

```
rotten-company/
│
├── 📱 app/                          # Next.js App Router pages & API routes
│   ├── api/                        # Backend API endpoints
│   │   ├── submit-rating/          # Submit company ratings
│   │   ├── evidence/submit/        # Submit evidence
│   │   ├── score/recalculate/      # Recalculate scores
│   │   └── rotten-index/           # Get rotten index data
│   │
│   ├── company/[slug]/             # Individual company pages
│   ├── categories/                 # Browse by category
│   ├── rotten-index/               # Leaderboard/index
│   ├── submit-company/             # Submit new company
│   ├── submit-evidence/            # Submit evidence form
│   └── moderation/                 # Admin moderation tools
│
├── 🧩 components/                   # Reusable React components
│   ├── EvidenceUpload.tsx          # Evidence submission UI
│   ├── RottenScoreMeter.tsx        # Visual score display
│   ├── CategoryBreakdown.tsx       # Category scores table
│   └── ...                         # Other UI components
│
├── 🔧 lib/                          # Core business logic & utilities
│   ├── rotten-score.ts             # 🎯 Main scoring engine
│   ├── flavor-engine.ts            # Text/color for scores
│   ├── rotten-index.ts             # Leaderboard calculations
│   ├── supabase-*.ts               # Database clients
│   └── ...                         # Helper functions
│
└── 🔌 api/                          # External API integrations
    └── sendNotifications.js        # Email notifications
```

---

## 🔄 Data Flow: Evidence → Score → Display

```
┌─────────────────┐
│  User Submits   │
│   Evidence      │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────────────┐
│          API Route: /api/evidence/submit        │
│  • Validates submission                         │
│  • Stores in Supabase                          │
│  • Triggers score recalculation                │
└────────┬────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────┐
│      lib/rotten-score.ts - calculateScore()     │
│                                                 │
│  1. Fetch all evidence for company             │
│  2. Group by 18 harm categories                │
│  3. Calculate weighted average per category    │
│  4. Apply multipliers:                         │
│     • Company size normalization               │
│     • Ownership type (public/private/etc)      │
│     • Geographic region                        │
│  5. Output final Rotten Score (0-100)          │
└────────┬────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────┐
│     lib/flavor-engine.ts - getRottenFlavor()    │
│                                                 │
│  Score → Macro Tier:                           │
│    0-10:   Mostly Decent                       │
│    10-25:  Mildly Rotten                       │
│    25-40:  Rotten Enough to Notice             │
│    40-55:  Serious Rot Detected                │
│    55-70:  Rotten but Redeemable               │
│    70-85:  Corporate Disaster Zone             │
│    85-95:  Empire from Star Wars               │
│    95-100: Working for Satan                   │
│                                                 │
│  Also provides:                                │
│  • Micro-flavor (101 unique texts)             │
│  • Color mapping (green → red)                 │
└────────┬────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────┐
│    Component: RottenScoreMeter.tsx              │
│                                                 │
│  Displays:                                     │
│  • Visual meter with color                     │
│  • Macro tier label                            │
│  • Micro-flavor description                    │
│  • Numerical score                             │
└─────────────────────────────────────────────────┘
```

---

## 🎯 Core Scoring Engine (lib/rotten-score.ts)

The heart of the platform - calculates how "rotten" a company is:

```
┌──────────────────────────────────────────────────────────────┐
│                  ROTTEN SCORE CALCULATION                    │
└──────────────────────────────────────────────────────────────┘

INPUT: Evidence ratings for a company
  ↓
┌──────────────────────────────────────────────────────────┐
│ STEP 1: Category Aggregation                            │
│                                                          │
│ 18 Harm Categories:                                     │
│  Labor & Workplace:                                     │
│    • toxic_workplace                                    │
│    • wage_abuse                                         │
│    • union_busting                                      │
│    • discrimination_harassment                          │
│                                                          │
│  Environmental:                                         │
│    • greenwashing                                       │
│    • pollution_environmental_damage                     │
│    • climate_obstruction                                │
│                                                          │
│  Consumer:                                              │
│    • customer_trust                                     │
│    • unfair_pricing                                     │
│    • product_safety_failures                            │
│    • privacy_data_abuse                                 │
│                                                          │
│  Governance:                                            │
│    • ethics_failures                                    │
│    • corruption_bribery                                 │
│    • fraud_financial_misconduct                         │
│                                                          │
│  Social:                                                │
│    • community_harm                                     │
│    • public_health_risk                                 │
│                                                          │
│  Brand:                                                 │
│    • broken_promises                                    │
│    • misleading_marketing                               │
│                                                          │
│ Each category gets weighted average of evidence (0-100) │
└────────────────────────┬─────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────┐
│ STEP 2: Apply Category Weights                          │
│                                                          │
│ Different categories have different impact:             │
│  • Some categories count more than others               │
│  • Weighted sum creates base score                      │
└────────────────────────┬─────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────┐
│ STEP 3: Company Size Normalization                      │
│                                                          │
│  Tiers:                                                 │
│    small:      1-50 employees     (multiplier: 0.8)    │
│    medium:     51-500             (multiplier: 1.0)    │
│    large:      501-5000           (multiplier: 1.1)    │
│    enterprise: 5001+              (multiplier: 1.2)    │
│                                                          │
│  Larger companies get higher scores for same harm       │
└────────────────────────┬─────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────┐
│ STEP 4: Ownership Type Multiplier                       │
│                                                          │
│    public:     Publicly traded   (multiplier: 1.2)     │
│    private:    Private company   (multiplier: 1.0)     │
│    nonprofit:  Non-profit        (multiplier: 0.7)     │
│    government: Gov entity        (multiplier: 1.3)     │
│    franchise:  Franchise         (multiplier: 1.1)     │
└────────────────────────┬─────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────┐
│ STEP 5: Geographic/Country Multiplier                   │
│                                                          │
│  Different countries have different expectations        │
│  • Accounts for regional labor/environmental standards  │
└────────────────────────┬─────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────┐
│ OUTPUT: Final Rotten Score (0-100)                      │
│                                                          │
│   0   = Squeaky clean                                   │
│   50  = Moderately problematic                          │
│   100 = Extremely rotten                                │
└──────────────────────────────────────────────────────────┘
```

---

## 🎨 Flavor System (lib/flavor-engine.ts)

Converts numeric scores into human-readable descriptions:

```
┌─────────────────────────────────────────────────────────┐
│                  FLAVOR ENGINE                          │
│                                                         │
│  Input: Rotten Score (0-100)                           │
│    │                                                    │
│    ├─► Macro Tier (8 buckets)                         │
│    │     "Mostly Decent" to "Working for Satan"       │
│    │                                                    │
│    ├─► Micro Flavor (101 unique texts)                │
│    │     Specific description for each integer score  │
│    │     Example: Score 73 → "A toxic mess"           │
│    │                                                    │
│    ├─► Color (7-color gradient)                       │
│    │     Green (clean) → Red (rotten)                 │
│    │                                                    │
│    └─► Category Flavor                                │
│          Per-category descriptive text                 │
│          "Rotten to the core", "Ethics on life support"│
│                                                         │
│  Output: RottenFlavor object with all visual metadata  │
└─────────────────────────────────────────────────────────┘
```

---

## 🗄️ Database Layer (Supabase)

```
┌────────────────────────────────────────────────────────────┐
│                   SUPABASE CLIENTS                         │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  supabase-browser.ts  ──► Browser/Client-side access     │
│  supabase-server.ts   ──► Server Components (SSR)        │
│  supabase-route.ts    ──► API Route handlers             │
│  supabase-service.ts  ──► Admin/Service operations       │
│  supabaseClient.ts    ──► Legacy/general client          │
│                                                            │
│  Each optimized for different Next.js contexts           │
└────────────────────────────────────────────────────────────┘

Main Tables:
  • companies        - Company profiles
  • evidence         - User-submitted evidence/ratings
  • categories       - Harm category definitions
  • users            - User accounts
  • moderation_logs  - Admin actions
```

---

## 📊 Component Hierarchy

```
app/layout.tsx (Root Layout)
│
├─► app/page.tsx (Home)
│
├─► app/company/[slug]/page.tsx (Company Detail)
│   ├─► RottenScoreMeter - Shows overall score
│   ├─► CategoryBreakdown - Scores by category
│   └─► EvidenceList - User submissions
│
├─► app/rotten-index/page.tsx (Leaderboard)
│   └─► [Company list with scores]
│
├─► app/submit-company/page.tsx
│   └─► SubmitCompanyForm
│
└─► app/submit-evidence/page.tsx
    └─► EvidenceUpload
        ├─► CountrySelect
        ├─► CategoryBreakdown
        └─► RatingStars
```

---

## 🚀 API Routes Map

```
app/api/
│
├─► submit-rating/route.ts
│     POST: Submit a company rating
│     → Stores in DB → Triggers score recalc
│
├─► evidence/submit/route.ts
│     POST: Submit evidence with details
│     → Validates → Stores → Sends notifications
│
├─► score/recalculate/route.ts
│     POST: Manually trigger score recalculation
│     → Calls rotten-score.ts → Updates DB
│
├─► rotten-index/route.ts
│     GET: Fetch leaderboard data
│     → Uses rotten-index.ts
│
└─► auth/me/route.ts
      GET: Current user info
      → Checks session
```

---

## 🔐 Key Utilities

```
lib/
│
├─► getCompanyBySlug.ts
│     Fetch company data by URL slug
│
├─► getEvidenceWithManagers.ts
│     Get evidence + user data for moderation
│
├─► getLeaderData.ts
│     Get company ranking/position
│
├─► moderation-guards.ts
│     Check if user has moderator permissions
│
├─► normalization.ts
│     Normalize raw ratings to 0-100 scale
│
├─► jsonld-*.ts
│     Generate structured data for SEO
│     (Google rich results)
│
└─► email.ts
      Send notification emails
```

---

## 🎭 Flavor Text System

```
lib/micro-flavors.ts
  │
  └─► 101 unique flavor texts (one per score 0-100)
       "Your dream job awaits" (score 0)
       "A few red flags" (score 30)
       "Abandon all hope" (score 100)

lib/flavors.ts
  │
  └─► Legacy flavor helpers (deprecated)

lib/flavor-bundle.ts
  │
  └─► Bundle multiple flavors for UI
```

---

## 🔄 Typical User Journey

```
1. User visits /company/evil-corp
   ↓
2. Page fetches company data (getCompanyBySlug)
   ↓
3. Displays current Rotten Score + evidence
   ↓
4. User clicks "Submit Evidence"
   ↓
5. Fills EvidenceUpload form
   ↓
6. POST to /api/evidence/submit
   ↓
7. Evidence stored in DB
   ↓
8. Score recalculated automatically
   ↓
9. Email sent to company owner (if configured)
   ↓
10. User redirected back to company page
    ↓
11. Updated score displayed
```

---

## 🎨 Visual Design System

**Color Palette (Score-based):**
```
 0-15:  #2E8B57  (Green)      - Mostly clean
15-30:  #A9A9A9  (Gray)       - Minor issues
30-45:  #CD853F  (Tan/Brown)  - Noticeable problems
45-60:  #DAA520  (Gold)       - Warning zone
60-75:  #D2691E  (Orange)     - Serious issues
75-90:  #B22222  (Red)        - Very bad
90-100: #8B0000  (Dark Red)   - Extremely rotten
```

---

## 📚 Key Files by Purpose

**Scoring & Calculation:**
- `lib/rotten-score.ts` - Main scoring algorithm
- `lib/rotten-index.ts` - Leaderboard/ranking
- `lib/normalization.ts` - Data normalization

**Display & UI:**
- `lib/flavor-engine.ts` - Score → text/color
- `lib/micro-flavors.ts` - 101 flavor texts
- `components/RottenScoreMeter.tsx` - Score visualization

**Data Access:**
- `lib/getCompanyBySlug.ts` - Fetch company
- `lib/getEvidenceWithManagers.ts` - Fetch evidence
- `lib/supabase-*.ts` - Database clients

**Business Logic:**
- `app/api/evidence/submit/route.ts` - Evidence submission
- `app/api/score/recalculate/route.ts` - Score updates
- `lib/moderation-guards.ts` - Access control

**SEO & Metadata:**
- `lib/jsonld-company.ts` - Company structured data
- `lib/jsonld-leader.ts` - Leaderboard structured data
- `lib/jsonld-owner.ts` - Owner structured data

---

## 🔍 Finding What You Need

**Want to change how scores are calculated?**
→ `lib/rotten-score.ts`

**Want to change score descriptions/colors?**
→ `lib/flavor-engine.ts` + `lib/micro-flavors.ts`

**Want to modify the evidence form?**
→ `components/EvidenceUpload.tsx` + `app/api/evidence/submit/route.ts`

**Want to adjust the score meter display?**
→ `components/RottenScoreMeter.tsx`

**Want to change category weights?**
→ `lib/rotten-score.ts` (CATEGORY_WEIGHTS constant)

**Want to modify the leaderboard?**
→ `lib/rotten-index.ts` + `app/rotten-index/page.tsx`

**Want to add/change database queries?**
→ Choose the right `lib/supabase-*.ts` for your context

---

## 🧪 Testing & Development

**Run development server:**
```bash
npm run dev
```

**Lint code:**
```bash
npm run lint
```

**Build for production:**
```bash
npm run build
```

---

*This architecture is designed to be modular, with clear separation between:*
- *Data (Supabase)*
- *Business logic (lib/)*
- *UI (components/ + app/)*
- *API (app/api/)*

*Each layer can be modified independently without breaking others.*
