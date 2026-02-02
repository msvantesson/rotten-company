import { supabaseService } from "@/lib/supabase-service";
import { logDebug } from "@/lib/log";

export const dynamic = "force-dynamic";

export default async function CompanyRequestsModerationPage() {
  const supabase = supabaseService();

  logDebug("moderation-company-requests", "Loading");

  const { data, error } = await supabase
    .from("company_requests")
    .select("id, name, why, status, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    logDebug("moderation-company-requests", "Query error", error);
  }

  const requests = data ?? [];

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Company requests</h1>
        <p className="text-sm text-neutral-600">
          Review contributor requests for new companies.
        </p>
      </header>

      <section className="space-y-3">
        {requests.length === 0 && (
          <p className="text-sm text-neutral-600">No requests yet.</p>
        )}

        <ul className="space-y-3">
          {requests.map((r) => (
            <li
              key={r.id}
              className="rounded-md border px-3 py-2 text-sm space-y-1"
            >
              <div className="flex items-center justify-between">
                <p className="font-medium">{r.name}</p>
                <span className="text-xs uppercase tracking-wide text-neutral-500">
                  {r.status}
                </span>
              </div>

              <p className="text-xs text-neutral-600 line-clamp-2">{r.why}</p>

              <p className="text-[11px] text-neutral-400">
                {new Date(r.created_at).toLocaleString()}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
