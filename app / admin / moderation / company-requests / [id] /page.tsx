import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase-server";
import { supabaseService } from "@/lib/supabase-service";
import { canModerate } from "@/lib/moderation-guards";

/**
 * Admin moderation detail page for a single company_request
 *
 * This file includes two server actions (approve/reject) that run as
 * "use server" functions inside the component so they have access to
 * the route param and can perform service-role mutations.
 */

type RequestRow = {
  id: string;
  name: string;
  country: string | null;
  website: string | null;
  description: string | null;
  status: string;
  user_id: string | null;
  moderator_id: string | null;
  decision_reason: string | null;
  moderated_at: string | null;
  assigned_moderator_id: string | null;
  assigned_at: string | null;
  created_at: string;
};

export default async function Page({
  params,
}: {
  params: { id: string };
}) {
  const requestId = params?.id;

  if (!requestId) {
    console.warn("[admin/company-requests] missing requestId param");
    return notFound();
  }

  // Cookie-scoped client to check current user auth
  const supabase = await supabaseServer();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    console.error("[admin/company-requests] auth.getUser error", userError);
  }

  const moderatorId = user?.id ?? null;

  console.info(
    "[admin/company-requests] SSR user present:",
    !!user,
    "userId:",
    moderatorId,
    "error:",
    userError,
  );

  if (!moderatorId) {
    return (
      <main className="max-w-3xl mx-auto py-8">
        <h1 className="text-2xl font-bold mb-4">Moderation</h1>
        <p>You must be logged in to access this page.</p>
      </main>
    );
  }

  // Check moderator role
  const allowed = await canModerate(moderatorId);
  if (!allowed) {
    return (
      <main className="max-w-3xl mx-auto py-8">
        <h1 className="text-2xl font-bold mb-4">Moderation</h1>
        <p>You do not have moderator access.</p>
      </main>
    );
  }

  // Service-role client for authoritative reads / writes
  const service = supabaseService();

  // ----------------------
  // DIAGNOSTIC LOGGING
  // Inserted to help debug 404s in production: prints the incoming
  // requestId and the result/error of the authoritative query.
  // ----------------------
  console.info("[admin/company-requests] requestId param:", requestId);

  const { data: cr, error: crErr } = await service
    .from("company_requests")
    .select(
      "id, name, country, website, description, status, user_id, moderator_id, decision_reason, moderated_at, assigned_moderator_id, assigned_at, created_at"
    )
    .eq("id", requestId)
    .maybeSingle();

  console.info("[admin/company-requests] fetched company_request:", {
    found: !!cr,
    id: cr?.id ?? null,
    status: cr?.status ?? null,
    user_id: cr?.user_id ?? null,
    assigned_moderator_id: cr?.assigned_moderator_id ?? null,
    assigned_at: cr?.assigned_at ?? null,
    created_at: cr?.created_at ?? null,
    error: crErr ? crErr.message : null,
  });

  if (crErr) {
    // If there is a service error (permissions, etc.) surface a 500-like page
    console.error("[admin/company-requests] service fetch error", crErr);
    return (
      <main className="max-w-3xl mx-auto py-8">
        <h1 className="text-2xl font-bold mb-4">Moderation</h1>
        <p className="text-red-600">Failed to load company request.</p>
      </main>
    );
  }

  if (!cr) {
    // Not found — preserve existing behaviour: show 404
    console.warn("[admin/company-requests] company_request not found", requestId);
    return notFound();
  }

  const isPending = cr.status === "pending";

  // Server action: approve
  async function handleApprove(formData: FormData) {
    "use server";

    if (!isPending) {
      redirect("/moderation/company-requests");
    }

    const note = formData.get("note")?.toString() ?? "";

    // Use service client for mutations
    const service = supabaseService();

    // Validate moderator
    const { data: modRow } = await service
      .from("moderators")
      .select("user_id")
      .eq("user_id", moderatorId)
      .maybeSingle();

    if (!modRow) {
      redirect(
        `/admin/moderation/company-requests/${requestId}?error=${encodeURIComponent(
          "Invalid moderator",
        )}`,
      );
    }

    // Fetch current request to validate; include country for company creation
    const { data: crFresh, error: crFreshErr } = await service
      .from("company_requests")
      .select("id, status, name, user_id, country")
      .eq("id", requestId)
      .maybeSingle();

    if (crFreshErr || !crFresh) {
      redirect(
        `/admin/moderation/company-requests/${requestId}?error=${encodeURIComponent(
          "Company request not found",
        )}`,
      );
    }

    if (crFresh.status !== "pending") {
      redirect(
        `/admin/moderation/company-requests/${requestId}?error=${encodeURIComponent(
          "Request is not pending",
        )}`,
      );
    }

    // Create company (slug-safe)
    function slugify(input: string) {
      return input
        .toLowerCase()
        .trim()
        .replace(/['"]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 80);
    }

    const baseSlug = slugify(crFresh.name);
    let slug = baseSlug || `company-${requestId.slice(0, 8)}`;

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
        name: crFresh.name,
        country: crFresh.country ?? null,
        slug,
        industry: null,
      })
      .select("id, slug")
      .single();

    if (companyErr || !company) {
      redirect(
        `/admin/moderation/company-requests/${requestId}?error=${encodeURIComponent(
          `Failed to create company: ${companyErr?.message ?? "unknown"}`,
        )}`,
      );
    }

    /* Update request (belt‑and‑suspenders) */
    const { data: updated, error: updateErr } = await service
      .from("company_requests")
      .update({
        status: "approved",
        moderator_id: moderatorId,
        decision_reason: note,
        moderated_at: new Date().toISOString(),
      })
      .eq("id", requestId)
      .eq("status", "pending")
      .select("id");

    if (updateErr) {
      redirect(
        `/admin/moderation/company-requests/${requestId}?error=${encodeURIComponent(
          `Failed to update request: ${updateErr.message}`,
        )}`,
      );
    }

    if (!updated || updated.length === 0) {
      redirect(
        `/admin/moderation/company-requests/${requestId}?error=${encodeURIComponent(
          "Request update blocked or already processed",
        )}`,
      );
    }

    // Moderation log
    await service.from("moderation_actions").insert({
      moderator_id: moderatorId,
      target_type: "company_request",
      target_id: requestId,
      action: "approve",
      moderator_note: note || "Approved",
      source: "ui",
    });

    // Fetch contributor email
    let contributorEmail: string | null = null;

    if (crFresh.user_id) {
      const { data: userRow } = await service
        .from("users")
        .select("email")
        .eq("id", crFresh.user_id)
        .maybeSingle();

      contributorEmail = userRow?.email ?? null;
    }

    // Enqueue notification
    if (contributorEmail) {
      const emailBody = [
        "Hi,",
        "",
        `Your request to add "${crFresh.name}" has been approved and is now live on Rotten Company.`,
        "",
        `Slug: ${company.slug}`,
        ...(note ? ["", `Moderator note: "${note}"`] : []),
        "",
        "— Rotten Company",
      ].join("\n");

      await service.from("notification_jobs").insert({
        recipient_email: contributorEmail,
        subject: "Your company request was approved",
        body: emailBody,
        metadata: { requestId, action: "approve" },
        status: "pending",
      });
    }

    // Revalidate the listing page so it reflects the approved state
    try {
      revalidatePath("/moderation/company-requests");
    } catch (e) {
      console.warn("[admin/company-requests] revalidatePath failed", e);
    }

    redirect("/moderation/company-requests");
  }

  // Server action: reject
  async function handleReject(formData: FormData) {
    "use server";

    if (!isPending) {
      redirect("/moderation/company-requests");
    }

    const note = formData.get("note")?.toString() ?? "";

    if (!note.trim()) {
      redirect(
        `/admin/moderation/company-requests/${requestId}?error=${encodeURIComponent(
          "Rejection reason is required",
        )}`,
      );
    }

    // Use supabaseService for mutations
    const service = supabaseService();

    // Validate moderator
    const { data: modRow } = await service
      .from("moderators")
      .select("user_id")
      .eq("user_id", moderatorId)
      .maybeSingle();

    if (!modRow) {
      redirect(
        `/admin/moderation/company-requests/${requestId}?error=${encodeURIComponent(
          "Invalid moderator",
        )}`,
      );
    }

    // Fetch current request to validate (include country if needed later)
    const { data: crFresh2, error: crErr2 } = await service
      .from("company_requests")
      .select("id, status, name, user_id, country")
      .eq("id", requestId)
      .maybeSingle();

    if (crErr2 || !crFresh2) {
      redirect(
        `/admin/moderation/company-requests/${requestId}?error=${encodeURIComponent(
          "Company request not found",
        )}`,
      );
    }

    if (crFresh2.status !== "pending") {
      redirect(
        `/admin/moderation/company-requests/${requestId}?error=${encodeURIComponent(
          "Request is not pending",
        )}`,
      );
    }

    // Update request
    const { data: updated, error: updateErr } = await service
      .from("company_requests")
      .update({
        status: "rejected",
        moderator_id: moderatorId,
        decision_reason: note,
        moderated_at: new Date().toISOString(),
      })
      .eq("id", requestId)
      .eq("status", "pending")
      .select("id");

    if (updateErr) {
      redirect(
        `/admin/moderation/company-requests/${requestId}?error=${encodeURIComponent(
          `Failed to update request: ${updateErr.message}`,
        )}`,
      );
    }

    if (!updated || updated.length === 0) {
      redirect(
        `/admin/moderation/company-requests/${requestId}?error=${encodeURIComponent(
          "Request update blocked or already processed",
        )}`,
      );
    }

    // Moderation log
    await service.from("moderation_actions").insert({
      moderator_id: moderatorId,
      target_type: "company_request",
      target_id: requestId,
      action: "reject",
      moderator_note: note,
      source: "ui",
    });

    // Fetch contributor email
    let contributorEmail: string | null = null;

    if (crFresh2.user_id) {
      const { data: userRow } = await service
        .from("users")
        .select("email")
        .eq("id", crFresh2.user_id)
        .maybeSingle();

      contributorEmail = userRow?.email ?? null;
    }

    // Enqueue notification
    if (contributorEmail) {
      await service.from("notification_jobs").insert({
        recipient_email: contributorEmail,
        subject: "Your company request was rejected",
        body: `Hi,

Your request to add "${crFresh2.name}" was rejected.

Reason:
${note}

— Rotten Company`,
        metadata: { requestId, action: "reject" },
        status: "pending",
      });
    }

    try {
      revalidatePath("/moderation/company-requests");
    } catch (e) {
      console.warn("[admin/company-requests] revalidatePath failed", e);
    }

    redirect("/moderation/company-requests");
  }

  // Render the admin detail UI
  return (
    <main className="max-w-3xl mx-auto py-8">
      <nav className="mb-4">
        <Link href="/moderation/company-requests" className="text-sm text-blue-700">
          ← Back to moderation queue
        </Link>
      </nav>

      <h1 className="text-2xl font-bold mb-4">Moderate company request</h1>

      <div className="rounded-md border bg-white p-4 mb-4">
        <h2 className="font-semibold text-lg">{cr.name}</h2>
        <p className="text-sm text-neutral-600">
          ID: {cr.id} · Created at: {new Date(cr.created_at).toLocaleString()}
        </p>
        {cr.website && (
          <p className="text-sm">
            Website: <a href={cr.website} className="text-blue-700">{cr.website}</a>
          </p>
        )}
        {cr.description && <p className="mt-2 text-sm text-neutral-700">{cr.description}</p>}
      </div>

      {!isPending && (
        <div className="rounded-md border bg-yellow-50 p-4 text-sm text-neutral-700">
          This request is in state: {cr.status}. Moderation actions are closed.
        </div>
      )}

      {isPending && (
        <div className="flex gap-4">
          <form action={handleApprove}>
            <input type="hidden" name="id" value={cr.id} />
            <div>
              <label className="text-sm block mb-1">Moderator note (optional)</label>
              <input name="note" className="border px-2 py-1 rounded w-full" />
            </div>
            <div className="pt-3">
              <button type="submit" className="rounded bg-emerald-600 text-white px-4 py-2">
                Approve
              </button>
            </div>
          </form>

          <form action={handleReject}>
            <input type="hidden" name="id" value={cr.id} />
            <div>
              <label className="text-sm block mb-1">Rejection reason (required)</label>
              <input name="note" required className="border px-2 py-1 rounded w-full" />
            </div>
            <div className="pt-3">
              <button type="submit" className="rounded bg-red-600 text-white px-4 py-2">
                Reject
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
