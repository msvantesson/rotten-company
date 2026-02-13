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
 * Assign the next pending company request (FIFO) to the current moderator.
 * Only allowed if:
 * - user is logged in
 * - user is in `moderators`
 * - moderation gate status `allowed === true` (i.e. they’ve done their required evidence moderations)
 * - they do NOT already have an assigned pending company request
 */
export async function assignNextCompanyRequest() {
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id ?? null;

  if (!userId) {
    redirect(
      "/login?reason=moderate-company-requests&message=" +
        encodeURIComponent("You’ll need an account to access company requests."),
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

  // Do they already have an assigned pending request?
  const { data: existing } = await admin
    .from("company_requests")
    .select("id")
    .eq("assigned_moderator_id", userId)
    .eq("status", "pending")
    .limit(1);

  if (existing && existing.length > 0) {
    redirect("/moderation/company-requests");
  }

  // Claim the oldest unassigned pending request that is not theirs
  const { data: candidate } = await admin
    .from("company_requests")
    .select("id")
    .is("assigned_moderator_id", null)
    .eq("status", "pending")
    .neq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1);

  if (!candidate || candidate.length === 0) {
    // Nothing to assign
    redirect("/moderation/company-requests");
  }

  await admin
    .from("company_requests")
    .update({
      assigned_moderator_id: userId,
      assigned_at: new Date().toISOString(),
    })
    .eq("id", candidate[0].id)
    .is("assigned_moderator_id", null);

  redirect("/moderation/company-requests");
}
