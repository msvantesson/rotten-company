import Link from "next/link";
import { supabaseServer } from "@/lib/supabase-server";
import { supabaseService } from "@/lib/supabase-service";
import {
  approveLeaderTenureRequest,
  rejectLeaderTenureRequest,
} from "@/app/moderation/leader-tenure-requests/actions";

export const dynamic = "force-dynamic";

type ParamsShape = { id: string };

export default async function LeaderTenureRequestReviewPage(props: {
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
          to moderate CEO tenure requests.
        </p>
      </main>
    );
  }

  // Fetch using service role to bypass RLS
  const service = supabaseService();
  const { data: req, error } = await service
    .from("leader_tenure_requests")
    .select(
      "id, company_id, request_type, role, leader_name, linkedin_url, started_at, ended_at, target_tenure_id, user_id, status, assigned_moderator_id, assigned_at, created_at",
    )
    .eq("id", requestId)
    .maybeSingle();

  if (error) {
    console.error("[leader-tenure-requests review] query failed:", error.message);
    return (
      <main className="max-w-3xl mx-auto py-8 space-y-4">
        <Link href="/moderation" className="text-sm text-blue-700">
          ← Back to moderation queue
        </Link>
        <p className="text-sm text-neutral-700">Error loading CEO tenure request.</p>
      </main>
    );
  }

  if (!req) {
    return (
      <main className="max-w-3xl mx-auto py-8 space-y-4">
        <Link href="/moderation" className="text-sm text-blue-700">
          ← Back to moderation queue
        </Link>
        <p className="text-sm text-neutral-700">CEO tenure request not found.</p>
      </main>
    );
  }

  if (req.status !== "pending") {
    return (
      <main className="max-w-3xl mx-auto py-8 space-y-4">
        <Link href="/moderation" className="text-sm text-blue-700">
          ← Back to moderation queue
        </Link>
        <p className="text-sm text-neutral-700">
          This CEO tenure request is no longer pending (status: {req.status}).
        </p>
      </main>
    );
  }

  if (req.assigned_moderator_id !== moderatorId) {
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

  // Optionally fetch current tenure info for 'end' requests
  type TargetTenure = {
    id: number;
    started_at: string;
    leaders: { name: string; slug: string } | null;
  };
  let targetTenure: TargetTenure | null = null;
  if (req.request_type === "end" && req.target_tenure_id) {
    const { data: tenure } = await service
      .from("leader_tenures")
      .select("id, started_at, leaders(name, slug)")
      .eq("id", req.target_tenure_id)
      .maybeSingle();
    targetTenure = (tenure as unknown as TargetTenure) ?? null;
  }

  // Fetch company name for context
  let companyName: string | null = null;
  let companySlug: string | null = null;
  if (req.company_id) {
    const { data: company } = await service
      .from("companies")
      .select("name, slug")
      .eq("id", req.company_id)
      .maybeSingle();
    companyName = (company as { name: string; slug: string } | null)?.name ?? null;
    companySlug = (company as { name: string; slug: string } | null)?.slug ?? null;
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
        <h1 className="text-2xl font-bold">Moderate CEO Tenure Request</h1>
        <p className="text-sm text-neutral-500 mt-1">
          ID: {req.id} · Type: <strong>{req.request_type}</strong> · Submitted{" "}
          {new Date(req.created_at).toLocaleString()}
        </p>
      </header>

      {/* Request details */}
      <section className="rounded-md border bg-white p-4 space-y-3">
        {companyName && (
          <div>
            <p className="text-xs font-semibold text-neutral-500">Company</p>
            {companySlug ? (
              <a
                href={`/company/${companySlug}`}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-blue-700"
              >
                {companyName}
              </a>
            ) : (
              <p className="text-sm text-neutral-800">{companyName}</p>
            )}
          </div>
        )}

        <div>
          <p className="text-xs font-semibold text-neutral-500">Request Type</p>
          <p className="text-sm text-neutral-800 capitalize">{req.request_type}</p>
        </div>

        {req.request_type === "add" && (
          <>
            {req.leader_name && (
              <div>
                <p className="text-xs font-semibold text-neutral-500">Leader Name</p>
                <p className="text-sm text-neutral-800">{req.leader_name}</p>
              </div>
            )}
            {req.linkedin_url && (
              <div>
                <p className="text-xs font-semibold text-neutral-500">LinkedIn URL</p>
                <a
                  href={req.linkedin_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-blue-700"
                >
                  {req.linkedin_url}
                </a>
              </div>
            )}
            {req.started_at && (
              <div>
                <p className="text-xs font-semibold text-neutral-500">Start Date</p>
                <p className="text-sm text-neutral-800">{req.started_at}</p>
              </div>
            )}
            {req.ended_at && (
              <div>
                <p className="text-xs font-semibold text-neutral-500">End Date</p>
                <p className="text-sm text-neutral-800">{req.ended_at}</p>
              </div>
            )}
          </>
        )}

        {req.request_type === "end" && (
          <>
            {targetTenure && (
              <div>
                <p className="text-xs font-semibold text-neutral-500">Target Tenure</p>
                <p className="text-sm text-neutral-800">
                  {targetTenure.leaders?.name ?? "Unknown"} (started{" "}
                  {targetTenure.started_at})
                </p>
              </div>
            )}
            {req.ended_at && (
              <div>
                <p className="text-xs font-semibold text-neutral-500">Proposed End Date</p>
                <p className="text-sm text-neutral-800">{req.ended_at}</p>
              </div>
            )}
          </>
        )}
      </section>

      {/* Moderation actions */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Approve */}
        <div className="rounded-md border bg-white p-4 flex flex-col gap-3">
          <h2 className="text-base font-semibold">Approve</h2>
          <p className="text-sm text-neutral-600">
            Mark this CEO tenure request as <strong>approved</strong>.
          </p>
          <form action={approveLeaderTenureRequest} className="flex flex-col gap-2 flex-1">
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
            Mark this CEO tenure request as <strong>rejected</strong>. A reason is required.
          </p>
          <form action={rejectLeaderTenureRequest} className="flex flex-col gap-2 flex-1">
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
