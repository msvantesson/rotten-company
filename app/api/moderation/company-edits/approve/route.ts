import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { supabaseService } from "@/lib/supabase-service";
import { buildCompanyEditPatch } from "@/lib/company-edit-patch";

async function requireModerator(cookieClient: Awaited<ReturnType<typeof supabaseServer>>) {
  const {
    data: { user },
  } = await cookieClient.auth.getUser();

  if (!user?.id) {
    return { ok: false as const, error: "Not authenticated" };
  }

  const { data: modRow } = await cookieClient
    .from("moderators")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!modRow) {
    return { ok: false as const, error: "Not a moderator" };
  }

  return { ok: true as const, userId: user.id };
}

export async function POST(req: Request) {
  const cookieClient = await supabaseServer();
  const service = supabaseService();

  const guard = await requireModerator(cookieClient);
  if (!guard.ok) {
    return new NextResponse(guard.error, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const id = String(body?.id ?? "").trim();
  const moderator_note = body?.moderator_note ? String(body.moderator_note).trim() : null;

  if (!id) {
    return new NextResponse("Missing id", { status: 400 });
  }

  // Fetch the edit request — must be pending and have approved_company_id set
  const { data: cr, error: crErr } = await service
    .from("company_requests")
    .select("id, status, name, website, industry, description, country, size_employees_min, size_employees, approved_company_id, user_id")
    .eq("id", id)
    .not("approved_company_id", "is", null)
    .maybeSingle();

  if (crErr || !cr) {
    return new NextResponse("Edit request not found", { status: 404 });
  }

  if (cr.status !== "pending") {
    return new NextResponse("Request is not pending", { status: 409 });
  }

  // Build the patch using whitelist + no-clearing rules
  const patch = buildCompanyEditPatch({
    website: cr.website,
    industry: cr.industry,
    description: cr.description,
    country: cr.country,
    size_employees: cr.size_employees_min,
  });

  // Also update size_employees_range when a range label is stored (new-style edit suggestions)
  const sizeEmployeesLabel =
    cr.size_employees && typeof cr.size_employees === "string"
      ? cr.size_employees.trim()
      : null;
  if (sizeEmployeesLabel) {
    (patch as Record<string, unknown>).size_employees_range = sizeEmployeesLabel;
  }

  // Apply patch to companies table (only non-empty fields)
  if (Object.keys(patch).length > 0) {
    const { error: updateCompanyErr } = await service
      .from("companies")
      .update(patch)
      .eq("id", cr.approved_company_id);

    if (updateCompanyErr) {
      console.error("[company-edits/approve] failed to update company:", updateCompanyErr.message);
      return new NextResponse(`Failed to update company: ${updateCompanyErr.message}`, { status: 500 });
    }
  }

  // Update the request to approved
  const { data: updated, error: updateReqErr } = await service
    .from("company_requests")
    .update({
      status: "approved",
      moderator_id: guard.userId,
      decision_reason: moderator_note,
      moderated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("status", "pending")
    .select("id");

  if (updateReqErr) {
    return new NextResponse(`Failed to update request: ${updateReqErr.message}`, { status: 500 });
  }

  if (!updated || updated.length === 0) {
    return new NextResponse("Request already processed", { status: 409 });
  }

  // Log to moderation_actions
  const { error: logErr } = await service.from("moderation_actions").insert({
    moderator_id: guard.userId,
    target_type: "company_request",
    target_id: id,
    action: "approve",
    moderator_note: moderator_note ?? "Approved",
    source: "ui",
  });

  if (logErr) {
    console.error("[company-edits/approve] failed to log action:", logErr.message);
  }

  return NextResponse.json({ ok: true });
}
