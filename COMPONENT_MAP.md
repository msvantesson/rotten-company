# 🧩 Component Map - React Components Visual Guide

This document maps all React components in the codebase with visual hierarchy and usage patterns.

---

## 📋 Component Directory Overview

```
components/
├── 📊 Data Display Components
│   ├── RottenScoreMeter.tsx          - Main score visualization
│   ├── CategoryBreakdown.tsx         - Category scores table
│   ├── EvidenceList.tsx              - List of evidence (simple)
│   ├── EvidenceListGrouped.tsx       - Evidence grouped by category
│   └── RatingStars.tsx               - Star rating input/display
│
├── 📝 Form Components
│   ├── EvidenceUpload.tsx            - Evidence submission form
│   ├── SubmitCompanyForm.tsx         - New company form
│   ├── CountrySelect.tsx             - Country dropdown
│   └── EvidenceAnchorButton.tsx      - Link to evidence section
│
├── 🔧 Utility Components
│   ├── ClientCountrySync.tsx         - Syncs country to DB
│   ├── ClientEvidenceLogger.tsx      - Logs evidence views
│   ├── EvidenceClientWrapper.tsx     - Client-side evidence wrapper
│   └── score-meter.tsx               - Alternative meter component
│
└── 🐛 Debug Components
    ├── ScoreDebugPanel.tsx           - Score calculation debug
    └── JsonLdDebugPanel.tsx          - SEO structured data debug
```

---

## 🎯 Component Hierarchy & Data Flow

### Company Detail Page
```
app/company/[slug]/page.tsx
│
├─► CompanyHeader
│   ├─► RottenScoreMeter ⭐ PRIMARY SCORE DISPLAY
│   │   │
│   │   └─► Renders:
│   │       • Score number (0-100)
│   │       • Color-coded meter
│   │       • Macro tier ("Working for Satan", etc.)
│   │       • Micro flavor text
│   │
│   └─► Company metadata (name, size, ownership)
│
├─► CategoryBreakdown
│   │   Shows how each of 18 categories contributes
│   │   to overall score
│   │
│   └─► RatingStars (for each category)
│       Displays rating visually with stars
│
└─► EvidenceListGrouped
    │   All evidence submitted by users
    │
    ├─► Grouped by category
    ├─► Shows date, rating, comment
    └─► Moderation controls (if admin)
```

### Evidence Submission Flow
```
app/submit-evidence/page.tsx
│
└─► EvidenceUpload ⭐ MAIN FORM
    │
    ├─► CountrySelect
    │   Dropdown for selecting country
    │
    ├─► RatingStars
    │   For each category that user rates
    │
    ├─► Text areas
    │   Comments, evidence details
    │
    └─► Submit button
        │
        └─► POST /api/evidence/submit
            Updates DB → Recalculates score
```

### Rotten Index (Leaderboard)
```
app/rotten-index/page.tsx
│
└─► Company List
    │
    └─► For each company:
        ├─► Company name + link
        ├─► RottenScoreMeter (compact version)
        └─► Category highlights
```

---

## 🎨 RottenScoreMeter Component (DETAILED)

**File:** `components/RottenScoreMeter.tsx`

**Purpose:** The primary visual representation of a company's Rotten Score

**Visual Structure:**
```
┌─────────────────────────────────────────────┐
│         RottenScoreMeter Component          │
├─────────────────────────────────────────────┤
│                                             │
│  ┌───────────────────────────────────┐     │
│  │   [████████████░░░░░░░░░░░░] 73   │     │
│  │   Score Meter Bar (colored)       │     │
│  └───────────────────────────────────┘     │
│                                             │
│  "Corporate Disaster Zone"                  │
│  (Macro Tier - 8 levels)                   │
│                                             │
│  "A toxic mess with a smile"               │
│  (Micro Flavor - unique per score)         │
│                                             │
└─────────────────────────────────────────────┘
```

**Props:**
```typescript
interface Props {
  score: number;           // 0-100
  showDetails?: boolean;   // Show tier + flavor?
  compact?: boolean;       // Smaller version?
}
```

**Usage Example:**
```tsx
<RottenScoreMeter 
  score={73.5} 
  showDetails={true} 
/>
```

**Internal Flow:**
```
1. Receives score (0-100)
   ↓
2. Calls getRottenFlavor(score) from flavor-engine.ts
   ↓
3. Gets back:
   • macroTier: "Corporate Disaster Zone"
   • microFlavor: "A toxic mess..."
   • color: "#B22222" (red)
   ↓
4. Renders:
   • Meter bar with gradient (0% to score%)
   • Background color based on color
   • Text labels for tier and flavor
```

