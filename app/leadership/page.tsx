export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { supabaseServer } from "@/lib/supabase-server";
import { supabaseService } from "@/lib/supabase-service";
import { headers } from "next/headers";
import Link from "next/link";
import LeadershipStartTenureForm from "@/components/LeadershipStartTenureForm";
import LeadershipEndTenureButton from "@/components/LeadershipEndTenureButton";
import ExportCsvButton from "@/app/rotten-index/ExportCsvButton";

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
    });
  } catch {
    return dateStr;
  }
}

type SearchParams = { [key: string]: string | string[] | undefined };

function getFirstString(value: string | string[] | undefined): string | null {
  if (typeof value === "string") return value.trim() || null;
  if (Array.isArray(value)) return value[0]?.trim() || null;
  return null;
}

function formatCountry(value: string) {
  return value
    .split(/[^a-zA-Z]+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(" ");
}

type IndexedRow = {
  id: number;
  name: string;
  slug: string;
  country?: string | null;
  rotten_score: number;
  leader_id?: number;
  tenure_id?: number | null;
  company_name?: string | null;
  company_slug?: string | null;
  started_at?: string | null;
  ended_at?: string | null;
};

export default async function LeadershipPage({
  searchParams,
}: {
  searchParams?: SearchParams | Promise<SearchParams>;
}) {
  const sp = await Promise.resolve(searchParams ?? {});
  const limit = Number(getFirstString(sp.limit) ?? 10);
  const selectedCountry = getFirstString(sp.country);

  const h = await headers();
  const host = h.get("host");
  const protocol = host?.includes("localhost") ? "http" : "https";
  const baseUrl = host ? `${protocol}://${host}` : "";

  // Fetch leader index data
  let indexRows: IndexedRow[] = [];
  let countryOptions: string[] = [];
  if (baseUrl) {
    const qs = new URLSearchParams();
    qs.set("type", "leader");
    qs.set("limit", String(limit));
    if (selectedCountry) qs.set("country", selectedCountry);

    try {
      const [indexRes, countryRes] = await Promise.all([
        fetch(`${baseUrl}/api/rotten-index?${qs.toString()}`, { cache: "no-store" }),
        fetch(`${baseUrl}/api/rotten-index?type=leader&limit=1000`, { cache: "no-store" }),
      ]);
      if (indexRes.ok) {
        const json = await indexRes.json();
        indexRows = Array.isArray(json.rows)
          ? json.rows
              .map((r: any) => ({
                id: r.id,
                name: r.name,
                slug: r.slug,
                country: r.country ?? null,
                rotten_score: Number(r.rotten_score) || 0,
                leader_id: r.leader_id ?? undefined,
                tenure_id: r.tenure_id ?? null,
                company_name: r.company_name ?? null,
                company_slug: r.company_slug ?? null,
                started_at: r.started_at ?? null,
                ended_at: r.ended_at ?? null,
              }))
              .filter((r: IndexedRow) => typeof r.rotten_score === "number")
              .slice(0, limit)
          : [];
      }
      if (countryRes.ok) {
        const countryJson = await countryRes.json();
        countryOptions = Array.from(
          new Set<string>(
            Array.isArray(countryJson.rows)
              ? countryJson.rows
                  .map((r: any) => (r.country ?? "").trim())
                  .filter(Boolean)
              : []
          )
        ).sort((a, b) => a.localeCompare(b));
      }
    } catch (e) {
      console.error("[LeadershipPage] index fetch error:", e);
    }
  }

  const safeCountry = (selectedCountry ?? "all-countries")
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-]/g, "");
  const fileName = `rotten-index_leader_${safeCountry}_top${limit}.csv`;
  const supabase = await supabaseServer();
  const service = supabaseService();

  // Auth check
  let userId: string | null = null;
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userId = user?.id ?? null;
  } catch (e) {
    console.error("[LeadershipPage] auth error:", e);
  }

  // Check moderator status
  let isModerator = false;
  if (userId) {
    try {
      const { data: modRow } = await service
        .from("moderators")
        .select("user_id")
        .eq("user_id", userId)
        .maybeSingle();
      isModerator = !!modRow;
    } catch (e) {
      console.error("[LeadershipPage] moderator check error:", e);
    }
  }

  return (
    <main className="max-w-6xl mx-auto px-4 py-12 space-y-16">
      {/* HERO */}
      <section className="space-y-6">
        <h1 className="text-4xl font-bold">Leadership Accountability</h1>

        <p className="text-xl text-gray-700 max-w-3xl">
          CEO‑to‑worker pay ratios have risen dramatically since the 1950s. Today&apos;s CEOs earn
          hundreds of times what their median employees make — a gap that has grown far faster than
          company performance, productivity, or worker wages.
        </p>

        <p className="text-lg text-gray-600 max-w-3xl">
          This disconnect raises a fundamental question: are these leaders truly worth their obscene
          compensation, or has corporate governance simply lost touch with the people who do the
          actual work? This page tracks CEOs behind the companies — current and past — so you can
          judge for yourself.
        </p>

        <div className="flex flex-wrap items-center gap-4 pt-2">
          <Link href="/" className="text-blue-700 font-medium hover:underline">
            ← Back to companies
          </Link>
        </div>
      </section>

      {/* CEO TENURES TABLE */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">CEOs — Current &amp; Past</h2>

        <form
          method="get"
          className="flex flex-wrap items-end gap-4 rounded-lg border bg-gray-50 dark:bg-gray-800 dark:border-gray-700 p-4"
        >
          <div className="flex flex-col">
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
              Country
            </label>
            <select
              name="country"
              defaultValue={selectedCountry ?? ""}
              className="border rounded px-3 py-2 bg-white dark:bg-gray-900 dark:border-gray-600 dark:text-gray-100"
            >
              <option value="">All countries</option>
              {countryOptions.map((c) => (
                <option key={c} value={c}>
                  {formatCountry(c)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col">
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
              Results
            </label>
            <select
              name="limit"
              defaultValue={String(limit)}
              className="border rounded px-3 py-2 bg-white dark:bg-gray-900 dark:border-gray-600 dark:text-gray-100"
            >
              <option value="10">Top 10</option>
              <option value="25">Top 25</option>
              <option value="50">Top 50</option>
            </select>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <ExportCsvButton tableId="leader-index-table" filename={fileName} />
            <button
              type="submit"
              className="rounded bg-black px-5 py-2 text-white font-semibold hover:bg-gray-800"
            >
              Apply
            </button>
          </div>
        </form>

        <div className="overflow-hidden rounded-lg border dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm">
          <table id="leader-index-table" className="w-full border-collapse text-sm">
            <thead className="bg-gray-100 dark:bg-gray-800 border-b dark:border-gray-700">
              <tr className="text-left text-gray-600 dark:text-gray-400">
                <th scope="col" className="py-2 pr-2 w-12">#</th>
                <th scope="col" className="py-2 pr-4">CEO Name</th>
                <th scope="col" className="py-2 pr-4">Company</th>
                <th scope="col" className="py-2 pr-4">Country</th>
                <th scope="col" className="py-2 pr-4">Started</th>
                <th scope="col" className="py-2 pr-4">Ended</th>
                <th scope="col" className="py-2 px-4 text-center font-mono tabular-nums w-24">
                  Rotten Score
                </th>
                {isModerator && <th scope="col" className="py-2 pl-4">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {indexRows.length === 0 ? (
                <tr>
                  <td colSpan={isModerator ? 8 : 7} className="py-4 text-center text-gray-500 text-sm">
                    No CEO records found.
                  </td>
                </tr>
              ) : (
                indexRows.map((r, i) => {
                  const isCurrent = r.started_at != null && !r.ended_at;
                  return (
                    <tr
                      key={r.id}
                      className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <td className="py-2 pr-2 text-gray-500 dark:text-gray-400">{i + 1}</td>
                      <td className="py-2 pr-4 font-medium">
                        <Link href={`/leader/${r.slug}`} className="text-blue-700 hover:underline">
                          {r.name}
                        </Link>
                      </td>
                      <td className="py-2 pr-4 text-gray-600 dark:text-gray-400">
                        {r.company_slug ? (
                          <Link href={`/company/${r.company_slug}`} className="text-blue-700 hover:underline">
                            {r.company_name ?? "—"}
                          </Link>
                        ) : (
                          r.company_name ?? "—"
                        )}
                      </td>
                      <td className="py-2 pr-4 text-gray-600 dark:text-gray-400">
                        {r.country ?? "—"}
                      </td>
                      <td className="py-2 pr-4 text-gray-600 dark:text-gray-400">
                        {formatDate(r.started_at)}
                      </td>
                      <td className="py-2 pr-4 text-gray-600 dark:text-gray-400">
                        {isCurrent ? (
                          <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                            Current
                          </span>
                        ) : (
                          formatDate(r.ended_at)
                        )}
                      </td>
                      <td className="py-2 px-4 text-center font-mono tabular-nums w-24 bg-gray-50 dark:bg-gray-800">
                        {r.rotten_score.toFixed(2)}
                      </td>
                      {isModerator && (
                        <td className="py-2 pl-4">
                          {isCurrent && r.tenure_id != null && (
                            <LeadershipEndTenureButton
                              tenureId={r.tenure_id}
                              leaderName={r.name}
                            />
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* MODERATOR: Propose new CEO tenure */}
      {isModerator && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Moderator Controls</h2>
          <LeadershipStartTenureForm />
        </section>
      )}
    </main>
  );
}
