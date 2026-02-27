import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase-server";
import { supabaseService } from "@/lib/supabase-service";
import { approveEvidence, rejectEvidence } from "@/app/moderation/actions";

export const dynamic = "force-dynamic";

type ParamsShape = { id: string };

export default async function CommunityEvidenceReviewPage(props: {
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
          to moderate evidence.
        </p>
      </main>
    );
  }

  // ID parsing
  const evidenceId = parseInt(resolvedParams.id, 10);
  if (Number.isNaN(evidenceId) || evidenceId <= 0) {
    return (
      <main className="max-w-3xl mx-auto py-8 space-y-4">
        <Link href="/moderation" className="text-sm text-blue-700">
          ← Back to moderation queue
        </Link>
        <p className="text-sm text-neutral-700">Invalid evidence ID.</p>
      </main>
    );
  }

  // Fetch evidence using service role to bypass RLS
  const service = supabaseService();
  const { data: evidence, error } = await service
    .from("evidence")
    .select("id, title, summary, status, user_id, assigned_moderator_id, evidence_type, file_url, category_id, category, severity_suggested, severity, company_id, entity_type, entity_id, company_request_id, created_at")
    .eq("id", evidenceId)
    .maybeSingle();

  if (error) {
    console.error("[community-evidence] evidence query failed:", error.message);
    return (
      <main className="max-w-3xl mx-auto py-8 space-y-4">
        <Link href="/moderation" className="text-sm text-blue-700">
          ← Back to moderation queue
        </Link>
        <p className="text-sm text-neutral-700">Error loading evidence.</p>
      </main>
    );
  }

  // Authorization: item must exist, be pending, and be assigned to this user
  if (!evidence) {
    return (
      <main className="max-w-3xl mx-auto py-8 space-y-4">
        <Link href="/moderation" className="text-sm text-blue-700">
          ← Back to moderation queue
        </Link>
        <p className="text-sm text-neutral-700">Evidence not found.</p>
      </main>
    );
  }

  if (evidence.status !== "pending") {
    return (
      <main className="max-w-3xl mx-auto py-8 space-y-4">
        <Link href="/moderation" className="text-sm text-blue-700">
          ← Back to moderation queue
        </Link>
        <p className="text-sm text-neutral-700">
          This evidence is no longer pending (status: {evidence.status}).
        </p>
      </main>
    );
  }

  if (evidence.assigned_moderator_id !== moderatorId) {
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

  const isSelfOwned = evidence.user_id === moderatorId;

  // Wrapper actions: call community moderation actions and redirect with error
  // message on failure so the already-present error banner can display it.
  async function handleApprove(formData: FormData) {
    "use server";
    const result = await approveEvidence(formData);
    if (!result.ok) {
      redirect(
        `/moderation/evidence/${resolvedParams.id}?error=${encodeURIComponent(result.error ?? "Approval failed")}`,
      );
    }
    redirect("/moderation");
  }

  async function handleReject(formData: FormData) {
    "use server";
    const result = await rejectEvidence(formData);
    if (!result.ok) {
      redirect(
        `/moderation/evidence/${resolvedParams.id}?error=${encodeURIComponent(result.error ?? "Rejection failed")}`,
      );
    }
    redirect("/moderation");
  }

  // Optional company context
  let companyName: string | null = null;
  let companySlug: string | null = null;

  if (evidence.company_request_id) {
    const { data: cr } = await service
      .from("company_requests")
      .select("name, slug")
      .eq("id", evidence.company_request_id)
      .maybeSingle();
    if (cr) {
      companyName = (cr as any).name ?? null;
      companySlug = (cr as any).slug ?? null;
    }
  }

  if (!companyName) {
    const linkedCompanyId =
      (evidence.entity_type === "company" ? evidence.entity_id : null) ??
      evidence.company_id ??
      null;
    if (linkedCompanyId) {
      const { data: c } = await service
        .from("companies")
        .select("name, slug")
        .eq("id", linkedCompanyId)
        .maybeSingle();
      if (c) {
        companyName = (c as any).name ?? null;
        companySlug = (c as any).slug ?? null;
      }
    }
  }

  // Category label
  let categoryName: string | null = null;
  const categoryId =
    typeof evidence.category_id === "number"
      ? evidence.category_id
      : typeof evidence.category === "number"
        ? evidence.category
        : null;
  if (categoryId) {
    const { data: cat } = await service
      .from("categories")
      .select("name")
      .eq("id", categoryId)
      .maybeSingle();
    categoryName = (cat as any)?.name ?? null;
  }

  const severityValue =
    (typeof evidence.severity_suggested === "number"
      ? evidence.severity_suggested
      : null) ??
    (typeof evidence.severity === "number" ? evidence.severity : null);

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
        <h1 className="text-2xl font-bold">Moderate Evidence #{evidence.id}</h1>
        <p className="text-sm text-neutral-600 mt-1">
          Status: <strong>{evidence.status.toUpperCase()}</strong>
          {isSelfOwned && (
            <span className="ml-2 text-amber-700">
              (Warning: you are the submitter — approval will be blocked)
            </span>
          )}
        </p>
      </header>

      {/* Evidence details */}
      <section className="rounded-md border bg-white p-4 space-y-3">
        <div>
          <p className="text-xs font-semibold text-neutral-500">Title</p>
          <p className="text-base font-medium text-neutral-900">
            {evidence.title || "Untitled evidence"}
          </p>
        </div>

        {evidence.evidence_type && (
          <div>
            <p className="text-xs font-semibold text-neutral-500">Evidence Type</p>
            <p className="text-sm text-neutral-800">{String(evidence.evidence_type)}</p>
          </div>
        )}

        <div>
          <p className="text-xs font-semibold text-neutral-500">Summary</p>
          <div className="mt-1 rounded border bg-neutral-50 p-3 text-sm text-neutral-800 whitespace-pre-wrap max-h-64 overflow-auto break-words">
            {evidence.summary && String(evidence.summary).trim().length > 0
              ? evidence.summary
              : "(No summary provided)"}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs font-semibold text-neutral-500">Category</p>
            <p className="text-neutral-800">
              {categoryName ?? (categoryId ? `Category #${categoryId}` : "(not set)")}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold text-neutral-500">Severity (1–5)</p>
            <p className="text-neutral-800">{severityValue ?? "(not set)"}</p>
          </div>
        </div>

        {(companyName || companySlug) && (
          <div>
            <p className="text-xs font-semibold text-neutral-500">Company</p>
            <p className="text-sm text-neutral-800">
              {companySlug ? (
                <a
                  href={`/company/${companySlug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-700"
                >
                  {companyName ?? companySlug}
                </a>
              ) : (
                companyName ?? "(unknown)"
              )}
            </p>
          </div>
        )}

        {evidence.file_url && (
          <div>
            <p className="text-xs font-semibold text-neutral-500">File</p>
            <a
              href={evidence.file_url}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-blue-700"
            >
              View uploaded file
            </a>
          </div>
        )}

        <p className="text-xs text-neutral-400">
          ID: {evidence.id} · Submitted {new Date(evidence.created_at).toLocaleString()}
        </p>
      </section>

      {/* Moderation actions */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Approve */}
        <div className="rounded-md border bg-white p-4 flex flex-col gap-3">
          <h2 className="text-base font-semibold">Approve</h2>
          <p className="text-sm text-neutral-600">
            Mark as <strong>approved</strong>. The submitter will be notified.
          </p>
          <form action={handleApprove} className="flex flex-col gap-2 flex-1">
            <input type="hidden" name="evidence_id" value={String(evidenceId)} />
            <label className="text-sm">
              Note (optional)
              <textarea
                name="moderator_note"
                placeholder="Optional note for the submitter"
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
            Mark as <strong>rejected</strong>. A reason is required.
          </p>
          <form action={handleReject} className="flex flex-col gap-2 flex-1">
            <input type="hidden" name="evidence_id" value={String(evidenceId)} />
            <label className="text-sm">
              Rejection reason (required)
              <textarea
                name="moderator_note"
                placeholder="Explain why this evidence is being rejected"
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
