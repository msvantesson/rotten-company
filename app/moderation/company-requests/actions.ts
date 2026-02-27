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
 * Enqueue an email notification in notification_jobs for a company request decision.
 * No-ops gracefully if user_id is missing or the user has no email.
 */
async function enqueueCompanyRequestNotification(
  service: ReturnType<typeof supabaseService>,
  userId: string | null,
  subject: string,
  body: string,
  metadata: Record<string, unknown>,
): Promise<void> {
  if (!userId) {
    console.warn("[enqueueCompanyRequestNotification] no user_id, skipping notification");
    return;
  }

  const { data: userRow } = await service
    .from("users")
    .select("email")
    .eq("id", userId)
    .maybeSingle();

  const email = userRow?.email ?? null;
  if (!email) {
    console.warn(`[enqueueCompanyRequestNotification] no email for user ${userId}, skipping notification`);
    return;
  }

  const { error } = await service.from("notification_jobs").insert({
    recipient_email: email,
    subject,
    body,
    metadata,
    status: "pending",
  });

  if (error) {
    console.warn("[enqueueCompanyRequestNotification] failed to enqueue notification:", error.message);
  }
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/**
 * Approve a company request assigned to the currently signed-in user.
 * Also creates a row in public.companies if one doesn't already exist.
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

  // Fetch and validate assignment (include name, country, approved_company_id for company creation)
  const { data: cr, error: crError } = await service
    .from("company_requests")
    .select("id, name, country, status, assigned_moderator_id, user_id, approved_company_id")
    .eq("id", requestId)
    .maybeSingle();

  if (crError) {
    console.error("[approveCompanyRequest] failed to fetch request", requestId, crError.message);
    redirect(`/moderation/company-requests/${requestId}?error=${encodeURIComponent("Failed to load request.")}`);
  }

  if (!cr) {
    redirect(`/moderation/company-requests/${requestId}?error=${encodeURIComponent("Request not found.")}`);
  }

  if (cr.status !== "pending") {
    redirect(`/moderation/company-requests/${requestId}?error=${encodeURIComponent("This request is no longer pending.")}`);
  }

  if (cr.assigned_moderator_id !== userId) {
    redirect(`/moderation/company-requests/${requestId}?error=${encodeURIComponent("This item is not assigned to you.")}`);
  }

  // Create company in public.companies (idempotent: skip if already created)
  let approvedCompanyId: number | null = cr.approved_company_id ?? null;
  let companySlug = "";

  if (!approvedCompanyId) {
    const baseSlug = slugify(cr.name) || `company-${requestId.slice(0, 8)}`;
    let slug = baseSlug;

    for (let i = 0; i < 10; i++) {
      const { data: existing } = await service
        .from("companies")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();

      if (!existing) break;
      slug = `${baseSlug}-${i + 2}`;
    }

    const { data: company, error: companyInsertErr } = await service
      .from("companies")
      .insert({
        name: cr.name,
        country: cr.country ?? null,
        slug,
        industry: null,
      })
      .select("id, slug")
      .single();

    if (companyInsertErr) {
      console.error("[approveCompanyRequest] failed to create company:", companyInsertErr.message);
    } else if (company) {
      approvedCompanyId = company.id;
      companySlug = company.slug;
    }
  } else {
    const { data: existingCompany } = await service
      .from("companies")
      .select("slug")
      .eq("id", approvedCompanyId)
      .maybeSingle();
    companySlug = existingCompany?.slug ?? "";
  }

  await service
    .from("company_requests")
    .update({
      status: "approved",
      moderator_id: userId,
      decision_reason: note || null,
      moderated_at: new Date().toISOString(),
      ...(approvedCompanyId ? { approved_company_id: approvedCompanyId } : {}),
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

  await enqueueCompanyRequestNotification(
    service,
    cr.user_id ?? null,
    "Your company request was approved",
    [
      "Hi,",
      "",
      `Your request to add "${cr.name}" has been approved and is now live on Rotten Company.`,
      ...(companySlug ? ["", `Slug: ${companySlug}`] : []),
      "",
      "— Rotten Company",
    ].join("\n"),
    { requestId, action: "approve" },
  );

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
  const { data: cr, error: crError } = await service
    .from("company_requests")
    .select("id, name, status, assigned_moderator_id, user_id")
    .eq("id", requestId)
    .maybeSingle();

  if (crError) {
    console.error("[rejectCompanyRequest] failed to fetch request", requestId, crError.message);
    redirect(`/moderation/company-requests/${requestId}?error=${encodeURIComponent("Failed to load request.")}`);
  }

  if (!cr) {
    redirect(`/moderation/company-requests/${requestId}?error=${encodeURIComponent("Request not found.")}`);
  }

  if (cr.status !== "pending") {
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

  await enqueueCompanyRequestNotification(
    service,
    cr.user_id ?? null,
    "Your company request was rejected",
    [
      "Hi,",
      "",
      `Your request to add "${cr.name}" was rejected.`,
      "",
      "Reason:",
      note,
      "",
      "— Rotten Company",
    ].join("\n"),
    { requestId, action: "reject" },
  );

  revalidatePath("/moderation");
  redirect("/moderation");
}
