export const dynamic = "force-dynamic";
export const dynamicParams = true;
export const fetchCache = "force-no-store";

import Link from "next/link";
import { supabaseServer } from "@/lib/supabase-server";
import { JsonLdDebugPanel } from "@/components/JsonLdDebugPanel";

type IndexedCompany = {
  company_id: number;
  name: string;
  slug: string;
  industry: string | null;
  rotten_score: number;
};

function buildRottenIndexJsonLd(companies: IndexedCompany[]) {
  const baseUrl = "https://rotten-company.com";

  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Global Rotten Index — Companies",
    description:
      "Ranking companies by Rotten Score based on public evidence of harm, misconduct, and corporate behavior.",
    itemListOrder: "Descending",
    numberOfItems: companies.length,
    itemListElement: companies.map((c, index) => {
      const url = `${baseUrl}/company/${c.slug}`;
      return {
        "@type": "ListItem",
        position: index + 1,
        url,
        item: {
          "@type": "Organization",
          "@id": url,
          url,
          name: c.name,
          identifier: c.slug,
          additionalProperty: [
            {
              "@type": "PropertyValue",
              name: "Rotten Score",
              value: c.rotten_score,
            },
          ],
          industry: c.industry ?? undefined,
        },
      };
    }),
  };
}

export default async function RottenIndexPage() {
  const supabase = await supabaseServer();

  const { data, error } = await supabase
    .from("company_rotten_score")
    .select(`
      company_id,
      rotten_score,
      companies (
        name,
        slug,
        industry
      )
    `)
    .order("rotten_score", { ascending: false })
    .not("companies", "is", null);

  if (error) {
    console.error("Error loading Rotten Index:", error);
  }

  const companies: IndexedCompany[] =
    data?.map((row: any) => ({
      company_id: row.company_id,
      rotten_score: row.rotten_score ?? 0,
      name: row.companies?.name ?? "Unknown company",
      slug: row.companies?.slug ?? "",
      industry: row.companies?.industry ?? null,
    })) ?? [];

  const jsonLd = buildRottenIndexJsonLd(companies);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd, null, 2),
        }}
      />

      <JsonLdDebugPanel data={jsonLd} />

      <main className="max-w-5xl mx-auto px-4 py-10">
        <header className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Global Rotten Index</h1>
          <p className="text-gray-600">
            Ranking companies by Rotten Score based on public evidence of harm,
            misconduct, and corporate behavior.
          </p>
        </header>

        <section className="mb-6 flex flex-wrap items-center gap-3">
          <span className="text-sm text-gray-500">
            Currently showing: <strong>Companies only</strong>
          </span>
        </section>

        {companies.length === 0 ? (
          <p className="text-gray-600">No companies found in the Rotten Index.</p>
        ) : (
          <ol className="divide-y divide-gray-200 border border-gray-200 rounded-lg">
            {companies.map((c, index) => (
              <li
                key={c.company_id}
                className="flex items-center justify-between px-4 py-3"
              >
                <div className="flex items-center gap-4">
                  <span className="text-gray-500 font-mono w-6 text-right">
                    {index + 1}.
                  </span>
                  <div>
                    <Link
                      href={`/company/${c.slug}`}
                      className="text-lg font-semibold hover:underline"
                    >
                      {c.name}
                    </Link>
                    <div className="text-sm text-gray-500">
                      {c.industry || "Unknown industry"}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xl font-bold">
                    {c.rotten_score.toFixed(1)}
                  </div>
                  <div className="text-xs uppercase tracking-wide text-gray-500">
                    Rotten Score
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}

        <section className="mt-8 text-sm text-gray-500">
          <h2 className="font-semibold mb-1">Methodology</h2>
          <p>
            The Rotten Score is derived from category-level ratings, public
            evidence, and weighted signals of corporate harm. Higher scores
            indicate more severe and systemic issues.
          </p>
        </section>
      </main>
    </>
  );
}
