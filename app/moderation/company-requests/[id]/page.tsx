import Link from "next/link";
import { supabaseServer } from "@/lib/supabase-server";
import { supabaseService } from "@/lib/supabase-service";
import { approveCompanyRequest, rejectCompanyRequest } from "@/app/moderation/company-requests/actions";

export const dynamic = "force-dynamic";

type ParamsShape = { id: string };

export default async function CommunityCompanyRequestReviewPage(props: {
  params: ParamsShape | Promise<ParamsShape>;
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const resolvedParams =
    props.params instanceof Promise ? await props.params : props.params;

  const errorMessageRaw =
    typeof props.searchParams?.error === "string"
      ? props.searchParams.error
      : undefined;
  const errorMessage = errorMessageRaw
    ? decodeURIComponent(errorMessageRaw)
    : null;

  const requestId = resolvedParams.id;

  // Auth — must be logged in
  const userClient = await supabaseServer();
  const { data: auth } = await userClient.auth.getUser();
  const moderatorId = auth?.user?.id ?? null;

  if (!moderatorId) {
    return (
      <main className="max-w-3xl mx-auto py-8 space-y-4">
        <Link href="/moderation" className="text-sm text-blue-700">
          ← Back to moderation queue
        </Link>
        <h1 className="text-2xl font-bold">Moderation</h1>
        <p className="text-sm text-neutral-700">
          You must be{" "}
          <Link href="/login" className="text-blue-700">
            signed in
          </Link>{" "}
          to moderate company requests.
        </p>
      </main>
    );
  }

  // Fetch company request using service role to bypass RLS
  const service = supabaseService();
  const { data: cr, error } = await service
    .from("company_requests")
    .select("id, name, country, website, description, status, user_id, assigned_moderator_id, assigned_at, created_at")
    .eq("id", requestId)
    .maybeSingle();

  if (error) {
    console.error("[community-company-requests] query failed:", error.message);
    return (
      <main className="max-w-3xl mx-auto py-8 space-y-4">
        <Link href="/moderation" className="text-sm text-blue-700">
          ← Back to moderation queue
        </Link>
        <p className="text-sm text-neutral-700">Error loading company request.</p>
      </main>
    );
  }

  // Authorization: item must exist, be pending, and be assigned to this user
  if (!cr) {
    return (
      <main className="max-w-3xl mx-auto py-8 space-y-4">
        <Link href="/moderation" className="text-sm text-blue-700">
          ← Back to moderation queue
        </Link>
        <p className="text-sm text-neutral-700">Company request not found.</p>
      </main>
    );
  }

  if (cr.status !== "pending") {
    return (
      <main className="max-w-3xl mx-auto py-8 space-y-4">
        <Link href="/moderation" className="text-sm text-blue-700">
          ← Back to moderation queue
        </Link>
        <p className="text-sm text-neutral-700">
          This company request is no longer pending (status: {cr.status}).
        </p>
      </main>
    );
  }

  if (cr.assigned_moderator_id !== moderatorId) {
    return (
      <main className="max-w-3xl mx-auto py-8 space-y-4">
        <Link href="/moderation" className="text-sm text-blue-700">
          ← Back to moderation queue
        </Link>
        <p className="text-sm text-neutral-700">
          This item is not assigned to you.{" "}
          <Link href="/moderation" className="text-blue-700">
            Return to your queue
          </Link>
          .
        </p>
      </main>
    );
  }

  return (
    <main className="max-w-3xl mx-auto py-8 space-y-6">
      <Link href="/moderation" className="text-sm text-blue-700">
        ← Back to moderation queue
      </Link>

      {errorMessage && (
        <section className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {errorMessage}
        </section>
      )}

      <header>
        <h1 className="text-2xl font-bold">Moderate Company Request</h1>
        <p className="text-sm text-neutral-500 mt-1">
          ID: {cr.id} · Submitted {new Date(cr.created_at).toLocaleString()}
        </p>
      </header>

      {/* Company request details */}
      <section className="rounded-md border bg-white p-4 space-y-3">
        <div>
          <p className="text-xs font-semibold text-neutral-500">Company Name</p>
          <p className="text-base font-medium text-neutral-900">{cr.name}</p>
        </div>

        {cr.country && (
          <div>
            <p className="text-xs font-semibold text-neutral-500">Country</p>
            <p className="text-sm text-neutral-800">{cr.country}</p>
          </div>
        )}

        {cr.website && (
          <div>
            <p className="text-xs font-semibold text-neutral-500">Website</p>
            <a
              href={cr.website}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-blue-700"
            >
              {cr.website}
            </a>
          </div>
        )}

        {cr.description && (
          <div>
            <p className="text-xs font-semibold text-neutral-500">Description</p>
            <p className="text-sm text-neutral-800 whitespace-pre-wrap">{cr.description}</p>
          </div>
        )}
      </section>

      {/* Moderation actions */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Approve */}
        <div className="rounded-md border bg-white p-4 flex flex-col gap-3">
          <h2 className="text-base font-semibold">Approve</h2>
          <p className="text-sm text-neutral-600">
            Mark this company request as <strong>approved</strong>.
          </p>
          <form action={approveCompanyRequest} className="flex flex-col gap-2 flex-1">
            <input type="hidden" name="request_id" value={requestId} />
            <label className="text-sm">
              Note (optional)
              <textarea
                name="moderator_note"
                placeholder="Optional note"
                className="mt-1 w-full rounded border px-2 py-1 text-sm min-h-[60px]"
              />
            </label>
            <button
              type="submit"
              className="mt-auto rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Approve
            </button>
          </form>
        </div>

        {/* Reject */}
        <div className="rounded-md border bg-white p-4 flex flex-col gap-3">
          <h2 className="text-base font-semibold">Reject</h2>
          <p className="text-sm text-neutral-600">
            Mark this company request as <strong>rejected</strong>. A reason is required.
          </p>
          <form action={rejectCompanyRequest} className="flex flex-col gap-2 flex-1">
            <input type="hidden" name="request_id" value={requestId} />
            <label className="text-sm">
              Rejection reason (required)
              <textarea
                name="moderator_note"
                placeholder="Explain why this request is being rejected"
                required
                className="mt-1 w-full rounded border px-2 py-1 text-sm min-h-[70px]"
              />
            </label>
            <button
              type="submit"
              className="mt-auto rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              Reject
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
