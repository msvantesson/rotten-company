/**
 * Canonical category data access layer.
 *
 * This is the single place in the codebase that reads category data from the
 * database. All pages and components that need to display category labels must
 * use this module rather than querying `categories` directly or using
 * hard-coded display-name strings.
 *
 * Taxonomy contract
 * -----------------
 * - `categories.slug`  — immutable internal identifier (used for routing,
 *                         scoring logic, and joins). Never changes once set.
 * - `categories.name`  — the sole user-facing display label. Updating this
 *                         column is the *only* step required to rename a
 *                         category across the entire application.
 *
 * See docs/category-taxonomy.md for the full contract and rename workflow.
 */

export type Category = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
};

// ---------------------------------------------------------------------------
// Server-side helpers (use in Next.js Server Components / Route Handlers)
// ---------------------------------------------------------------------------

/**
 * Fetch all categories ordered by id, using the provided Supabase server
 * client.  Returns an empty array on error so callers can handle gracefully.
 *
 * @example
 * const supabase = await supabaseServer();
 * const categories = await getAllCategoriesServer(supabase);
 */
export async function getAllCategoriesServer(
  supabase: import("@supabase/supabase-js").SupabaseClient,
): Promise<Category[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("id, slug, name, description")
    .order("id", { ascending: true });

  if (error) {
    console.error("[categories] Failed to load categories:", error.message);
    return [];
  }

  return (data ?? []) as Category[];
}

/**
 * Fetch a single category by slug, using the provided Supabase server client.
 * Returns null if not found or on error.
 */
export async function getCategoryBySlugServer(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  slug: string,
): Promise<Category | null> {
  const { data, error } = await supabase
    .from("categories")
    .select("id, slug, name, description")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    console.error(
      `[categories] Failed to load category slug="${slug}":`,
      error.message,
    );
    return null;
  }

  return (data as Category | null) ?? null;
}

// ---------------------------------------------------------------------------
// Client-side helpers (use in Client Components via supabaseBrowser())
// ---------------------------------------------------------------------------

/**
 * Fetch all categories ordered by id, using the provided Supabase browser
 * client.  Returns an empty array on error.
 *
 * @example
 * const supabase = supabaseBrowser();
 * const categories = await getAllCategoriesClient(supabase);
 */
export async function getAllCategoriesClient(
  supabase: import("@supabase/supabase-js").SupabaseClient,
): Promise<Category[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("id, slug, name, description")
    .order("id", { ascending: true });

  if (error) {
    console.error("[categories] Failed to load categories:", error.message);
    return [];
  }

  return (data ?? []) as Category[];
}
