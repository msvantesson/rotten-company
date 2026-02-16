"use server";

import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase-server";
import { createClient } from "@supabase/supabase-js";
import { getModerationGateStatus } from "@/lib/moderation-guards";

/**
 * Temporary fallback: when the claim RPC returns a company_request, don't send
 * the moderator directly to the admin detail page (which may require a valid
 * browser session). Instead redirect back to the queue so the moderator can
 * continue. This prevents moderator UX loops while we fix any auth/session issues.
 */

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

type ClaimRow = { kind: "evidence" | "company_request"; item_id: string };

export async function assignNextCompanyRequest() {
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id ?? null;

  if (!userId) {
    // Not signed in — go to login
    redirect(
      "/login?reason=moderate-evidence-requests&message=" +
        encodeURIComponent("You’ll need an account to access evidence requests."),
    );
  }

  const gate = await getModerationGateStatus();
  if (!gate.allowed) {
    redirect("/moderation/company-requests");
  }

  const admin = adminClient();

  // Check moderator row
  const { data: modRow, error: modErr } = await admin
    .from("moderators")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (modErr || !modRow) {
    console.error("[assignNextCompanyRequest] moderator lookup failed", modErr);
    redirect("/moderation/company-requests");
  }

  // Prevent double-assignment of evidence (only block if moderator has assigned evidence)
  // Allow claiming evidence even when company_request is assigned
  const { data: existingEvidence } = await admin
    .from("evidence")
    .select("id")
    .eq("status", "pending")
    .eq("assigned_moderator_id", userId)
    .limit(1);

  if (existingEvidence && existingEvidence.length > 0) {
    redirect("/moderation/company-requests");
  }

  // Claim via RPC
  const { data, error } = await admin.rpc("claim_next_moderation_item", {
    p_moderator_id: userId,
  });

  if (error) {
    console.error("[assignNextCompanyRequest] claim RPC error", error);
    redirect("/moderation/company-requests");
  }

  const row: ClaimRow | null = Array.isArray(data) && data.length > 0 ? data[0] as ClaimRow : null;

  if (!row) {
    // Nothing available
    redirect("/moderation/company-requests");
  }

  if (row.kind === "evidence") {
    redirect(`/admin/moderation/evidence/${row.item_id}`);
  }

  // TEMPORARY FALLBACK:
  // If it's a company_request, redirect to the queue instead of the admin detail page.
  // This is safer while debugging auth/session issues in admin pages.
  redirect("/moderation/company-requests");
}
