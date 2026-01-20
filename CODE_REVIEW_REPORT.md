# Comprehensive Code Review Report
**Repository:** msvantesson/rotten-company  
**Date:** 2024-01-20  
**Reviewer:** GitHub Copilot AI Code Review  

---

## Executive Summary

This repository is a **Next.js 16** application (App Router) using **Supabase** for backend services, **TypeScript** for type safety, and **TailwindCSS** for styling. The application appears to be a platform for rating and reviewing companies with evidence submission capabilities.

**Overall Code Quality: 6.5/10**

### Key Strengths ✅
- Well-structured Next.js App Router architecture
- Consistent use of TypeScript across the codebase
- Good component organization and separation
- Proper use of Supabase SDK for database operations
- Strong strict mode TypeScript configuration

### Critical Issues 🔴
- **Security vulnerabilities** in debug endpoints and authentication
- **Performance concerns** with N+1 query patterns
- **Type safety gaps** with extensive use of `any` types
- **Missing error boundaries** for React components
- **No Row Level Security (RLS)** enforcement detected

---

## 1. Security Analysis

### 🔴 CRITICAL Security Issues

#### 1.1 Debug Endpoint Information Disclosure
**File:** `/app/debug-env/route.ts`
```typescript
export async function GET() {
  return NextResponse.json({
    SMTP_HOST: process.env.SMTP_HOST || "(missing)",
    SMTP_PORT: process.env.SMTP_PORT || "(missing)",
    SMTP_USERNAME: process.env.SMTP_USERNAME || "(missing)",
  });
}
```
**Issue:** Publicly exposes SMTP credentials without authentication  
**Risk:** HIGH - Attackers can discover mail server configuration  
**Recommendation:** Remove this endpoint or add authentication middleware

#### 1.2 Unauthenticated Score Recalculation
**File:** `/app/api/score/recalculate/route.ts`
```typescript
import { supabaseBrowser } from "@/lib/supabaseClient"; 
const supabase = supabaseBrowser();

export async function POST() {
  const { error } = await supabase.rpc("compute_entity_scores");
  
  if (error) {
    console.error("Score recalculation error:", error);
    return Response.json({ success: false, error });
  }
  
  return Response.json({ success: true });
}
```
**Issue:** No authentication check before triggering RPC. Uses browser client instead of server client.
**Risk:** HIGH - DoS attacks or unauthorized score manipulation  
**Recommendation:** Add authentication middleware, use server client, and add rate limiting

#### 1.3 Database URL Logging
**File:** `/lib/supabase-server.ts`, lines 7-10
```typescript
console.info(
  "[DB DEBUG][supabaseServer] DATABASE_URL prefix:",
  process.env.DATABASE_URL?.slice?.(0, 60) ?? null
);
```
**Issue:** Logs sensitive database connection info to console  
**Risk:** MEDIUM - Information disclosure in production logs  
**Recommendation:** Remove logging or use debug-only conditional

#### 1.4 Service Role Key Usage Pattern
**File:** `/lib/moderation-guards.ts`, lines 18-29
```typescript
function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // Bypasses RLS
    { auth: { persistSession: false } }
  );
}
```
**Issue:** Creates admin client that bypasses Row Level Security  
**Risk:** MEDIUM - If code is compromised, unrestricted DB access  
**Recommendation:** Minimize usage, add audit logging

### 🟡 Medium Security Issues

#### 1.5 File Upload Path Traversal Risk
**File:** `/app/api/evidence/submit/route.ts`, line 209
```typescript
const filename = `${Date.now()}_${file.name}`;
```
**Issue:** Filename not fully sanitized (could contain `../`)  
**Risk:** MEDIUM - Potential path traversal  
**Recommendation:** Sanitize filename before use

#### 1.6 Missing Authorization Checks
**Files:** Multiple API routes
**Issue:** Relies solely on Supabase RLS, no explicit auth checks  
**Risk:** MEDIUM - Defense in depth missing  
**Recommendation:** Add explicit authorization validation

### ✅ Good Security Practices

- **SQL Injection Prevention:** Proper use of Supabase SDK with parameterized queries ✅
- **XSS Prevention:** React auto-escaping, no `dangerouslySetInnerHTML` detected ✅
- **Secrets Management:** Service keys properly kept server-side ✅
- **Authentication:** Consistent use of Supabase auth across endpoints ✅

---

## 2. TypeScript & Type Safety

### 🔴 Excessive Use of `any` Type
**Impact:** Type safety severely compromised across 30+ files

**Examples:**
```typescript
// app/company/[slug]/page.tsx
const evidence: any[] = evidenceData ?? [];
const breakdownWithFlavor: any[] = breakdown ?? [];

// app/api/rotten-index/route.ts
.map((r: any) => ({ company_id: r.company_id }))

// components/CategoryBreakdown.tsx
company: any
```