---

## 📊 CategoryBreakdown Component

**File:** `components/CategoryBreakdown.tsx`

**Purpose:** Shows detailed breakdown of scores across all 18 harm categories

**Visual Layout:**
```
┌─────────────────────────────────────────────────────────┐
│              Category Breakdown                         │
├──────────────────────┬──────────┬──────────────────────┤
│ Category             │ Score    │ Evidence Count       │
├──────────────────────┼──────────┼──────────────────────┤
│ 😡 Toxic Workplace   │ ★★★★☆ 82 │ 15 submissions      │
│ 💰 Wage Abuse        │ ★★★☆☆ 65 │ 8 submissions       │
│ 🌍 Greenwashing      │ ★★☆☆☆ 45 │ 3 submissions       │
│ ...                  │ ...      │ ...                  │
└──────────────────────┴──────────┴──────────────────────┘
```

**Data Flow:**
```
Company Data
  ↓
categoryScores: {
  toxic_workplace: 82,
  wage_abuse: 65,
  greenwashing: 45,
  ...
}
  ↓
CategoryBreakdown maps over categories
  ↓
For each category:
  • Display category name + emoji
  • Show RatingStars component
  • Show evidence count
  • Link to filtered evidence view
```

---

## 📝 EvidenceUpload Component

**File:** `components/EvidenceUpload.tsx`

**Purpose:** Form for users to submit evidence against a company

**Form Structure:**
```
┌──────────────────────────────────────────────────┐
│         Submit Evidence                          │
├──────────────────────────────────────────────────┤
│                                                  │
│  Company: [Dropdown or preset]                   │
│                                                  │
│  Country: [CountrySelect component]              │
│                                                  │
│  ┌────────────────────────────────────────┐     │
│  │  Select Categories to Rate:            │     │
│  │                                         │     │
│  │  ☑ Toxic Workplace  [★★★★☆] Rate: 80  │     │
│  │  ☑ Wage Abuse      [★★☆☆☆] Rate: 40   │     │
│  │  ☐ Greenwashing    [☆☆☆☆☆] (skip)      │     │
│  │  ...                                    │     │
│  └────────────────────────────────────────┘     │
│                                                  │
│  Evidence Details:                               │
│  [Text area for description]                     │
│                                                  │
│  Source URL (optional):                          │
│  [Input field]                                   │
│                                                  │
│  [Submit Evidence] button                        │
│                                                  │
└──────────────────────────────────────────────────┘
```

**Validation Flow:**
```
User fills form
  ↓
Client-side validation
  • At least 1 category selected?
  • Ratings in valid range (0-100)?
  • Evidence description provided?
  ↓
POST to /api/evidence/submit
  ↓
Server-side validation
  • User authenticated?
  • Company exists?
  • Data valid?
  ↓
Save to database
  ↓
Trigger score recalculation
  ↓
Return success
  ↓
Show confirmation + redirect
```

---

## 📊 EvidenceList vs EvidenceListGrouped

### EvidenceList (Simple)
```
┌────────────────────────────────────┐
│ Evidence Submissions               │
├────────────────────────────────────┤
│ [Date] User: John D.               │
│ Rating: ★★★★☆ (80/100)            │
│ "Terrible management..."           │
│────────────────────────────────────│
│ [Date] User: Jane S.               │
│ Rating: ★★☆☆☆ (40/100)            │
│ "Decent benefits but..."           │
│────────────────────────────────────│
│ ...                                │
└────────────────────────────────────┘
```

### EvidenceListGrouped (Organized by Category)
```
┌────────────────────────────────────┐
│ 😡 Toxic Workplace (15)            │
├────────────────────────────────────┤
│ [Date] ★★★★☆ "Micromanagement..." │
│ [Date] ★★★☆☆ "High stress..."     │
│────────────────────────────────────│
│ 💰 Wage Abuse (8)                  │
├────────────────────────────────────┤
│ [Date] ★★★★★ "Below minimum..."   │
│ [Date] ★★★☆☆ "No raises..."       │
│────────────────────────────────────│
│ 🌍 Environmental (3)               │
├────────────────────────────────────┤
│ ...                                │
└────────────────────────────────────┘
```

---

## 🌟 RatingStars Component

**File:** `components/RatingStars.tsx`

**Purpose:** Display or input star ratings (0-5 stars, maps to 0-100 internally)

**Two Modes:**

**Display Mode:**
```tsx
<RatingStars 
  rating={80}      // Shows 4 stars
  readonly={true}
/>

Renders: ★★★★☆
```

