# 🚀 Quick Start Guide - Rotten Company

**New to the codebase? Start here!** This is your visual roadmap.

---

## ⚡ 5-Minute Overview

**Rotten Company** is a transparency platform that rates companies based on how "rotten" they are (0-100 scale).

```
Users submit evidence → Algorithm calculates score → Display on company page
```

**Key Files You'll Touch:**
- 📊 Scoring logic: `lib/rotten-score.ts`
- 🎨 Display logic: `lib/flavor-engine.ts`
- 📝 Evidence forms: `components/EvidenceUpload.tsx`
- 🌐 API routes: `app/api/*/route.ts`

---

## 📂 Directory Quick Reference

```
├── 📱 app/              Pages & API routes (Next.js App Router)
├── 🧩 components/       Reusable React components
├── 🔧 lib/              Core business logic (the brain)
└── 🎨 public/           Static assets (images, icons)
```

**Rule of thumb:**
- **Need to change how scores are calculated?** → `lib/`
- **Need to change the UI?** → `components/` or `app/`
- **Need to add an API endpoint?** → `app/api/`

---

## 🎯 Common Tasks (Copy-Paste Friendly)

### 1. Run Development Server
```bash
npm run dev
# Open http://localhost:3000
```

### 2. Check for Errors
```bash
npm run lint
```

### 3. Build for Production
```bash
npm run build
```

### 4. Find a File
```bash
# Find all TypeScript files
find . -name "*.ts" -o -name "*.tsx" | grep -v node_modules

# Search for text in code
grep -r "calculateScore" --include="*.ts"
```

---

## 🔍 Find What You Need

### "I want to change how scores are calculated"
→ **File:** `lib/rotten-score.ts`
→ **What it does:** The core algorithm (category weights, multipliers)
→ **Key function:** `calculateRottenScore()`

### "I want to change score colors or labels"
→ **File:** `lib/flavor-engine.ts`
→ **What it does:** Converts numbers (0-100) to text/colors
→ **Key functions:** `getMacroTier()`, `getScoreColor()`

### "I want to change the evidence submission form"
→ **File:** `components/EvidenceUpload.tsx`
→ **What it does:** The form users fill out
→ **Backend:** `app/api/evidence/submit/route.ts`

### "I want to change how company pages look"
→ **File:** `app/company/[slug]/page.tsx`
→ **Components used:**
  - `RottenScoreMeter.tsx` - The score display
  - `CategoryBreakdown.tsx` - Category table
  - `EvidenceList.tsx` - Evidence list

### "I want to change the leaderboard"
→ **File:** `app/rotten-index/page.tsx`
→ **Backend:** `lib/rotten-index.ts`
→ **API:** `app/api/rotten-index/route.ts`

---

## 🎨 The Visual System

### Score Flow (How a number becomes a design)

```
Score: 73.5
    ↓
getMacroTier() → "Corporate Disaster Zone"
    ↓
getScoreColor() → "#B22222" (red)
    ↓
getMicroFlavor() → "A toxic mess with a smile"
    ↓
RottenScoreMeter component renders all of this
```

### Color Palette

```css
/* Score-based colors */
 0-15:  #2E8B57  /* Green - Clean */
15-30:  #A9A9A9  /* Gray - Minor issues */
30-45:  #CD853F  /* Tan - Noticeable */
45-60:  #DAA520  /* Gold - Warning */
60-75:  #D2691E  /* Orange - Serious */
75-90:  #B22222  /* Red - Very bad */
90-100: #8B0000  /* Dark red - Rotten */
```

---

## 📊 The 18 Harm Categories

```
👥 LABOR (32% of score - most important)
  • toxic_workplace (11%)
  • wage_abuse (8%)
  • discrimination_harassment (7%)
  • union_busting (6%)

🌍 ENVIRONMENTAL (20%)
  • pollution_environmental_damage (10%)
  • greenwashing (5%)
  • climate_obstruction (5%)

🛒 CONSUMER (20%)
  • customer_trust (6%)
  • unfair_pricing (6%)
  • product_safety_failures (4%)
  • privacy_data_abuse (4%)

⚖️ GOVERNANCE (14%)
  • ethics_failures (5%)
  • fraud_financial_misconduct (5%)
  • corruption_bribery (4%)

🏘️ SOCIAL (6%)
  • community_harm (3%)
  • public_health_risk (3%)

🏷️ BRAND (8%)
  • broken_promises (4%)
  • misleading_marketing (4%)
```

**Why these weights?**
Labor issues affect the most people → weighted highest.

---

## 🔄 How Evidence Becomes a Score

```
1. User fills EvidenceUpload form
   • Selects company
   • Rates categories (0-100)
   • Adds description
   
2. POST /api/evidence/submit
   • Validates data
   • Saves to Supabase
   
3. Trigger score recalculation
   • Fetch all evidence for company
   • Group by category
   • Calculate weighted average
   • Apply multipliers (size, ownership, region)
   
4. Update database
   • Store new score
   • Update category breakdowns
   
5. Display on company page
   • RottenScoreMeter shows new score
   • Updated colors/labels
```

---

## 🗄️ Database (Supabase)

**Main Tables:**
- `companies` - Company profiles + scores
- `evidence` - User submissions
- `categories` - Category definitions
- `users` - User accounts

