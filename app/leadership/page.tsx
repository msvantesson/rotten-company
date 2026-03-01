export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { getModerationGateStatus } from "@/lib/moderation-guards";
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

  // Use the same moderation gate as /api/moderation/gate-status and the
  // moderation queue so that all "allowed" users see the Actions column and
  // Moderator Controls section consistently.
  const gateStatus = await getModerationGateStatus();
  const isModerator = gateStatus.allowed;

  return (
    <main className="max-w-6xl mx-auto px-4 py-12 space-y-16">
      {/* HERO */}
      <section className="space-y-6">
        <h1 className="text-4xl font-bold">Leadership Accountability</h1>

        <div className="space-y-2 max-w-3xl">
          <p className="text-xl text-muted-foreground">
            Tracking CEO tenures and pay ratios across the companies in our index.
          </p>
          <p className="text-base text-muted-foreground">
            CEO‑to‑worker pay ratios have risen dramatically since the 1950s. Today&apos;s CEOs earn
            hundreds of times what their median employees make — a gap that has grown far faster than
            company performance, productivity, or worker wages. This page tracks CEOs behind the
            companies — current and past — so you can judge for yourself.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 pt-2">
          <Link href="/" className="text-accent font-medium hover:underline">
            ← Back to companies
          </Link>
        </div>
      </section>

      {/* CEO TENURES TABLE */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">CEOs — Current &amp; Past</h2>

        <form
          method="get"
          className="flex flex-wrap items-end gap-4 rounded-lg border border-border bg-surface-2 p-4"
        >
          <div className="flex flex-col">
            <label className="text-xs font-semibold text-muted-foreground mb-1">
              Country
            </label>
            <select
              name="country"
              defaultValue={selectedCountry ?? ""}
              className="border border-border rounded px-3 py-2 bg-surface text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
            <label className="text-xs font-semibold text-muted-foreground mb-1">
              Results
            </label>
            <select
              name="limit"
              defaultValue={String(limit)}
              className="border border-border rounded px-3 py-2 bg-surface text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
              className="inline-flex items-center justify-center rounded-md bg-foreground px-5 py-2 text-sm font-semibold text-background hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Apply
            </button>
          </div>
        </form>

        <div className="overflow-x-auto rounded-lg border border-border bg-surface shadow-sm">
          <table id="leader-index-table" className="w-full border-collapse text-sm">
            <thead className="bg-muted border-b border-border">
              <tr className="text-left text-muted-foreground">
                <th scope="col" className="py-2 pr-2 pl-3 w-12">#</th>
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
                  <td colSpan={isModerator ? 8 : 7} className="py-4 text-center text-muted-foreground text-sm">
                    No CEO records found.
                  </td>
                </tr>
              ) : (
                indexRows.map((r, i) => {
                  const isCurrent = r.started_at != null && !r.ended_at;
                  return (
                    <tr
                      key={r.id}
                      className="border-b border-border hover:bg-muted last:border-0"
                    >
                      <td className="py-2 pr-2 pl-3 text-muted-foreground">{i + 1}</td>
                      <td className="py-2 pr-4 font-medium">
                        <Link href={`/leader/${r.slug}`} className="text-accent hover:underline">
                          {r.name}
                        </Link>
                      </td>
                      <td className="py-2 pr-4 text-muted-foreground">
                        {r.company_slug ? (
                          <Link href={`/company/${r.company_slug}`} className="text-accent hover:underline">
                            {r.company_name ?? "—"}
                          </Link>
                        ) : (
                          r.company_name ?? "—"
                        )}
                      </td>
                      <td className="py-2 pr-4 text-muted-foreground">
                        {r.country ?? "—"}
                      </td>
                      <td className="py-2 pr-4 text-muted-foreground">
                        {formatDate(r.started_at)}
                      </td>
                      <td className="py-2 pr-4 text-muted-foreground">
                        {isCurrent ? (
                          <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                            Current
                          </span>
                        ) : (
                          formatDate(r.ended_at)
                        )}
                      </td>
                      <td className="py-2 px-4 text-center font-mono tabular-nums w-24 bg-muted">
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
          <h2 className="text-2xl font-semibold">Moderator Controls</h2>
          <p className="text-sm text-muted-foreground">
            Propose a new CEO tenure to be reviewed in the moderation queue.
          </p>
          <div className="rounded-lg border border-border bg-surface-2 p-6">
            <LeadershipStartTenureForm />
          </div>
        </section>
      )}
    </main>
  );
}
