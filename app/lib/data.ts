// app/lib/data.ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Fetch a single entity by slug.
 * Handles pluralization and special cases (categories, owners_investors).
 */
export async function fetchEntityBySlug(
  entity: "company" | "leader" | "manager" | "owner" | "category",
  slug: string
) {
  let table: string;

  switch (entity) {
    case "owner":
      table = "owners_investors";
      break;
    case "category":
      table = "categories"; // ✅ correct plural
      break;
    default:
      table = `${entity}s`;
  }

  const { data, error } = await supabase
    .from(table)
    .select("*")
    .eq("slug", slug)
    .single();

  if (error) {
    console.error(`Error fetching ${entity} with slug ${slug}:`, error);
    return null;
  }

  return data;
}

/**
 * Fetch approved evidence linked to an entity.
 */
export async function fetchApprovedEvidence(
  entity: "company" | "leader" | "manager" | "owner" | "category",
  entityId: number
) {
  const { data, error } = await supabase
    .from("evidence")
    .select("*")
    .eq("entity_type", entity)
    .eq("entity_id", entityId)
    .eq("status", "approved");

  if (error) {
    console.error(`Error fetching evidence for ${entity} ${entityId}:`, error);
    return [];
  }

  return data || [];
}
