export const dynamic = "force-dynamic";
export const dynamicParams = true;
export const fetchCache = "force-no-store";

import { supabaseServer } from "@/lib/supabase-server";
import { approveEvidence, rejectEvidence } from "./actions";

export default async function ModerationPage() {
  const supabase = await supabaseServer();

  const { data: evidence, error } = await supabase
    .from("evidence")
    .select(`
      id,
      title,
      summary,
      contributor_note,
      created_at,
      companies ( name ),
      company_requests ( name ),
      users ( email )
    `)
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (error || !evidence) {
    return (
      <main style={{ padding: "2rem", maxWidth: 1000 }}>
        <h1>Moderation Dashboard</h1>
        <p style={{ color: "red" }}>Error loading moderation