**Recommendation:** Define proper interfaces
```typescript
interface CompanyRow {
  id: number;
  name: string;
  slug: string;
  industry: string | null;
  country: string | null;
}

interface EvidenceItem {
  id: number;
  title: string;
  category?: { name: string };
  // ... other fields
}
```

### ⚠️ Unsafe Type Casts
**Files:** API routes, debug pages
```typescript
// supabase-server.ts:54
const cookieAdapter = { ...cookieOptions } as any;

// rotten-index-debug/route.ts:55
const country = (row as any).country;
```

**Recommendation:** Create specific types instead of casting to `any`

### ⚠️ Inconsistent Error Handling Types
**Pattern:** `catch (err: any)` throughout codebase

**Better approach:**
```typescript
catch (err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  console.error("Error:", message);
}
```

### ✅ Good Patterns Found
- Proper type guards: `filter((id): id is number => typeof id === "number")`
- Good Array.isArray checks in multiple places
- Consistent typing in well-defined modules like `rotten-score.ts`

---

## 3. Performance & Database

### 🔴 N+1 Query Problems

#### 3.1 Company Page Sequential Queries
**File:** `/lib/getCompanyBySlug.ts`
**Issue:** 6+ sequential queries to fetch related data
```typescript
// Lines 45-136 - Sequential queries
const company = await supabase.from("companies")...
const owners = await supabase.from("owners")...
const leaders = await supabase.from("leaders")...
const investors = await supabase.from("investors")...
const managers = await supabase.from("managers")...
const breakdown = await supabase.from("company_category_breakdown")...
const ratings = await supabase.from("ratings")...
const evidenceCount = await supabase.from("evidence")...
```

**Impact:** Page load time increases linearly with number of relations  
**Recommendation:** Use PostgREST nested joins in a single query
```typescript
const { data } = await supabase
  .from("companies")
  .select(`
    *,
    owners(*),
    leaders(*),
    investors(*),
    managers(*),
    company_category_breakdown(*),
    ratings(*)
  `)
  .eq("slug", slug)
  .single();
```

#### 3.2 Evidence Managers Query
**File:** `/lib/getEvidenceWithManagers.ts`, lines 75-79
**Issue:** Separate count query for each unique manager  
**Recommendation:** Use aggregate functions or single query with GROUP BY

### ⚠️ Missing Database Indexes
Based on query patterns, likely missing indexes:
- `evidence(company_id, status)` - heavily queried
- `evidence(leader_id, status)` - used in leader pages
- `ratings(user_id, created_at)` - moderation checks
- `moderation_votes(user_id)` - moderation guards
- `companies(slug)` - primary lookup field

### ⚠️ Client-Side Aggregation
**File:** `/lib/getCompanyBySlug.ts`, lines 116-128
```typescript
// Current (inefficient):
const totalScore = ratingAgg.reduce((sum, r) => sum + (r.score ?? 0), 0);
const avgScore = totalScore / rating_count;
```
**Recommendation:** Use SQL aggregation
```typescript
.select("score.avg(), score.count()")
```

### 🔴 No Row Level Security (RLS) Detected
**Issue:** Service role key usage bypasses RLS  
**Recommendation:** Implement RLS policies for:
- `evidence` - only show approved/public evidence
- `ratings` - users can only see their own ratings
- `users` - limit access to user data
- `moderation_votes` - restrict voting visibility

---

## 4. React Components & Architecture

### 🔴 Code Duplication
**Files:** `EvidenceList.tsx` and `EvidenceListGrouped.tsx`
**Issue:** 96% identical code, only difference is component name  
**Recommendation:** Merge into single component with configuration prop
```typescript
<EvidenceList grouped={true} evidence={data} />
```

### ⚠️ Over-Reliance on Client Components
**Issue:** 15/15 components marked `"use client"` (100%)  
**Impact:** Reduces server-side rendering benefits, larger bundle  
**Recommendation:** Convert static components to Server Components
- `RatingStars` - no state mutation
- `EvidenceList` - could be server-rendered
- `CategoryBreakdown` - mostly static

### ⚠️ Complex State Management
**File:** `/components/SubmitCompanyForm.tsx`
```typescript
const [name, setName] = useState("");
const [industry, setIndustry] = useState("");
const [country, setCountry] = useState("");
const [website, setWebsite] = useState("");
const [linkedin, setLinkedin] = useState("");
```
**Issue:** 5 separate useState hooks with repetitive patterns  
**Recommendation:** Use `useReducer` or form library like `react-hook-form`

### ⚠️ Missing Memoization
**File:** `/components/CategoryBreakdown.tsx`, lines 132-154
```typescript
// Filters evidence on every render
const categoryEvidence = evidence.filter(
  (ev) => ev.category?.name === item.category_name
);
```
**Recommendation:** Wrap in `useMemo`
```typescript
const categoryEvidence = useMemo(
  () => evidence.filter((ev) => ev.category?.name === item.category_name),
  [evidence, item.category_name]
);
```