**Which Supabase client to use?**
```typescript
// In browser/client components
import { createBrowserClient } from '@/lib/supabase-browser'

// In server components
import { createServerClient } from '@/lib/supabase-server'

// In API routes
import { createRouteHandlerClient } from '@/lib/supabase-route'

// For admin/service operations
import { createServiceClient } from '@/lib/supabase-service'
```

---

## 🧩 Component Cheat Sheet

### Display a Score
```tsx
import { RottenScoreMeter } from '@/components/RottenScoreMeter';

<RottenScoreMeter 
  score={73.5} 
  showDetails={true}
/>
```

### Show Category Breakdown
```tsx
import { CategoryBreakdown } from '@/components/CategoryBreakdown';

<CategoryBreakdown 
  categoryScores={company.category_scores}
  evidenceCounts={company.evidence_counts}
/>
```

### Star Rating Input
```tsx
import { RatingStars } from '@/components/RatingStars';

<RatingStars 
  rating={value}
  onChange={(newRating) => setValue(newRating)}
/>
```

---

## 📖 Documentation Map

**Just getting started?**
→ You're reading it! (QUICKSTART.md)

**Want to understand the architecture?**
→ Read `ARCHITECTURE.md` (full system overview)

**Need component details?**
→ Read `COMPONENT_MAP.md` (React components)

**Working with APIs?**
→ Read `API_GUIDE.md` (API routes & flows)

**Want to modify scoring logic?**
→ Read the comments in `lib/rotten-score.ts` (has visual diagrams)

---

## 🐛 Debugging Tips

### Score seems wrong?
1. Check `lib/rotten-score.ts` - are category weights correct?
2. Check multipliers - size, ownership, region
3. Use `ScoreDebugPanel.tsx` component to see calculation steps

### Colors/text wrong?
1. Check `lib/flavor-engine.ts` - tier boundaries
2. Check `lib/micro-flavors.ts` - 101 flavor texts

### Form not submitting?
1. Check browser console for errors
2. Check `/api/evidence/submit/route.ts` logs
3. Verify Supabase connection

### Can't find a file?
1. Use command: `find . -name "filename.ts"`
2. Or search in your editor (Cmd+P in VSCode)

---

## 💡 Pro Tips

### Tip 1: Start with Examples
Before writing new code, find similar existing code:
```bash
# Find existing API routes
ls app/api/*/route.ts

# Find similar components
ls components/*Score*.tsx
```

### Tip 2: Use TypeScript Hints
The codebase is fully typed. Let TypeScript guide you:
```typescript
// Hover over functions to see what they expect
const flavor = getRottenFlavor(score);
//    ^ TypeScript shows: returns RottenFlavor object
```

### Tip 3: Follow the Data Flow
Evidence → Score → Display is the core flow. Trace it:
1. `EvidenceUpload.tsx` (form)
2. `app/api/evidence/submit/route.ts` (save)
3. `lib/rotten-score.ts` (calculate)
4. `RottenScoreMeter.tsx` (display)

### Tip 4: Use Visual Grep
Search for visual clues in comments:
```bash
grep -r "🎯" lib/
grep -r "VISUAL FLOW" lib/
grep -r "═══" lib/
```

---

## 🎓 Learning Path

**Day 1: Exploration**
1. ✅ Read this guide (QUICKSTART.md)
2. Run `npm run dev` and browse the site
3. Open `app/page.tsx` - simplest file
4. Browse `components/` folder

**Day 2: Components**
1. Read `COMPONENT_MAP.md`
2. Look at `RottenScoreMeter.tsx` - key component
3. Try modifying a component color

**Day 3: Business Logic**
1. Read the diagrams in `lib/rotten-score.ts`
2. Understand the 18 categories
3. See how multipliers work

**Day 4: Full Stack**
1. Read `API_GUIDE.md`
2. Trace evidence submission flow end-to-end
3. Try adding a console.log in an API route

**Week 2: You're ready to contribute!**

---

## 🆘 Still Stuck?

### Ask These Questions:

**"What does this file do?"**
→ Read the header comment (most files have visual diagrams)

**"Where is X feature implemented?"**
→ Search codebase: `grep -r "feature name"`

**"How do I test this?"**
→ `npm run dev` and manually test in browser

**"This is broken, what do I do?"**
→ Check if it's actually your code or pre-existing issue
→ Run `git status` to see what you changed

---

## 🔗 Quick Links

- [Next.js Docs](https://nextjs.org/docs) - Framework we use
- [Tailwind CSS](https://tailwindcss.com/docs) - Styling
- [Supabase Docs](https://supabase.com/docs) - Database
- [TypeScript Handbook](https://www.typescriptlang.org/docs/) - Language

---

## 📋 Checklists

### Before Making Changes
- [ ] Read relevant documentation file
- [ ] Find similar existing code
- [ ] Understand the data flow
- [ ] Run dev server to see current behavior

### Before Committing
- [ ] Code runs without errors (`npm run dev`)
- [ ] Linter passes (`npm run lint`)
- [ ] Tested manually in browser
- [ ] Added/updated comments if needed

### Before Asking for Help
- [ ] Checked relevant doc file (ARCHITECTURE, COMPONENT_MAP, API_GUIDE)
- [ ] Searched codebase for similar code
- [ ] Checked browser console for errors
- [ ] Tried basic debugging (console.log)

---

**Remember:** The codebase has visual documentation everywhere!
Look for comments with:
- `═══` (section dividers)
- `🎯 ⚖️ 🌍 👥` (emojis marking key sections)
- ASCII art diagrams
- Flow charts in comments

**Happy coding! 🚀**
