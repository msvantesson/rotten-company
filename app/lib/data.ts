// app/lib/data.ts
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * Fetch a single entity by slug.
 * Supports: company, leader, manager, owner
 */
export async function fetchEntityBySlug(
  entity: "company" | "leader" | "manager" | "owner",
  slug: string
) {
  // Table names: companies, leaders, managers, owners_investors
  const table = entity === "owner" ? "owners_investors" : `${entity}s`;

  const { data, error } = await supabase
    .from(table)
    .select("*")
    .eq("slug", slug)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Fetch approved evidence linked to an entity.
 * Uses correct FK column names from schema.
 */
export async function fetchApprovedEvidence(
  entity: "company" | "leader" | "manager" | "owner",
  entityId: number
) {
  // FK columns: company_id, leader_id, manager_id, owner_id
  const column = entity === "owner" ? "owner_id" : `${entity}_id`;

  const { data, error } = await supabase
    .from("evidence")
    .select("*")
    .eq(column, entityId)
    .eq("status", "approved");

  if (error) throw error;
  return data || [];
}