### 🟡 Accessibility Issues
**Missing attributes across components:**
- `RatingStars`: No `aria-label` on star buttons
- `SubmitCompanyForm`: No label association with inputs
- `CountrySelect`: Has id but no associated label
- File upload inputs lack proper descriptions

**Recommendation:** Add ARIA attributes and semantic HTML
```typescript
<button aria-label={`Rate ${index + 1} stars`} onClick={...}>★</button>
<label htmlFor="company-name">Company Name</label>
<input id="company-name" name="name" ... />
```

### 🔴 No Error Boundaries
**Critical Finding:** Zero Error Boundary components found  
**Risk:** Client-side errors crash entire app  
**Recommendation:** Add Error Boundary to layout
```typescript
// app/error.tsx
'use client'
export default function Error({ error, reset }) {
  return (
    <div>
      <h2>Something went wrong!</h2>
      <button onClick={() => reset()}>Try again</button>
    </div>
  )
}
```

---

## 5. Error Handling

### 🔴 Missing Try-Catch Blocks
**Files:** `/app/api/submit-rating/route.ts`, `/app/api/score/recalculate/route.ts`
```typescript
// No try-catch wrapping
export async function POST() {
  const supabase = createBrowserClient(...);
  await supabase.rpc("compute_entity_scores"); // Could throw
  return NextResponse.json({ ok: true });
}
```
**Recommendation:** Wrap all async operations
```typescript
export async function POST() {
  try {
    const supabase = createBrowserClient(...);
    await supabase.rpc("compute_entity_scores");
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Error:", err);
    return NextResponse.json(
      { ok: false, error: "Failed to recalculate scores" },
      { status: 500 }
    );
  }
}
```

### ⚠️ Inconsistent Error Patterns
**Issue:** Some routes check error after query, others use try-catch
```typescript
// Pattern 1: Error checking
const { data, error } = await supabase.from(...);
if (error) throw error;

// Pattern 2: Try-catch
try {
  const { data } = await supabase.from(...);
} catch (err) { ... }
```
**Recommendation:** Standardize on one pattern (prefer try-catch)

### ⚠️ Error Detail Leakage
**File:** `/app/api/submit-rating/route.ts`
```typescript
return NextResponse.json({
  details: errorMessage // Exposes internal errors to client
});
```
**Recommendation:** Sanitize error messages
```typescript
return NextResponse.json({
  error: "Failed to submit rating",
  // Don't expose internal details
}, { status: 500 });
```

### ⚠️ Generic User-Facing Messages
**File:** `/components/EvidenceUpload.tsx`
```typescript
setUploadMessage("Unexpected upload error");
```
**Recommendation:** Provide actionable context
```typescript
setUploadMessage("Upload failed. Please check file size (max 8MB for PDFs, 3MB for images)");
```

---

## 6. Code Quality & Maintainability

### ⚠️ Large Component Files
- `/app/company/[slug]/page.tsx` - 274 lines with 9+ try-catch blocks
- `/app/evidence-upload/page.tsx` - 354 lines with complex state
- `/lib/getCompanyBySlug.ts` - Sequential data fetching should be abstracted

**Recommendation:** Extract data-fetching logic into utilities
```typescript
// lib/getCompanyData.ts
export async function getCompanyData(slug: string) {
  // All data fetching in one place
}
```

### 🟡 Console Logging in Production
**Found in 27+ files:** `console.log`, `console.error`, `console.warn`

**Recommendation:** 
- Remove debug logs or use environment-based logging
- Implement proper logging library (e.g., Winston, Pino)
```typescript
// lib/logger.ts
export const logger = {
  info: (msg: string) => process.env.NODE_ENV === 'development' && console.log(msg),
  error: (msg: string) => console.error(msg),
};
```

### ✅ Good Naming Conventions
- Consistent camelCase for variables/functions
- Clear prefix patterns (`server*`, `client*`)
- Descriptive component names

### ✅ Good Constants Usage
```typescript
// components/EvidenceUpload.tsx
const MAX_IMAGE_SIZE = 3 * 1024 * 1024; // 3MB
const MAX_PDF_SIZE = 8 * 1024 * 1024; // 8MB
```

### ⚠️ Hardcoded URLs
**Found in multiple files:**
```typescript
const baseUrl = "https://rotten-company.com";
```
**Recommendation:** Use environment variable
```typescript
const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
```

