"use server";

import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase-server";
import { createClient } from "@supabase/supabase-js";
import { getModerationGateStatus } from "@/lib/moderation-guards";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}

/**
 * Assign the next pending evidence request (FIFO) to the current moderator.
 * Only allowed if:
 * - user is logged in
 * - user is in `moderators`
 * - moderation gate status `allowed === true`
 * - they do NOT already have an assigned pending evidence request
 *
 * NOTE: name kept as assignNextCompanyRequest so existing imports keep working.
 */
export async function assignNextCompanyRequest() {
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id ?? null;

  if (!userId) {
    redirect(
      "/login?reason=moderate-evidence-requests&message=" +
        encodeURIComponent("You’ll need an account to access evidence requests."),
    );
  }

  const gate = await getModerationGateStatus();
  if (!gate.allowed) {
    // They haven’t done required evidence moderations; just bounce back.
    redirect("/moderation/company-requests");
  }

  const admin = adminClient();

  // Check moderator role
  const { data: modRow } = await admin
    .from("moderators")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (!modRow) {
    redirect("/moderation/company-requests");
  }

  // Do they already have an assigned pending evidence request?
  const { data: existing } = await admin
    .from("evidence")
    .select("id")
    .eq("status", "pending")
    .eq("entity_type", "company")
    .eq("assigned_moderator_id", userId)
    .limit(1);

  if (existing && existing.length > 0) {
    redirect("/moderation/company-requests");
  }

  // Claim the oldest unassigned pending evidence request that is not theirs
  const { data: candidate } = await admin
    .from("evidence")
    .select("id")
    .eq("status", "pending")
    .eq("entity_type", "company")
    .is("assigned_moderator_id", null)
    .neq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1);

  if (!candidate || candidate.length === 0) {
    // Nothing to assign
    redirect("/moderation/company-requests");
  }

  await admin
    .from("evidence")
    .update({
      assigned_moderator_id: userId,
      assigned_at: new Date().toISOString(),
    })
    .eq("id", candidate[0].id)
    .is("assigned_moderator_id", null);

  redirect("/moderation/company-requests");
}
