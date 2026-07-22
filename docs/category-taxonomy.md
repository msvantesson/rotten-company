# Category Taxonomy — Source of Truth

## Rule

**`categories.name` is the only source of truth for all user-facing category labels.**

| Column | Purpose | Mutable? |
|--------|---------|----------|
| `categories.id` | Surrogate key (integer) | ❌ Immutable |
| `categories.slug` | Immutable internal identifier used for routing, logic, and joins | ❌ Immutable |
| `categories.name` | User-facing display label shown in all UI | ✅ Mutable (rename workflow below) |

### What this means in practice

- **UI pages** must always render category names from a query result (`category.name`), never from a local constant or string literal.
- **Scoring logic** (`lib/rotten-score.ts`) uses internal category IDs/slugs — these are *not* display labels.
- **Help text** (`lib/category-help.ts`) is keyed by slug and provides definitions/examples — these are *not* category display names.
- **Flavor copy** (`lib/flavor-engine.ts`) is keyed by category ID — this is editorial flavor text, *not* the category display name.

---

## Canonical data access layer

Use `lib/categories.ts` to fetch category data in any page or component:

```ts
// Server Component / Route Handler
import { getAllCategoriesServer } from "@/lib/categories";
const supabase = await supabaseServer();
const categories = await getAllCategoriesServer(supabase);

// Client Component
import { getAllCategoriesClient } from "@/lib/categories";
const supabase = supabaseBrowser();
const categories = await getAllCategoriesClient(supabase);
```

Both helpers return `Category[]`:

```ts
type Category = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
};
```

---

## Current category taxonomy

As of the most recent migration:

| id | slug | name |
|----|------|------|
| 1 | `broken_promises` | Corporate Misconduct |
| 2 | `exploitation` | Human Rights & Exploitation |
| 3 | `fraud` | Fraud & Corruption |
| 4 | `false_claims` | Deceptive Practices |
| 5 | `environmental_damage` | Environmental Harm |
| 6 | `greenwashing` | Sustainability Deception |
| 13 | `management_by_fear` | Workplace Misconduct |
| 19 | `private-equity-fallout` | Financial Misconduct |

> **Note:** Slugs are immutable identifiers. Never rename a slug once it is in production — use `name` for rename operations.

---

## Rename workflow

To rename a category display label:

1. **Write a migration** that updates `categories.name`:

   ```sql
   UPDATE categories SET name = 'New Display Name' WHERE slug = 'existing-slug';
   ```

2. **Apply the migration** to production Supabase.

3. **Verify** the change:

   ```sql
   SELECT id, slug, name FROM categories ORDER BY id;
   ```

4. **No UI code changes required.** Because every page reads `categories.name` from the DB, the rename is immediately reflected everywhere.

5. **Update this document** to reflect the new name in the taxonomy table above.

6. **Update `scripts/check-category-names.mjs`** to replace the old name with the new name in the `CATEGORY_DISPLAY_NAMES` list so the regression guard stays current.

---

## Regression guard

The script `scripts/check-category-names.mjs` fails if any known production category display name is found hardcoded in runtime source files (`app/`, `components/`, `lib/`).

```bash
npm run check:category-names
```

**Allowlisted locations** (hardcoded names permitted):
- `supabase/` — migrations and seed files
- `docs/` — documentation (this file)
- `scripts/` — the check script itself

---

## What NOT to do

```ts
// ❌ Never hardcode category display names
const categoryLabel = "Environmental Harm";

// ❌ Never build a local map of names
const CATEGORY_NAMES: Record<number, string> = {
  5: "Environmental Harm",
};

// ✅ Always read from the DB result
const { name } = category; // category came from a DB query
```

---

## Background

The category rename from legacy names (e.g. "Broken promises", "Greenwashing") to the current names (e.g. "Corporate Misconduct", "Sustainability Deception") was applied via migration `supabase/migrations/20260722000001_rename_category_display_names.sql`. Any future renames must follow the workflow above.
