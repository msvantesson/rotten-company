export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { supabaseServer } from "@/lib/supabase-server";
import Link from "next/link";

export default async function HomePage() {
  const supabase = await supabaseServer();

  // Auth check (server-side, authoritative)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const submitEvidenceHref = user
    ? "/submit-evidence"
    : "/login?reason=submit-evidence&message=You’ll need an account to submit evidence.";

  // Fetch top 10 Rotten Scores
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

        <p className="text-xl text-gray-700 max-w-3xl">
          An evidence‑based accountability platform documenting corporate
          misconduct and systemic harm.
        </p>

        <p className="text-gray-600 max-w-3xl">
          Rotten Company aggregates verified evidence across industries and
          countries to expose patterns of corporate toxicity, extractive
          ownership, and real‑world impact — grounded in facts, not public
          relations.
        </p>

        <div className="flex gap-6 pt-2">
          <Link
            href="/rotten-index"
            className="text-blue-700 font-medium hover:underline"
          >
            Explore the Rotten Index →
          </Link>

          <Link
            href={submitEvidenceHref}
            className="text-gray-700 hover:underline"
          >
            Submit Evidence
          </Link>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="max-w-4xl space-y-4">
        <h2 className="text-2xl font-semibold">How it works</h2>

        <ol className="list-decimal list-inside text-gray-700 space-y-2">
          <li>Evidence is submitted with sources and documentation.</li>
          <li>Submissions are moderated for relevance and clarity.</li>
          <li>Approved evidence becomes permanently public.</li>
          <li>Rotten Scores update transparently based on verified impact.</li>
        </ol>
      </section>

      {/* TOP 10 */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold">
          Top 10 Rotten Companies (Global)
        </h2>

        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b text-left text-sm text-gray-600">
              <th className="py-2 pr-4">#</th>
              <th className="py-2 pr-4">Company</th>
              <th className="py-2 pr-4">Industry</th>
              <th className="py-2 pr-4">Country</th>
              <th className="py-2 text-right">Rotten Score</th>
            </tr>
          </thead>
          <tbody>
            {topCompanies.map((company, index) => (
              <Link
                key={company.id}
                href={`/company/${company.slug}`}
                passHref
                legacyBehavior
              >
                <tr className="border-b hover:bg-gray-50 cursor-pointer">
                  <td className="py-2 pr-4 text-sm text-gray-500">
                    {index + 1}
                  </td>
                  <td className="py-2 pr-4 font-medium text-blue-700">
                    {company.name}
                  </td>
                  <td className="py-2 pr-4 text-sm text-gray-600">
                    {company.industry ?? "—"}
                  </td>
                  <td className="py-2 pr-4 text-sm text-gray-600">
                    {company.country ?? "—"}
                  </td>
                  <td className="py-2 text-right font-mono">
                    {company.rotten_score.toFixed(2)}
                  </td>
                </tr>
              </Link>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
