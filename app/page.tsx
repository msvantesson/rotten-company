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
    : "/login?reason=submit-evidence&message=You’ll need an account to submit evidence.";

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

        <div className="flex flex-wrap items-center gap-4 pt-2">
          <Link href="/rotten-index" className="text-blue-700 font-medium hover:underline">
            Explore the Rotten Index →
          </Link>

          <Link href="/rotten-score" className="text-blue-700 font-medium hover:underline">
            How Rotten Score works →
          </Link>

          <Link
            href={submitEvidenceHref}
            className="inline-flex items-center justify-center rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
          >
            Submit Evidence
          </Link>
        </div>
      </section>

      {/* TOP 10 */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold">Top 10 Rotten Companies (Global)</h2>

        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b text-left text-sm text-gray-600">
              <th className="py-2 pr-4 w-10">#</th>
              <th className="py-2 pr-4">Company</th>
              <th className="py-2 pr-4">Industry</th>
              <th className="py-2 pr-4">Country</th>
              <th className="py-2 text-right">Rotten Score</th>
            </tr>
          </thead>
          <tbody>
            {topCompanies.map((company, index) => (
              <tr key={company.id} className="border-b hover:bg-gray-50">
                <td className="py-2 pr-4 text-sm text-gray-500">{index + 1}</td>
                <td className="py-2 pr-4 font-medium text-blue-700">
                  <Link href={`/company/${company.slug}`} className="hover:underline">
                    {company.name}
                  </Link>
                </td>
                <td className="py-2 pr-4 text-sm text-gray-600">{company.industry ?? "—"}</td>
                <td className="py-2 pr-4 text-sm text-gray-600">{company.country ?? "—"}</td>
                <td className="py-2 text-right font-mono tabular-nums">
                  {company.rotten_score.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
