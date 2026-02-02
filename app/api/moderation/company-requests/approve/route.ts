import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function requireModerator(supabase: any) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) return { ok: false as const, error: "Not authenticated" };

  const { data: modRow } = await supabase
    .from("moderators")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!modRow) return { ok: false as const, error: "Not a moderator" };

  return { ok: true as const, userId: user.id };
}

export async function POST(req: Request) {
  const supabase = await supabaseServer();

  const guard = await requireModerator(supabase);
  if (!guard.ok) return new NextResponse(guard.error, { status: 401 });

  const body = await req.json().catch(() => null);
  const id = body?.id as string | undefined;
  const moderator_note = (body?.moderator_note ?? null) as string | null;

  if (!id) return new NextResponse("Missing id", { status: 400 });

  const { data: cr, error: crErr } = await supabase
    .from("company_requests")
    .select("id, name, country, website, description, status")
    .eq("id", id)
    .single();

  if (crErr || !cr) return new NextResponse("Company request not found", { status: 404 });
  if (cr.status !== "pending") return new NextResponse("Request is not pending", { status: 409 });

  const baseSlug = slugify(cr.name);

  // Ensure uniqueness (simple suffix strategy)
  let slug = baseSlug || `company-${id.slice(0, 8)}`;
  for (let i = 0; i < 10; i++) {
    const { data: existing } = await supabase
      .from("companies")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (!existing) break;
    slug = `${baseSlug}-${i + 2}`;
  }

  const { data: company, error: companyErr } = await supabase
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
    return new NextResponse(`Failed to create company: ${companyErr?.message ?? "unknown"}`, {
      status: 500,
    });
  }

  const { error: updateErr } = await supabase
    .from("company_requests")
    .update({
      status: "approved",
      moderator_id: guard.userId,
      decision_reason: moderator_note,
    })
    .eq("id", id);

  if (updateErr) return new NextResponse(`Failed to update request: ${updateErr.message}`, { status: 500 });

  const { error: logErr } = await supabase.from("moderation_actions").insert({
    moderator_id: guard.userId,
    target_type: "company_request",
    target_id: id,
    action: "approve",
    moderator_note: moderator_note ?? "Approved",
    source: "ui",
  });

  if (logErr) return new NextResponse(`Failed to log action: ${logErr.message}`, { status: 500 });

  return NextResponse.json({ ok: true, company_id: company.id, slug: company.slug });
}