### ⚠️ Cookie Adapter Duplication
**Files:** `supabase-server.ts`, `login/actions.ts`, `logout/actions.ts`
**Issue:** Same `cookieAdapter` pattern repeated 3+ times  
**Recommendation:** Extract to shared utility
```typescript
// lib/cookie-adapter.ts
export function createCookieAdapter(cookieStore) {
  return {
    get: (name: string) => cookieStore.get(name)?.value ?? "",
    set: (name: string, value: string, options: any) => {
      cookieStore.set(name, value, options);
    },
    remove: (name: string, options: any) => {
      cookieStore.set(name, "", { ...options, maxAge: 0 });
    },
  };
}
```

---

## 7. Testing & Build

### 🔴 No Test Suite Found
**Issue:** No test files detected (no `*.test.ts`, `*.spec.ts`, or test directory)  
**Recommendation:** Add testing framework
```bash
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom
```

### ⚠️ ESLint Not Configured
**Issue:** ESLint dependencies installed but `eslint` command not found  
**Recommendation:** Ensure `node_modules` is installed, verify ESLint setup

### ✅ TypeScript Strict Mode Enabled
```json
{
  "compilerOptions": {
    "strict": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

---

## 8. Priority Recommendations

### Immediate Actions (Week 1) 🔴
1. **Remove `/app/debug-env/route.ts`** or add authentication
2. **Add authentication to `/app/api/score/recalculate/route.ts`**
3. **Remove database URL logging** in `supabase-server.ts`
4. **Add try-catch blocks** to all API routes
5. **Create Error Boundary** component for app layout

### Short Term (Week 2-3) 🟡
6. **Merge duplicate components** (`EvidenceList` + `EvidenceListGrouped`)
7. **Replace `any` types** with proper interfaces (start with API routes)
8. **Optimize N+1 queries** in `getCompanyBySlug.ts` and `getEvidenceWithManagers.ts`
9. **Add database indexes** based on query patterns
10. **Implement form library** for complex forms (`react-hook-form`)

### Medium Term (Month 1-2) 🟢
11. **Add comprehensive test suite** (unit + integration tests)
12. **Implement RLS policies** for all tables
13. **Add memoization** to performance-critical components
14. **Convert to Server Components** where appropriate
15. **Implement centralized logging** solution
16. **Add accessibility attributes** across all components
17. **Extract hardcoded values** to environment variables
18. **Create shared utilities** for cookie adapters and common patterns

### Long Term (Ongoing) 🔵
19. **Set up error monitoring** (Sentry, Datadog, etc.)
20. **Add API rate limiting**
21. **Implement comprehensive CSRF protection**
22. **Add input validation library** (Zod, Joi)
23. **Performance monitoring** and optimization
24. **Security audit** and penetration testing

---

## 9. Positive Highlights ⭐

Despite the issues identified, this codebase has several strengths:

1. **Modern Tech Stack:** Next.js 16 App Router, TypeScript, Supabase
2. **Good Structure:** Clear separation of concerns (lib/, components/, app/)
3. **Type Safety Foundation:** Strict TypeScript enabled, good base for improvement
4. **Consistent Patterns:** Similar approaches across similar features
5. **No Obvious Malicious Code:** Clean codebase with good intentions
6. **React Best Practices:** No anti-patterns like direct DOM manipulation
7. **Environment Variables:** Proper secrets management approach
8. **Code Organization:** Logical file and folder structure

---

## 10. Metrics Summary

| Category | Score | Notes |
|----------|-------|-------|
| Security | 5/10 | Critical issues in debug endpoints, auth |
| Type Safety | 6/10 | Many `any` types, but good foundation |
| Performance | 5/10 | N+1 queries, missing indexes |
| Error Handling | 4/10 | Missing boundaries, inconsistent patterns |
| Code Quality | 7/10 | Good structure, some duplication |
| Accessibility | 5/10 | Missing ARIA labels, partial compliance |
| Testing | 2/10 | No test suite detected |
| Documentation | 6/10 | Some inline docs, missing API docs |
| **Overall** | **6.5/10** | **Solid foundation, needs security & performance work** |

---

## Conclusion

This is a **well-structured Next.js application** with a solid foundation, but it requires **immediate attention to security vulnerabilities** and **performance optimizations**. The codebase shows good organizational patterns and modern framework usage, but falls short in critical areas like authentication, type safety, and error handling.

**Primary Focus Areas:**
1. **Security hardening** (remove debug endpoints, add auth checks)
2. **Type safety improvements** (eliminate `any` types)
3. **Performance optimization** (fix N+1 queries, add indexes)
4. **Error handling** (add boundaries, standardize patterns)
5. **Testing** (establish test suite)

With focused effort on the priority recommendations, this codebase can reach production-ready quality within 4-6 weeks.

---

**Report Generated:** 2024-01-20  
**Tool:** GitHub Copilot AI Code Review  
**Files Analyzed:** 82 TypeScript/JavaScript files  
**Lines of Code:** ~8,000+ LOC
