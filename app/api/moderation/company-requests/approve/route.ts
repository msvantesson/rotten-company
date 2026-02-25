import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { supabaseService } from "@/lib/supabase-service";

/* ─────────────────────────────────────────────
   Utilities
───────────────────────────────────────────── */

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function requireModerator(cookieClient: any) {
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

/* ─────────────────────────────────────────────
   POST /api/moderation/company-requests/approve
───────────────────────────────────────────── */

export async function POST(req: Request) {
  // Cookie‑scoped client ONLY for auth
  const cookieClient = await supabaseServer();

  // Service‑role client for all mutations
  const service = supabaseService();

  const guard = await requireModerator(cookieClient);
  if (!guard.ok) {
    return new NextResponse(guard.error, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const id = body?.id as string | undefined;
  const moderator_note = (body?.moderator_note ?? null) as string | null;

  if (!id) {
    return new NextResponse("Missing id", { status: 400 });
  }

  /* ─────────────────────────────────────────────
     Fetch request (authoritative)
  ───────────────────────────────────────────── */

  const { data: cr, error: crErr } = await service
    .from("company_requests")
    .select("id, name, country, website, description, status, user_id, approved_company_id")
    .eq("id", id)
    .maybeSingle();

  if (crErr || !cr) {
    return new NextResponse("Company request not found", { status: 404 });
  }

  if (cr.status !== "pending") {
    return new NextResponse("Request is not pending", { status: 409 });
  }

  /* ─────────────────────────────────────────────
     Create company (slug‑safe, idempotent)
  ───────────────────────────────────────────── */

  let companyId: number | null = cr.approved_company_id ?? null;
  let companySlug: string = "";

  if (!cr.approved_company_id) {
    const baseSlug = slugify(cr.name);
    let slug = baseSlug || `company-${id.slice(0, 8)}`;

    for (let i = 0; i < 10; i++) {
      const { data: existing } = await service
        .from("companies")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();

      if (!existing) break;
      slug = `${baseSlug}-${i + 2}`;
    }

    const { data: company, error: companyErr } = await service
      .from("companies")
      .insert({
        name: cr.name,
        country: cr.country,
        slug,
        industry: null,

        // NEW: copy submitted fields into the canonical companies row (only on creation)
        website: cr.website ?? null,
        description: cr.description ?? null,
      })
      .select("id, slug")
      .single();

    if (companyErr || !company) {
      return new NextResponse(
        `Failed to create company: ${companyErr?.message ?? "unknown"}`,
        { status: 500 }
      );
    }

    companyId = company.id;
    companySlug = company.slug;
  } else {
    const { data: existingCompany, error: lookupErr } = await service
      .from("companies")
      .select("slug")
      .eq("id", cr.approved_company_id)
      .maybeSingle();

    if (lookupErr || !existingCompany) {
      return new NextResponse(
        `Failed to look up existing company: ${lookupErr?.message ?? "not found"}`,
        { status: 500 }
      );
    }

    companySlug = existingCompany.slug;
  }

  /* ─────────────────────────────────────────────
     Update request (belt‑and‑suspenders)
  ───────────────────────────���───────────────── */

  const { data: updated, error: updateErr } = await service
    .from("company_requests")
    .update({
      status: "approved",
      moderator_id: guard.userId,
      decision_reason: moderator_note,
      moderated_at: new Date().toISOString(),
      ...(companyId !== null ? { approved_company_id: companyId } : {}),
    })
    .eq("id", id)
    .eq("status", "pending")
    .select("id");

  if (updateErr) {
    return new NextResponse(`Failed to update request: ${updateErr.message}`, {
      status: 500,
    });
  }

  if (!updated || updated.length === 0) {
    return new NextResponse("Request update blocked or already processed", {
      status: 409,
    });
  }

  /* ─────────────────────────────────────────────
     Moderation log
  ───────────────────────────────────────────── */

  const { error: logErr } = await service.from("moderation_actions").insert({
    moderator_id: guard.userId,
    target_type: "company_request",
    target_id: id,
    action: "approve",
    moderator_note: moderator_note ?? "Approved",
    source: "ui",
  });

  if (logErr) {
    return new NextResponse(`Failed to log action: ${logErr.message}`, {
      status: 500,
    });
  }

  /* ──────────────────��──────────────────────────
     Fetch contributor email
  ───────────────────────────────────────────── */

  let contributorEmail: string | null = null;

  if (cr.user_id) {
    const { data: userRow } = await service
      .from("users")
      .select("email")
      .eq("id", cr.user_id)
      .maybeSingle();

    contributorEmail = userRow?.email ?? null;
  }

  /* ─────────────────────────────────────────────
     Enqueue notification
  ───────────────────────────────────────────── */

  if (contributorEmail) {
    await service.from("notification_jobs").insert({
      recipient_email: contributorEmail,
      subject: "Your company request was approved",
      body: `Hi,

Your request to add "${cr.name}" has been approved and is now live on Rotten Company.

Slug: ${companySlug}

— Rotten Company`,
      metadata: { requestId: id, action: "approve" },
      status: "pending",
    });
  }

  /* ─────────────────────────────────────────────
     Success
  ───────────────────────────────────────────── */

  return NextResponse.json({
    ok: true,
    company_id: companyId,
    slug: companySlug,
  });
}
