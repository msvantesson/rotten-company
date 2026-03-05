export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { supabaseServer } from "@/lib/supabase-server";
import Link from "next/link";

export default async function HomePage() {
  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const submitEvidenceHref = user
    ? "/submit-evidence"
    : "/login?reason=submit-evidence&message=You'll need an account to submit evidence.";

  const { data: scoreRows } = await supabase
    .from("company_rotten_score")
    .select("company_id, rotten_score")
    .order("rotten_score", { ascending: false })
    .limit(10);

  const companyIds = scoreRows?.map((r) => r.company_id) ?? [];

  const { data: companyRows } = await supabase
    .from("companies")
    .select("id, name, slug, industry, country")
    .in("id", companyIds);

  const companyById: Record<number, any> = {};
  for (const c of companyRows ?? []) companyById[c.id] = c;

  const topCompanies = (scoreRows ?? [])
    .map((row) => {
      const c = companyById[row.company_id];
      if (!c) return null;
      return {
        ...c,
        rotten_score: Number(row.rotten_score),
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.rotten_score - a.rotten_score);

  return (
    <main className="max-w-6xl mx-auto px-4 py-12 space-y-20">
      {/* HERO */}
      <section className="space-y-6">
        <h1 className="text-4xl font-bold">Rotten Company</h1>

        <div className="space-y-2 max-w-3xl">
          <p className="text-xl text-muted-foreground">
            Expose who they really are—backed by evidence.
          </p>
          <p className="text-base text-muted-foreground">
            Submit documented proof of lies, cheating, and abuse so others can steer clear—before
            accepting a job offer or signing a contract.
          </p>
        </div>

        <div className="rounded-lg border border-border bg-surface-2 p-4">
          <div className="flex flex-wrap items-start gap-4">
            <div className="flex flex-col gap-1.5">
              <Link
                href={submitEvidenceHref}
                className="inline-flex items-center justify-center rounded-md bg-foreground px-5 py-2.5 text-sm font-semibold text-background hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Submit Evidence
              </Link>
              <p className="text-xs text-muted-foreground">
                Requires an account&nbsp;·&nbsp;Takes ~2 minutes&nbsp;·&nbsp;Upload PDF or image
              </p>
            </div>

            <Link
              href="/rotten-index"
              className="inline-flex items-center justify-center rounded-md border border-border px-5 py-2.5 text-sm font-semibold hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Explore the Rotten Index →
            </Link>
          </div>
        </div>

        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
          <Link href="/leadership" className="text-accent hover:underline">
            Leadership Accountability →
          </Link>
          <Link href="/rotten-score" className="text-accent hover:underline">
            How Rotten Score works →
          </Link>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold">How it works</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-lg border border-border bg-surface-2 p-5 space-y-2">
            <div className="text-2xl font-bold text-muted-foreground">1</div>
            <h3 className="font-semibold">Submit Evidence</h3>
            <p className="text-sm text-muted-foreground">
              Upload documents, PDFs, or screenshots and provide a short summary of the misconduct
              you witnessed.
            </p>
          </div>

          <div className="rounded-lg border border-border bg-surface-2 p-5 space-y-2">
            <div className="text-2xl font-bold text-muted-foreground">2</div>
            <h3 className="font-semibold">A Joint Community Effort</h3>
            <p className="text-sm text-muted-foreground">
              Rotten Company is maintained together by the community. Submissions are reviewed by
              other users against simple guidelines before acceptance.
            </p>
          </div>

          <div className="rounded-lg border border-border bg-surface-2 p-5 space-y-2">
            <div className="text-2xl font-bold text-muted-foreground">3</div>
            <h3 className="font-semibold">Score Impact</h3>
            <p className="text-sm text-muted-foreground">
              Verified evidence updates the company&apos;s Rotten Score in the public index, helping
              others assess workplace risk.
            </p>
          </div>
        </div>
      </section>

      {/* TRUST SIGNALS */}
      <section className="space-y-4">
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
              Every submission goes through a review process before it can affect any score or
              appear publicly.
            </p>
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold">Protects Regular Employees</h3>
            <p className="text-sm text-muted-foreground">
              We focus on leadership decisions and systemic harm — not on individual non-executive
              staff members.
            </p>
          </div>
        </div>
      </section>

      {/* TOP 10 */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-2xl font-semibold">Top 10 Rotten Companies</h2>
          <Link href="/rotten-index" className="text-sm text-accent hover:underline">
            View full index →
          </Link>
        </div>

        <p className="text-sm text-muted-foreground">
          All-time global ranking based on verified, moderated evidence.
        </p>

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
                    {company.rotten_score.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}