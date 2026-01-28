export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { supabaseServer } from "@/lib/supabase-server";
import Link from "next/link";

export default async function HomePage() {
  const supabase = await supabaseServer();

  // 1️⃣ Fetch top 10 scores
  const { data: scoreRows } = await supabase
    .from("company_rotten_score")
    .select("company_id, rotten_score")
    .order("rotten_score", { ascending: false })
    .limit(10);

  const companyIds = scoreRows?.map((r) => r.company_id) ?? [];

  // 2️⃣ Fetch company metadata
  const { data: companyRows } = await supabase
    .from("companies")
    .select("id, name, slug, industry, country")
    .in("id", companyIds);

  const companyById: Record<number, any> = {};
  for (const c of companyRows ?? []) companyById[c.id] = c;

  // 3️⃣ Merge and sort
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
    <main className="max-w-6xl mx-auto px-4 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Welcome to Rotten Company</h1>
        <p className="text-gray-600">
          Transparency platform exposing corporate toxicity.
        </p>
      </header>

      <section className="mt-12">
        <h2 className="text-xl font-semibold mb-4">Top 10 Rotten Companies</h2>

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

        <div className="mt-6">
          <Link
            href="/rotten-index"
            className="text-sm text-blue-600 hover:underline"
          >
            View full Global Rotten Index →
          </Link>
        </div>
      </section>
    </main>
  );
}
