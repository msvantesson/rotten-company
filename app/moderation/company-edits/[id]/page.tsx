import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase-server";
import { supabaseService } from "@/lib/supabase-service";
import { canModerate } from "@/lib/moderation-guards";
import CompanyEditReviewClient from "./review-client";

export const dynamic = "force-dynamic";

type Params = { id: string };

export default async function CompanyEditReviewPage({
  params,
}: {
  params: Params | Promise<Params>;
}) {
  const resolved = params instanceof Promise ? await params : params;
  const requestId = resolved.id;

  const cookieClient = await supabaseServer();
  const { data: auth } = await cookieClient.auth.getUser();
  const userId = auth?.user?.id ?? null;

  if (!userId) {
    return (
      <main className="max-w-3xl mx-auto py-8 px-4 space-y-4">
        <Link href="/moderation/company-edits" className="text-sm text-blue-700">
          ← Back to edit suggestions
        </Link>
        <h1 className="text-2xl font-bold">Company Edit Review</h1>
        <p className="text-sm text-neutral-700">
          You must be{" "}
          <Link href="/login" className="text-blue-700">
            signed in
          </Link>{" "}
          to moderate.
        </p>
      </main>
    );
  }

  const isModerator = await canModerate(userId);
  if (!isModerator) {
    return (
      <main className="max-w-3xl mx-auto py-8 px-4 space-y-4">
        <Link href="/moderation/company-edits" className="text-sm text-blue-700">
          ← Back to edit suggestions
        </Link>
        <p className="text-sm text-neutral-700">You do not have moderator access.</p>
      </main>
    );
  }

  const service = supabaseService();

  // Fetch the edit request
  const { data: cr, error: crErr } = await service
    .from("company_requests")
    .select("id, name, status, why, website, industry, description, country, size_employees_min, proposed_name, approved_company_id, created_at, user_id")
    .eq("id", requestId)
    .not("approved_company_id", "is", null)
    .maybeSingle();

  if (crErr) {
    console.error("[company-edit-review] query failed:", crErr.message);
  }

  if (!cr) {
    notFound();
  }

  if (cr.status !== "pending") {
    return (
      <main className="max-w-3xl mx-auto py-8 px-4 space-y-4">
        <Link href="/moderation/company-edits" className="text-sm text-blue-700">
          ← Back to edit suggestions
        </Link>
        <p className="text-sm text-neutral-700">
          This request is no longer pending (status: {cr.status}).
        </p>
      </main>
    );
  }

  // Load current company values for the diff view
  const { data: company } = await service
    .from("companies")
    .select("id, name, slug, website, industry, description, country, size_employees")
    .eq("id", cr.approved_company_id)
    .maybeSingle();

  if (!company) {
    return (
      <main className="max-w-3xl mx-auto py-8 px-4 space-y-4">
        <Link href="/moderation/company-edits" className="text-sm text-blue-700">
          ← Back to edit suggestions
        </Link>
        <p className="text-sm text-neutral-700">Company not found.</p>
      </main>
    );
  }

  return (
    <CompanyEditReviewClient
      requestId={requestId}
      companySlug={company.slug}
      companyName={company.name}
      why={cr.why ?? ""}
      submittedAt={cr.created_at}
      current={{
        name: company.name ?? null,
        website: company.website ?? null,
        industry: company.industry ?? null,
        description: company.description ?? null,
        country: company.country ?? null,
        size_employees: company.size_employees ?? null,
      }}
      proposed={{
        name: cr.proposed_name ?? null,
        website: cr.website ?? null,
        industry: cr.industry ?? null,
        description: cr.description ?? null,
        country: cr.country ?? null,
        size_employees: cr.size_employees_min ?? null,
      }}
    />
  );
}
