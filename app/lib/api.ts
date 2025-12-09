// app/lib/api.ts
import { supabase } from "./supabaseClient";

export async function fetchEntityBySlug(
  kind: "company" | "leader" | "manager" | "owner",
  slug: string
) {
  const table =
    kind === "company"
      ? "companies"
      : kind === "leader"
      ? "leaders"
      : kind === "manager"
      ? "managers"
      : "owners_investors";

  const { data, error } = await supabase
    .from(table)
    .select("*")
    .eq("slug", slug)
    .single();

  if (error) throw error;
  return data;
}

export async function fetchApprovedEvidence(
  kind: "company" | "leader" | "manager" | "owner",
  id: number
) {
  const col =
    kind === "company"
      ? "company_id"
      : kind === "leader"
      ? "leader_id"
      : kind === "manager"
      ? "manager_id"
      : "owner_id";

  const { data, error } = await supabase
    .from("evidence")
    .select("*")
    .eq(col, id)
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}
