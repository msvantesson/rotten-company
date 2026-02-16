import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase-server";
import { supabaseService } from "@/lib/supabase-service";
import { canModerate } from "@/lib/moderation-guards";

/**
 * Admin moderation detail page for a single company_request
 *
 * - Defensive server-side auth: treat auth.getUser errors as "no user" rather than
 *   throwing/returning notFound().
 * - If the row is missing, show a debug panel (server-rendered) with the service
 *   fetch error and environment presence booleans.
 *
 * Keep this diagnostic behavior only as long as you need it; remove debug bits
 * when root cause is confirmed.
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
  if (!requestId) return notFound();

  // -----------------------
  // Robust SSR auth.getUser
  // -----------------------
  let user: { id?: string; email?: string } | null = null;
  let authError: unknown = null;

  try {
    const supabase = await supabaseServer();
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      // treat as unauthenticated but capture error for diagnostics
      authError = error;
      user = null;
    } else {
      user = data.user ?? null;
    }
  } catch (e) {
    // Defensive: don't throw; treat as unauthenticated
    authError = e;
    user = null;
  }

  const moderatorId = user?.id ?? null;
  const moderatorEmail = user?.email ?? null;

  // Quick moderator check - wrap in try/catch
  let isModerator = false;
  try {
    if (moderatorId) {
      isModerator = await canModerate(moderatorId);
    } else {
      isModerator = false;
    }
  } catch (e) {
    // If guard check fails for any reason, treat as not moderator
    console.error("[admin/company-requests] canModerate threw", e);
    isModerator = false;
  }

  // -----------------------
  // Authoritative service fetch
  // -----------------------
  const service = supabaseService();

  const { data: cr, error: crErr } = await service
    .from("company_requests")
    .select(
      "id, name, country, website, description, status, user_id, moderator_id, decision_reason, moderated_at, assigned_moderator_id, assigned_at, created_at"
    )
    .eq("id", requestId)
    .maybeSingle();

  const hasServiceKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const hasPublicUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);

  // If user isn't authenticated / moderator, show explicit UI rather than 404.
  if (!moderatorId) {
    return (
      <main className="max-w-3xl mx-auto py-8">
        <nav className="mb-4">
          <Link href="/moderation/company-requests" className="text-sm text-blue-700">
            ← Back to moderation queue
          </Link>
        </nav>

        <h1 className="text-2xl font-bold mb-4">Moderation</h1>
        <p className="text-sm text-neutral-700">
          You are not signed in. Please <Link href="/login" className="text-blue-700">sign in</Link> to access moderation.
        </p>

        <div className="mt-4 text-xs text-neutral-500">
          <p>Server diag: auth error:</p>
          <pre className="text-xs text-red-600">{authError ? String((authError as any).message ?? authError) : "none"}</pre>
        </div>
      </main>
    );
  }

  if (!isModerator) {
    return (
      <main className="max-w-3xl mx-auto py-8">
        <nav className="mb-4">
          <Link href="/moderation/company-requests" className="text-sm text-blue-700">
            ← Back to moderation queue
          </Link>
        </nav>

        <h1 className="text-2xl font-bold mb-4">Moderation</h1>
        <p className="text-sm text-neutral-700">You do not have moderator access.</p>
      </main>
    );
  }

  // If the service query errored or returned no row, show a debug panel instead of throwing 404.
  if (crErr || !cr) {
    return (
      <main className="max-w-4xl mx-auto py-8 space-y-6">
        <nav>
          <Link href="/moderation/company-requests" className="text-sm text-blue-700">
            ← Back to moderation queue
          </Link>
        </nav>

        <h1 className="text-2xl font-bold">Company request diagnostics</h1>

        <section className="rounded-md border bg-white p-4">
          <p className="text-sm text-neutral-700">Server-rendered debug info</p>

          <dl className="mt-3 space-y-2 text-sm">
            <div>
              <dt className="font-medium">requestId</dt>
              <dd>{requestId}</dd>
            </div>

            <div>
              <dt className="font-medium">SSR user id</dt>
              <dd>{moderatorId}</dd>
            </div>

            <div>
              <dt className="font-medium">SSR user email</dt>
              <dd>{moderatorEmail ?? "null"}</dd>
            </div>

            <div>
              <dt className="font-medium">isModerator</dt>
              <dd>{String(isModerator)}</dd>
            </div>

            <div>
              <dt className="font-medium">Service env presence</dt>
              <dd>
                NEXT_PUBLIC_SUPABASE_URL: {String(hasPublicUrl)} <br />
                SUPABASE_SERVICE_ROLE_KEY: {String(hasServiceKey)}
              </dd>
            </div>

            <div>
              <dt className="font-medium">service query error</dt>
              <dd className="text-xs text-red-600">
                {crErr ? String(crErr.message ?? crErr) : "null"}
              </dd>
            </div>

            <div>
              <dt className="font-medium">notes</dt>
              <dd className="text-xs text-neutral-700">
                If service query error is present, check SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL in Vercel environment variables.
                If no error and row exists in DB, confirm deployed commit contains this diagnostic page.
              </dd>
            </div>
          </dl>
        </section>
      </main>
    );
  }

  // Normal rendering when row exists
  const isPending = cr.status === "pending";

  async function approveAction(formData: FormData) {
    "use server";
    const note = formData.get("note")?.toString() ?? "";
    const svc = supabaseService();

    const { data: updated, error: updateErr } = await svc
      .from("company_requests")
      .update({
        status: "approved",
        moderator_id: moderatorId,
        decision_reason: note,
        moderated_at: new Date().toISOString(),
      })
      .eq("id", cr.id)
      .eq("status", "pending")
      .select("id");

    if (updateErr) {
      console.error("[admin/company-requests][approve] updateErr", updateErr);
    } else {
      try {
        revalidatePath("/moderation/company-requests");
      } catch (_) {}
      redirect("/moderation/company-requests");
    }
  }

  async function rejectAction(formData: FormData) {
    "use server";
    const note = formData.get("note")?.toString() ?? "";
    if (!note.trim()) {
      redirect(`/admin/moderation/company-requests/${cr.id}?error=${encodeURIComponent("Rejection reason required")}`);
    }
    const svc = supabaseService();
    await svc
      .from("company_requests")
      .update({
        status: "rejected",
        moderator_id: moderatorId,
        decision_reason: note,
        moderated_at: new Date().toISOString(),
      })
      .eq("id", cr.id)
      .eq("status", "pending");
    try {
      revalidatePath("/moderation/company-requests");
    } catch (_) {}
    redirect("/moderation/company-requests");
  }

  return (
    <main className="max-w-3xl mx-auto py-8">
      <nav className="mb-4">
        <Link href="/moderation/company-requests" className="text-sm text-blue-700">
          ← Back to moderation queue
        </Link>
      </nav>

      <header className="mb-4">
        <h1 className="text-2xl font-bold">Moderate company request</h1>
        <p className="text-xs text-neutral-500 mt-1">
          Debug: SSR user {moderatorEmail ?? moderatorId} • service-role present:{" "}
          {String(hasServiceKey)}
        </p>
      </header>

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
          <form action={approveAction}>
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

          <form action={rejectAction}>
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
