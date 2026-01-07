import { supabase } from "@/lib/supabaseClient";

export async function POST() {
  const { error } = await supabase.rpc("compute_entity_scores");

  if (error) {
    console.error("Score recalculation error:", error);
    return Response.json({ success: false, error });
  }

  return Response.json({ success: true });
}