**Input Mode:**
```tsx
<RatingStars 
  rating={value}
  onChange={(newRating) => setValue(newRating)}
/>

User can click stars to set rating
```

**Internal Mapping:**
```
Stars    Internal Value
★☆☆☆☆  →  20  (1 star)
★★☆☆☆  →  40  (2 stars)
★★★☆☆  →  60  (3 stars)
★★★★☆  →  80  (4 stars)
★★★★★  → 100  (5 stars)
```

---

## 🔧 Client-Side Utility Components

### ClientCountrySync
```
Purpose: Syncs user's detected country to their profile
Runs: On mount (client-side only)
Flow:
  1. Detect country from browser/IP
  2. Check if different from stored value
  3. Update user profile in DB
  4. Used for regional scoring multipliers
```

### ClientEvidenceLogger
```
Purpose: Logs when user views evidence (analytics)
Runs: When evidence is displayed
Flow:
  1. Track evidence ID + timestamp
  2. Send to analytics/DB
  3. Used for moderation prioritization
```

### EvidenceClientWrapper
```
Purpose: Wrap evidence components with client-side features
Provides:
  • Lazy loading
  • Error boundaries
  • Loading states
```

---

## 🐛 Debug Components

### ScoreDebugPanel
**Shows:**
- Raw score calculation steps
- Category weights applied
- Multipliers (size, ownership, country)
- Final score

**Usage:** Only visible in development or to admins

### JsonLdDebugPanel
**Shows:**
- Generated JSON-LD structured data
- Preview of Google rich results
- Validation errors

**Usage:** SEO debugging

---

## 🎯 Component Usage Patterns

### Pattern 1: Score Display
```tsx
import { RottenScoreMeter } from '@/components/RottenScoreMeter';
import { getRottenFlavor } from '@/lib/flavor-engine';

// In your page/component
const flavor = getRottenFlavor(company.score);

<RottenScoreMeter 
  score={company.score}
  showDetails={true}
/>
```

### Pattern 2: Evidence Submission
```tsx
import { EvidenceUpload } from '@/components/EvidenceUpload';

<EvidenceUpload 
  companyId={company.id}
  companySlug={company.slug}
  onSuccess={() => router.push(`/company/${company.slug}`)}
/>
```

### Pattern 3: Category Breakdown
```tsx
import { CategoryBreakdown } from '@/components/CategoryBreakdown';

<CategoryBreakdown 
  categoryScores={company.category_scores}
  evidenceCounts={company.evidence_counts}
/>
```

---

## 📦 Component Dependencies

```
RottenScoreMeter
  └─► lib/flavor-engine.ts (getRottenFlavor)

CategoryBreakdown
  ├─► RatingStars
  └─► lib/rotten-score.ts (category definitions)

EvidenceUpload
  ├─► CountrySelect
  ├─► RatingStars
  └─► lib/supabase-browser.ts (DB client)

EvidenceList/EvidenceListGrouped
  ├─► RatingStars
  └─► lib/getEvidenceWithManagers.ts
```

---

## 🎨 Styling Approach

All components use:
- **Tailwind CSS** for styling
- **Responsive design** (mobile-first)
- **Consistent color palette** from flavor-engine.ts
- **Accessibility features** (ARIA labels, keyboard nav)

Example:
```tsx
<div className="bg-white rounded-lg shadow-md p-6">
  <h2 className="text-2xl font-bold mb-4">
    Score: {score}
  </h2>
</div>
```

---

## 🔍 Finding Components by Feature

**Want to display a company score?**
→ `RottenScoreMeter.tsx`

**Want to show category details?**
→ `CategoryBreakdown.tsx`

**Want to let users submit evidence?**
→ `EvidenceUpload.tsx`

**Want to show evidence history?**
→ `EvidenceList.tsx` or `EvidenceListGrouped.tsx`

**Want star ratings?**
→ `RatingStars.tsx`

**Want country selection?**
→ `CountrySelect.tsx`

**Need to debug scores?**
→ `ScoreDebugPanel.tsx`

**Need to debug SEO?**
→ `JsonLdDebugPanel.tsx`

---

## 🧪 Testing Components

Most components are client components (`'use client'`) and can be tested with:
```tsx
import { render, screen } from '@testing-library/react';
import { RottenScoreMeter } from '@/components/RottenScoreMeter';

test('displays score correctly', () => {
  render(<RottenScoreMeter score={73} />);
  expect(screen.getByText('73')).toBeInTheDocument();
});
```

---

*All components are designed to be:*
- *Reusable across different pages*
- *Type-safe with TypeScript*
- *Accessible (WCAG compliant)*
- *Performant (lazy loading where appropriate)*
