export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { supabaseServer } from "@/lib/supabase-server";
import Link from "next/link";

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

type RecentlyVerifiedItem = {
  eventId: string;
  createdAt: string;
  evidenceTitle: string;
  companyName: string;
  companySlug: string;
};

async function getRecentlyVerified(): Promise<RecentlyVerifiedItem[]> {
  try {
    const supabase = await supabaseServer();

    const { data: events, error: eventsError } = await supabase
      .from("moderation_events")
      .select("id, evidence_id, created_at")
      .eq("action", "approved")
      .order("created_at", { ascending: false })
      .limit(3);

    if (eventsError || !events || events.length === 0) return [];

    const evidenceIds = events.map((e) => e.evidence_id);

    const { data: evidenceRows, error: evidenceError } = await supabase
      .from("evidence")
      .select("id, title, company_id")
      .in("id", evidenceIds);

    if (evidenceError || !evidenceRows || evidenceRows.length === 0) return [];

    const companyIds = [
      ...new Set(evidenceRows.map((e) => e.company_id).filter((id): id is number => id != null)),
    ];

    const { data: companyRows, error: companiesError } = await supabase
      .from("companies")
      .select("id, name, slug")
      .in("id", companyIds);

    if (companiesError || !companyRows) return [];

    const evidenceById: Record<number, { title: string; company_id: number | null }> = {};
    for (const ev of evidenceRows) evidenceById[ev.id] = ev;

    const companyById: Record<number, { name: string; slug: string }> = {};
    for (const c of companyRows) companyById[c.id] = c;

    const items: RecentlyVerifiedItem[] = [];
    for (const event of events) {
      const evidence = evidenceById[event.evidence_id];
      if (!evidence) continue;
      const company = evidence.company_id != null ? companyById[evidence.company_id] : undefined;
      if (!company) continue;
      items.push({
        eventId: event.id,
        createdAt: event.created_at,
        evidenceTitle: evidence.title,
        companyName: company.name,
        companySlug: company.slug,
      });
    }

    return items;
  } catch (err) {
    console.error("[homepage] Failed to fetch recently verified:", err);
    return [];
  }
}

