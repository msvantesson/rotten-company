import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase-server";
import { supabaseService } from "@/lib/supabase-service";
import { canModerate } from "@/lib/moderation-guards";

/**
 * Debuggable admin moderation detail page for a single company_request.
 *
 * For diagnostics: when a moderator visits this page it will show a
 * server-rendered debug panel with the service query result (cr) and any
 * service errors. This helps root-cause the 404 (page returned notFound())
 * even when the DB row exists.
 *
 * Remove / revert to the normal page after debugging.
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

  // Basic pre-check
  if (!requestId) {
    return notFound();
  }

  // SSR cookie-scoped client: get user context
  const supabase = await supabaseServer();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  const moderatorId = user?.id ?? null;
  const moderatorEmail = user?.email ?? null;

  // Quick moderator guard
  const isModerator = moderatorId ? await canModerate(moderatorId) : false;

  // Service (service-role) client for authoritative read
  const service = supabaseService();

  // Fetch the company_request (authoritative)
  const { data: cr, error: crErr } = await service
    .from("company_requests")
    .select(
      "id, name, country, website, description, status, user_id, moderator_id, decision_reason, moderated_at, assigned_moderator_id, assigned_at, created_at"
    )
    .eq("id", requestId)
    .maybeSingle();

  // If we're not a moderator, show a simple UI (no debug leak)
  if (!moderatorId) {
    return (
      <main className="max-w-3xl mx-auto py-8">
        <nav className="mb-4">
          <Link href="/moderation/company-requests" className="text-sm text-blue-700">
            ← Back to moderation queue
          </Link>
        </nav>

        <h1 className="text-2xl font-bold mb-4">Moderation</h1>
        <p>You must be logged in to access this page.</p>
      </main>
    );
  }

  // If user is not a moderator, show limited UI
  if (!isModerator) {
    return (
      <main className="max-w-3xl mx-auto py-8">
        <nav className="mb-4">
          <Link href="/moderation/company-requests" className="text-sm text-blue-700">
            ← Back to moderation queue
          </Link>
        </nav>

        <h1 className="text-2xl font-bold mb-4">Moderation</h1>
        <p>You do not have moderator access.</p>
      </main>
    );
  }

  // If we have the row, render the normal moderation UI (but still show debug header)
  const isPending = cr?.status === "pending";

  // Environment presence checks (do NOT print secrets)
  const hasServiceKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const hasPublicUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);

  // If the row was not found, instead of notFound() — render a debug panel so you can see why
  if (!cr) {
    return (
      <main className="max-w-4xl mx-auto py-8 space-y-6">
        <nav>
          <Link href="/moderation/company-requests" className="text-sm text-blue-700">
            ← Back to moderation queue
          </Link>
        </nav>

        <h1 className="text-2xl font-bold">Company request diagnostics</h1>

        <section className="rounded-md border bg-white p-4">
          <p className="text-sm text-neutral-700">Debug information (server rendered)</p>

          <dl className="mt-3 space-y-2 text-sm">
            <div>
              <dt className="font-medium">requestId</dt>
              <dd>{requestId}</dd>
            </div>

            <div>
              <dt className="font-medium">SSR user present</dt>
              <dd>{String(Boolean(user))}</dd>
            </div>

            <div>
              <dt className="font-medium">SSR user id</dt>
              <dd>{moderatorId ?? "null"}</dd>
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
          </dl>

          <div className="mt-4 text-sm">
            <p className="font-medium">Interpretation / next steps</p>
            <ul className="list-disc ml-5 mt-2 text-sm text-neutral-700">
              <li>
                If <code>service query error</code> is non-null, your SUPABASE service role key or
                URL may be missing or incorrect in production. Check Vercel environment variables.
              </li>
              <li>
                If <code>service query error</code> is null and the row exists in the DB (you can confirm in Supabase SQL),
                then the deployed page that handled the request may be older than the diagnostic build — confirm the commit SHA in Vercel for the deployment.
              </li>
              <li>
                To immediately stop being redirected to a broken detail page, you can unassign this
                company_request in the DB (clear assigned_moderator_id/assigned_at).
              </li>
            </ul>
          </div>
        </section>
      </main>
    );
  }

  // Render the normal moderation UI when row is present (but include a debug header so you can still see server facts)
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
          <form action={async (formData: FormData) => {
            "use server";
            const note = formData.get("note")?.toString() ?? "";
            const service = supabaseService();
            // perform approve (same logic as before, simplified here for brevity)
            await service.from("company_requests").update({
              status: "approved",
              moderator_id: moderatorId,
              decision_reason: note,
              moderated_at: new Date().toISOString(),
            }).eq("id", cr.id).eq("status", "pending");
            revalidatePath("/moderation/company-requests");
            redirect("/moderation/company-requests");
          }}>
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

          <form action={async (formData: FormData) => {
            "use server";
            const note = formData.get("note")?.toString() ?? "";
            if (!note.trim()) {
              redirect(`/admin/moderation/company-requests/${cr.id}?error=${encodeURIComponent("Rejection reason is required")}`);
            }
            const service = supabaseService();
            await service.from("company_requests").update({
              status: "rejected",
              moderator_id: moderatorId,
              decision_reason: note,
              moderated_at: new Date().toISOString(),
            }).eq("id", cr.id).eq("status", "pending");
            revalidatePath("/moderation/company-requests");
            redirect("/moderation/company-requests");
          }}>
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
