export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { supabaseServer } from "@/lib/supabase-server";
import Link from "next/link";

export default async function HomePage() {
  const supabase = await supabaseServer();

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
    <main className="max-w-6xl mx-auto px-4 py-12">
      {/* HERO */}
      <section className="mb-16">
        <h1 className="text-4xl font-bold mb-4">
          Rotten Company
        </h1>

        <p className="text-xl text-gray-700 max-w-3xl mb-6">
          An evidence‑based accountability platform documenting corporate
          toxicity, misconduct, and systemic harm — grounded in facts, not
          public relations.
        </p>

        <p className="text-gray-600 max-w-3xl mb-4">
          Our sympathy lies with workers and communities who bear the
          consequences of poor leadership. When companies fail, it is rarely
          accidental — responsibility flows from the top. As the saying goes,
          a fish rots from the head.
        </p>

        <p className="text-gray-600 max-w-3xl">
          Rotten Company aggregates verified evidence of corporate behavior
          across industries and countries, producing transparent Rotten Scores
          that reflect real‑world impact. We pay particular attention to
          recurring patterns of extractive ownership and financial engineering
          — including private equity practices — that repeatedly erode
          companies, cultures, and livelihoods.
        </p>
      </section>

      {/* TOP 10 */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">
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

        <div className="mt-6 flex items-center justify-between">
          <Link
            href="/rotten-index"
            className="text-sm text-blue-600 hover:underline"
          >
            View full Global Rotten Index →
          </Link>

          <Link
            href="/disclaimer"
            className="text-xs text-gray-500 hover:underline"
          >
            Disclaimer
          </Link>
        </div>
      </section>
    </main>
  );
}