export default async function HomePage() {
  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const submitEvidenceHref = user
    ? "/submit-evidence"
    : "/login?reason=submit-evidence&message=You'll need an account to submit evidence.";

  const { data: scoreRows } = await supabase
    .from("company_rotten_score_v2")
    .select("company_id, rotten_score")
    .order("rotten_score", { ascending: false })
    .limit(10);

  const companyIds = scoreRows?.map((r) => r.company_id) ?? [];

  const { data: companyRows } = await supabase
    .from("companies")
    .select("id, name, slug, industry, country")
    .in("id", companyIds);

  type CompanyRow = {
    id: number;
    name: string;
    slug: string;
    industry: string | null;
    country: string | null;
  };

  const companyById: Record<number, CompanyRow> = {};
  for (const c of companyRows ?? []) companyById[c.id] = c;

  type TopCompany = CompanyRow & { rotten_score: number };
  const topCompanies = (scoreRows ?? [])
    .map((row) => {
      const c = companyById[row.company_id];
      if (!c) return null;
      return {
        ...c,
        rotten_score: Number(row.rotten_score),
      };
    })
    .filter((c): c is TopCompany => c !== null)
    .sort((a, b) => b.rotten_score - a.rotten_score);

  const recentlyVerified = await getRecentlyVerified();

  return (
    <main className="max-w-6xl mx-auto px-4 py-12 space-y-20">
      {/* HERO */}
      <section className="space-y-4">
        <h1 className="text-5xl sm:text-6xl font-bold">Rotten Company</h1>

        <p className="text-lg text-muted-foreground max-w-3xl">
          An evidence-based index of corporate misconduct.
        </p>

        <div className="pt-4 space-y-2 max-w-3xl">
          <p className="text-base font-medium">Know something rotten?</p>
          <p className="text-sm text-muted-foreground">
            Submit documented evidence and help expose corporate misconduct before others accept the job or sign the
            contract.
          </p>
        </div>

        <div className="rounded-lg border border-border/70 bg-surface-2 p-6 shadow-sm">
          <div className="flex flex-col gap-1.5">
            <Link
              href={submitEvidenceHref}
              className="inline-flex self-start items-center justify-center rounded-md bg-foreground px-5 py-2.5 text-sm font-semibold text-background hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Submit Evidence
            </Link>
            <p className="text-xs text-muted-foreground">
              Requires an account&nbsp;·&nbsp;Takes ~2 minutes&nbsp;·&nbsp;Upload PDF or image
            </p>
            <p className="text-xs text-muted-foreground">
              Moderation required before your first evidence submission
            </p>
            <Link
              href="/rotten-index"
              className="mt-1 inline-flex self-start items-center gap-1 text-sm text-muted-foreground hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Explore the Rotten Index →
            </Link>
          </div>
        </div>

        <div className="border-t border-border/50 pt-3 space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Learn more</p>
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <Link href="/leadership" className="text-accent hover:underline flex items-center gap-1">
              <span aria-hidden="true">↗</span> Leadership Accountability
            </Link>
            <Link href="/rotten-score" className="text-accent hover:underline flex items-center gap-1">
              <span aria-hidden="true">↗</span> How Rotten Score works
            </Link>
            <Link href="/guides/seo-keyword-list-2026" className="text-accent hover:underline flex items-center gap-1">
              <span aria-hidden="true">↗</span> SEO Keyword Guide 2026
            </Link>
          </div>
        </div>
      </section>

      {/* TOP 10 */}
      <section className="mt-24 space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-2xl font-semibold">The Rotten Index</h2>
          <Link href="/rotten-index" className="text-sm text-accent hover:underline">
            View full index →
          </Link>
        </div>

        <p className="text-sm text-muted-foreground">Top 10 companies by documented harm.</p>

        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[480px] border-collapse text-sm">
            <thead className="bg-muted border-b border-border">
              <tr className="text-left text-muted-foreground">
                <th className="py-2 pr-4 pl-3 w-10 whitespace-nowrap">#</th>
                <th className="py-2 pr-4 whitespace-nowrap">Company</th>
                <th className="py-2 pr-4 hidden sm:table-cell whitespace-nowrap">Industry</th>
                <th className="py-2 pr-4 hidden sm:table-cell whitespace-nowrap">Country</th>
                <th className="py-2 pr-3 text-right whitespace-nowrap">Rotten Score</th>
              </tr>
            </thead>
            <tbody>
              {topCompanies.map((company, index) => (
                <tr
                  key={company.id}
                  className="border-b border-border last:border-0 odd:bg-surface even:bg-surface-2 hover:bg-muted"
                >
                  <td className="py-2 pr-4 pl-3 text-muted-foreground">{index + 1}</td>
                  <td className="py-2 pr-4 font-medium text-accent">
                    <Link href={`/company/${company.slug}`} className="hover:underline">
                      {company.name}
                    </Link>
                  </td>
                  <td className="py-2 pr-4 text-muted-foreground hidden sm:table-cell">
                    {company.industry ?? "—"}
                  </td>
                  <td className="py-2 pr-4 text-muted-foreground hidden sm:table-cell">
                    {company.country ?? "—"}
                  </td>
                  <td className="py-2 pr-3 text-right font-mono tabular-nums">
                    {Math.round(company.rotten_score)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* RECENTLY VERIFIED */}
      {recentlyVerified.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Recently verified</h2>
          <p className="text-sm text-muted-foreground">The 3 most recently approved evidence submissions.</p>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[480px] border-collapse text-sm">
              <thead className="bg-muted border-b border-border">
                <tr className="text-left text-muted-foreground">
                  <th className="py-2 pr-4 pl-3 whitespace-nowrap">Company</th>
                  <th className="py-2 pr-4 whitespace-nowrap">Evidence</th>
                  <th className="py-2 pr-3 whitespace-nowrap">Approved</th>
                </tr>
              </thead>
              <tbody>
                {recentlyVerified.map((item) => (
                  <tr
                    key={item.eventId}
                    className="border-b border-border last:border-0 odd:bg-surface even:bg-surface-2 hover:bg-muted"
                  >
                    <td className="py-2 pr-4 pl-3 font-medium text-accent whitespace-nowrap">
                      <Link href={`/company/${item.companySlug}`} className="hover:underline">
                        {item.companyName}
                      </Link>
                    </td>
                    <td className="py-2 pr-4 text-muted-foreground">{item.evidenceTitle}</td>
                    <td className="py-2 pr-3 text-muted-foreground whitespace-nowrap">
                      {formatDate(item.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* HOW IT WORKS */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold">How it works</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-lg border border-border bg-surface-2 p-5 space-y-2">
            <div className="text-2xl font-bold text-muted-foreground">1</div>
            <h3 className="font-semibold">Submit Evidence</h3>
            <p className="text-sm text-muted-foreground">
              Upload documents, PDFs, or screenshots and provide a short summary of the misconduct you witnessed.
            </p>
          </div>

          <div className="rounded-lg border border-border bg-surface-2 p-5 space-y-2">
            <div className="text-2xl font-bold text-muted-foreground">2</div>
            <h3 className="font-semibold">A Joint Community Effort</h3>
            <p className="text-sm text-muted-foreground">
              Rotten Company is maintained together by the community. Submissions are reviewed by other users against
              simple guidelines before acceptance.
            </p>
            <p className="text-sm text-muted-foreground">
              Before submitting evidence for the first time, registered users complete a small number of moderation
              tasks when available. This shared responsibility keeps the platform credible.
            </p>
          </div>

          <div className="rounded-lg border border-border bg-surface-2 p-5 space-y-2">
            <div className="text-2xl font-bold text-muted-foreground">3</div>
            <h3 className="font-semibold">Score Impact</h3>
            <p className="text-sm text-muted-foreground">
              Verified evidence updates the company&apos;s Rotten Score in the public index, helping others assess
              workplace risk.
            </p>
          </div>
        </div>
      </section>

      {/* TRUST SIGNALS */}
      <section className="mt-24 space-y-4">
        <h2 className="text-2xl font-semibold">Our principles</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1">
            <h3 className="font-semibold">Evidence-Based</h3>
            <p className="text-sm text-muted-foreground">
              All scores are derived from submitted documentation, not opinions or anonymous ratings.
            </p>
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold">Moderated Submissions</h3>
            <p className="text-sm text-muted-foreground">
              Every submission goes through a review process before it can affect any score or appear publicly.
            </p>
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold">Protects Regular Employees</h3>
            <p className="text-sm text-muted-foreground">
              We focus on leadership decisions and systemic harm — not on individual non-executive staff members.
            </p>
          </div>
        </div>
      </section>

      {/* GOVERNANCE & FAIRNESS */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Governance &amp; Fairness</h2>
        <ul className="space-y-2 text-sm text-muted-foreground list-none">
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-accent">✓</span>
            <span>
              <strong className="text-foreground">Evidence-first moderation</strong> — every submission is reviewed
              against documented evidence before it can affect any score or appear publicly.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-accent">✓</span>
            <span>
              <strong className="text-foreground">Remediation evidence</strong> — submit evidence of corrective actions;
              remediation is reviewed like any other evidence.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-accent">✓</span>
            <span>
              <strong className="text-foreground">No anonymous scoring</strong> — all evidence submissions require a
              verified account; anonymous ratings are not accepted.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-accent">✓</span>
            <span>
              <strong className="text-foreground">No paid removals or reputation laundering</strong> — scores reflect
              evidence only and cannot be purchased, boosted, or suppressed.
            </span>
          </li>
        </ul>
      </section>
    </main>
  );
}
