import Link from "next/link";
import { supabaseServer } from "@/lib/supabase-server";
import { supabaseService } from "@/lib/supabase-service";
import { canModerate } from "@/lib/moderation-guards";

export const dynamic = "force-dynamic";

export default async function CompanyEditsPage() {
  const cookieClient = await supabaseServer();
  const { data: auth } = await cookieClient.auth.getUser();
  const userId = auth?.user?.id ?? null;

  if (!userId) {
    return (
      <main className="max-w-3xl mx-auto py-8 px-4 space-y-4">
        <h1 className="text-2xl font-bold">Company Edit Suggestions</h1>
        <p className="text-sm text-neutral-700">
          You must be{" "}
          <Link href="/login" className="text-blue-700">
            signed in
          </Link>{" "}
          to access this page.
        </p>
      </main>
    );
  }

  const isModerator = await canModerate(userId);
  if (!isModerator) {
    return (
      <main className="max-w-3xl mx-auto py-8 px-4 space-y-4">
        <h1 className="text-2xl font-bold">Company Edit Suggestions</h1>
        <p className="text-sm text-neutral-700">You do not have moderator access.</p>
      </main>
    );
  }

  const service = supabaseService();

  // Fetch pending edit requests: approved_company_id IS NOT NULL means it's an edit (not a new company)
  const { data: requests, error } = await service
    .from("company_requests")
    .select("id, name, why, status, created_at, approved_company_id")
    .eq("status", "pending")
    .not("approved_company_id", "is", null)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[company-edits] query failed:", error.message);
    return (
      <main className="max-w-3xl mx-auto py-8 px-4">
        <p className="text-sm text-neutral-600">Error loading edit requests.</p>
      </main>
    );
  }

  return (
    <main className="max-w-3xl mx-auto py-8 px-4 space-y-6">
      <header className="space-y-2">
        <Link href="/moderation" className="text-sm text-blue-700">
          ← Back to moderation
        </Link>
        <h1 className="text-2xl font-semibold">Company Edit Suggestions</h1>
        <p className="text-sm text-neutral-600">
          Pending suggestions to update company profile fields.
        </p>
      </header>

      {(!requests || requests.length === 0) && (
        <p className="text-sm text-neutral-600">No pending edit suggestions.</p>
      )}

      <ul className="space-y-3">
        {requests?.map((r) => (
          <li
            key={r.id}
            className="rounded-md border px-4 py-3 text-sm space-y-1"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">{r.name}</span>
              <span className="text-xs text-neutral-400">
                {new Date(r.created_at).toLocaleDateString()}
              </span>
            </div>
            {r.why && (
              <p className="text-neutral-600 text-xs line-clamp-2">{r.why}</p>
            )}
            <Link
              href={`/moderation/company-edits/${r.id}`}
              className="inline-block text-xs text-blue-700 hover:underline"
            >
              Review →
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
