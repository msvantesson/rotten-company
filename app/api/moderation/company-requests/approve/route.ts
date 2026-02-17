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

function normalizeLinkedinUrl(url: string): string {
  // Simple normalization: trim and remove trailing slash
  // Note: This is intentionally simple - exact URL match required for deduplication
  return url.trim().replace(/\/$/, "");
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
    .select("id, name, country, website, description, status, user_id")
    .eq("id", id)
    .maybeSingle();

  if (crErr || !cr) {
    return new NextResponse("Company request not found", { status: 404 });
  }

  if (cr.status !== "pending") {
    return new NextResponse("Request is not pending", { status: 409 });
  }

  /* ─────────────────────────────────────────────
     Create company (slug‑safe)
  ───────────────────────────────────────────── */

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
    })
    .select("id, slug")
    .single();

  if (companyErr || !company) {
    return new NextResponse(
      `Failed to create company: ${companyErr?.message ?? "unknown"}`,
      { status: 500 }
    );
  }

  /* ─────────────────────────────────────────────
     Materialize staged CEO tenures (if any)
  ───────────────────────────────────────────── */

  const { data: stagedCeos, error: stagedCeosErr } = await service
    .from("company_request_leader_tenures")
    .select("*")
    .eq("company_request_id", id);

  if (stagedCeosErr) {
    console.error("[approve] Error fetching staged CEOs:", stagedCeosErr);
  }

  if (stagedCeos && stagedCeos.length > 0) {
    for (const stagedCeo of stagedCeos) {
      // Check for existing active CEO tenure for this company
      const { data: existingActiveCeo } = await service
        .from("leader_tenures")
        .select("id")
        .eq("company_id", company.id)
        .eq("role", "ceo")
        .is("ended_at", null)
        .maybeSingle();

      if (existingActiveCeo) {
        return new NextResponse(
          "Cannot add CEO: company already has an active CEO tenure. Please end the existing tenure first.",
          { status: 409 }
        );
      }

      // Find or create leader
      let leaderId: number | null = null;

      // Try to find by LinkedIn URL first (if provided)
      if (stagedCeo.linkedin_url) {
        const normalizedUrl = normalizeLinkedinUrl(stagedCeo.linkedin_url);
        const { data: existingByLinkedIn } = await service
          .from("leaders")
          .select("id")
          .eq("linkedin_url", normalizedUrl)
          .maybeSingle();

        if (existingByLinkedIn) {
          leaderId = existingByLinkedIn.id;
        }
      }

      // Fall back to slugified name if not found by LinkedIn
      if (!leaderId) {
        const leaderSlug = slugify(stagedCeo.leader_name);
        const { data: existingBySlug } = await service
          .from("leaders")
          .select("id")
          .eq("slug", leaderSlug)
          .maybeSingle();

        if (existingBySlug) {
          leaderId = existingBySlug.id;
        }
      }

      // Create new leader if not found
      if (!leaderId) {
        const leaderSlug = slugify(stagedCeo.leader_name);
        const { data: newLeader, error: leaderErr } = await service
          .from("leaders")
          .insert({
            name: stagedCeo.leader_name,
            slug: leaderSlug,
            role: stagedCeo.role || "ceo",
            company_id: company.id,
            linkedin_url: stagedCeo.linkedin_url || null,
          })
          .select("id")
          .single();

        if (leaderErr || !newLeader) {
          console.error("[approve] Failed to create leader:", leaderErr);
          return new NextResponse(
            `Failed to create leader: ${leaderErr?.message ?? "unknown"}`,
            { status: 500 }
          );
        }

        leaderId = newLeader.id;
      }

      // Create leader tenure
      // Note: started_at defaults to today's date (UTC) if not provided by user
      const tenureStartedAt = stagedCeo.started_at || new Date().toISOString().split("T")[0];
      
      const { error: tenureErr } = await service
        .from("leader_tenures")
        .insert({
          leader_id: leaderId,
          company_id: company.id,
          started_at: tenureStartedAt,
          ended_at: null,
          role: stagedCeo.role || "ceo",
        });

      if (tenureErr) {
        console.error("[approve] Failed to create tenure:", tenureErr);
        return new NextResponse(
          `Failed to create leader tenure: ${tenureErr.message}`,
          { status: 500 }
        );
      }
    }
  }

  /* ─────────────────────────────────────────────
     Update request (belt‑and‑suspenders)
  ───────────────────────────────────────────── */

  const { data: updated, error: updateErr } = await service
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

  if (updateErr) {
    return new NextResponse(
      `Failed to update request: ${updateErr.message}`,
      { status: 500 }
    );
  }

  if (!updated || updated.length === 0) {
    return new NextResponse(
      "Request update blocked or already processed",
      { status: 409 }
    );
  }

  /* ─────────────────────────────────────────────
     Moderation log
  ───────────────────────────────────────────── */

  const { error: logErr } = await service
    .from("moderation_actions")
    .insert({
      moderator_id: guard.userId,
      target_type: "company_request",
      target_id: id,
      action: "approve",
      moderator_note: moderator_note ?? "Approved",
      source: "ui",
    });

  if (logErr) {
    return new NextResponse(
      `Failed to log action: ${logErr.message}`,
      { status: 500 }
    );
  }

  /* ─────────────────────────────────────────────
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

Slug: ${company.slug}

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
    company_id: company.id,
    slug: company.slug,
  });
}
