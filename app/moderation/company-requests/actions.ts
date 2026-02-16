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

type ClaimRow = { kind: "evidence" | "company_request"; item_id: string };

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
    redirect("/moderation/company-requests");
  }

  const admin = adminClient();

  // Check moderator role
  const { data: modRow, error: modErr } = await admin
    .from("moderators")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (modErr) {
    console.error("[assignNextCompanyRequest] moderators lookup error", modErr);
    redirect("/moderation/company-requests");
  }

  if (!modRow) {
    redirect("/moderation/company-requests");
  }

  // If they already have an assigned pending company-level evidence item, redirect to it
  // "Company-level evidence" filter:
  // - entity_type = 'company'
  // - OR legacy rows: entity_type IS NULL but company_id is present
  const companyEvidenceFilter =
    "entity_type.eq.company,and(entity_type.is.null,company_id.not.is.null)";
  
  const { data: existingEvidence, error: existingErr } = await admin
    .from("evidence")
    .select("id")
    .eq("status", "pending")
    .or(companyEvidenceFilter)
    .eq("assigned_moderator_id", userId)
    .limit(1);

  if (existingErr) {
    console.error("[assignNextCompanyRequest] existing evidence lookup error", existingErr);
  }

  if (existingEvidence && existingEvidence.length > 0) {
    redirect(`/admin/moderation/evidence/${existingEvidence[0].id}`);
  }

  // If they already have an assigned pending company_request, redirect to it
  const { data: existingCompanyRequest, error: existingCRErr } = await admin
    .from("company_requests")
    .select("id")
    .eq("status", "pending")
    .eq("assigned_moderator_id", userId)
    .limit(1);

  if (existingCRErr) {
    console.error("[assignNextCompanyRequest] existing company_request lookup error", existingCRErr);
  }

  if (existingCompanyRequest && existingCompanyRequest.length > 0) {
    redirect(`/admin/moderation/company-requests/${existingCompanyRequest[0].id}`);
  }

  // Try to claim a moderation item, with retries for self-submissions
  // (RPC may return self-submitted items; we need to skip them)
  const MAX_RETRIES = 5;
  const rejectedItemIds = new Set<string>();

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    // RPC: claim the next moderation item (atomic in DB)
    const rpcResult: any = await admin.rpc("claim_next_moderation_item", {
      p_moderator_id: userId,
    });

    if (rpcResult.error) {
      console.error("[assignNextCompanyRequest] claim_next_moderation_item error", rpcResult.error);
      redirect("/moderation/company-requests?error=claim-failed");
    }

    const row: ClaimRow | null = Array.isArray(rpcResult.data) && rpcResult.data.length > 0 ? rpcResult.data[0] : null;

    if (!row) {
      // Nothing available
      redirect("/moderation/company-requests?error=no-eligible-items");
    }

    // Validate that the assigned item was not submitted by this moderator
    // (self-moderation protection)
    let itemUserId: string | null = null;
    
    if (row.kind === "evidence") {
      const { data: evidenceItem } = await admin
        .from("evidence")
        .select("user_id")
        .eq("id", row.item_id)
        .maybeSingle();
      itemUserId = evidenceItem?.user_id ?? null;
    } else {
      const { data: companyRequestItem } = await admin
        .from("company_requests")
        .select("user_id")
        .eq("id", row.item_id)
        .maybeSingle();
      itemUserId = companyRequestItem?.user_id ?? null;
    }

    // If the item was submitted by this moderator, unassign it and try again
    if (itemUserId === userId) {
      console.error(
        `[assignNextCompanyRequest] Self-moderation detected (attempt ${attempt + 1}/${MAX_RETRIES}): moderator ${userId} was assigned their own ${row.kind} ${row.item_id}`
      );
      
      rejectedItemIds.add(row.item_id);
      
      // Unassign the item
      if (row.kind === "evidence") {
        await admin
          .from("evidence")
          .update({ assigned_moderator_id: null, assigned_at: null })
          .eq("id", row.item_id);
      } else {
        await admin
          .from("company_requests")
          .update({ assigned_moderator_id: null, assigned_at: null })
          .eq("id", row.item_id);
      }
      
      // Try again (continue loop)
      continue;
    }

    // Success! Found a non-self item
    if (row.kind === "evidence") {
      redirect(`/admin/moderation/evidence/${row.item_id}`);
    }

    // Company request moderation detail page
    redirect(`/admin/moderation/company-requests/${row.item_id}`);
  }

  // If we exhausted all retries, all available items were self-submitted
  console.error(
    `[assignNextCompanyRequest] Exhausted ${MAX_RETRIES} retries. All available items were self-submitted. Rejected IDs: ${Array.from(rejectedItemIds).join(", ")}`
  );
  redirect("/moderation/company-requests?error=only-self-submissions");
}
