"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase-server";
import { supabaseService } from "@/lib/supabase-service";
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

  // Prevent double-assignment:
  // Only block if the moderator already has pending evidence assigned.
  // (Company requests should NOT block claiming evidence requests.)
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

  const row: ClaimRow | null =
    Array.isArray(data) && data.length > 0 ? (data[0] as ClaimRow) : null;

  if (!row) {
    // Nothing available
    redirect("/moderation/company-requests");
  }

  if (row.kind === "evidence") {
    redirect(`/moderation/evidence/${row.item_id}`);
  }

  // If it's a company_request, redirect to the community company request detail page.
  redirect(`/moderation/company-requests/${row.item_id}`);
}

/**
 * Approve a company request assigned to the currently signed-in user.
 */
export async function approveCompanyRequest(formData: FormData) {
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id ?? null;

  if (!userId) {
    redirect("/login?reason=moderate&message=" + encodeURIComponent("You must be signed in to moderate."));
  }

  const requestId = formData.get("request_id")?.toString() ?? "";
  if (!requestId) throw new Error("Missing request_id");

  const note = formData.get("moderator_note")?.toString() ?? "";

  const service = supabaseService();

  // Fetch and validate assignment
  const { data: cr } = await service
    .from("company_requests")
    .select("id, status, assigned_moderator_id, user_id")
    .eq("id", requestId)
    .maybeSingle();

  if (!cr || cr.status !== "pending") {
    redirect(`/moderation/company-requests/${requestId}?error=${encodeURIComponent("This request is no longer pending.")}`);
  }

  if (cr.assigned_moderator_id !== userId) {
    redirect(`/moderation/company-requests/${requestId}?error=${encodeURIComponent("This item is not assigned to you.")}`);
  }

  await service
    .from("company_requests")
    .update({
      status: "approved",
      moderator_id: userId,
      decision_reason: note || null,
      moderated_at: new Date().toISOString(),
    })
    .eq("id", requestId)
    .eq("status", "pending");

  await service.from("moderation_actions").insert({
    moderator_id: userId,
    target_type: "company_request",
    target_id: requestId,
    action: "approve",
    moderator_note: note || null,
    source: "ui",
  });

  revalidatePath("/moderation");
  redirect("/moderation");
}

/**
 * Reject a company request assigned to the currently signed-in user.
 */
export async function rejectCompanyRequest(formData: FormData) {
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id ?? null;

  if (!userId) {
    redirect("/login?reason=moderate&message=" + encodeURIComponent("You must be signed in to moderate."));
  }

  const requestId = formData.get("request_id")?.toString() ?? "";
  if (!requestId) throw new Error("Missing request_id");

  const note = formData.get("moderator_note")?.toString() ?? "";
  if (!note.trim()) {
    redirect(`/moderation/company-requests/${requestId}?error=${encodeURIComponent("Rejection reason is required.")}`);
  }

  const service = supabaseService();

  // Fetch and validate assignment
  const { data: cr } = await service
    .from("company_requests")
    .select("id, status, assigned_moderator_id, user_id")
    .eq("id", requestId)
    .maybeSingle();

  if (!cr || cr.status !== "pending") {
    redirect(`/moderation/company-requests/${requestId}?error=${encodeURIComponent("This request is no longer pending.")}`);
  }

  if (cr.assigned_moderator_id !== userId) {
    redirect(`/moderation/company-requests/${requestId}?error=${encodeURIComponent("This item is not assigned to you.")}`);
  }

  await service
    .from("company_requests")
    .update({
      status: "rejected",
      moderator_id: userId,
      decision_reason: note,
      moderated_at: new Date().toISOString(),
    })
    .eq("id", requestId)
    .eq("status", "pending");

  await service.from("moderation_actions").insert({
    moderator_id: userId,
    target_type: "company_request",
    target_id: requestId,
    action: "reject",
    moderator_note: note,
    source: "ui",
  });

  revalidatePath("/moderation");
  redirect("/moderation");
}
