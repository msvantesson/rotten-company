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

  // 1) Get all company scores, ordered by Rotten Score DESC
  const { data: scoreRows, error: scoreError } = await supabase
    .from("company_rotten_score")
    .select("company_id, rotten_score")
    .order("rotten_score", { ascending: false });

  if (scoreError) {
    console.error("Error loading company_rotten_score:", scoreError);
  }

  if (!scoreRows || scoreRows.length === 0) {
    const emptyJsonLd = buildRottenIndexJsonLd([]);
    return (
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(emptyJsonLd, null, 2),
          }}
        />
        <JsonLdDebugPanel data={emptyJsonLd} />
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
          <p className="text-gray-600">
            No companies found in the Rotten Index. Rotten Scores may not have been
            calculated yet.
          </p>
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

  // 2) Fetch company metadata for all IDs in the score view
  const companyIds = scoreRows.map((row) => row.company_id);

  const { data: companyRows, error: companyError } = await supabase
    .from("companies")
    .select("id, name, slug, industry")
    .in("id", companyIds);

  if (companyError) {
    console.error("Error loading companies for Rotten Index:", companyError);
  }

  const companyById =
    companyRows?.reduce<Record<number, { id: number; name: string; slug: string; industry: string | null }>>(
      (acc, row) => {
        acc[row.id] = {
          id: row.id,
          name: row.name,
          slug: row.slug,
          industry: row.industry ?? null,
        };
        return acc;
      },
      {}
    ) ?? {};

  // 3) Merge scores + metadata; preserve score ordering
  const companies: IndexedCompany[] = scoreRows
    .map((row) => {
      const c = companyById[row.company_id];
      if (!c) {
        return null;
      }
      return {
        company_id: row.company_id,
        rotten_score: row.rotten_score ?? 0,
        name: c.name,
        slug: c.slug,
        industry: c.industry,
      };
    })
    .filter((c): c is IndexedCompany => c !== null);

  const jsonLd = buildRottenIndexJsonLd(companies);

  return (
    <>
      {/* JSON-LD for the Global Rotten Index */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd, null, 2),
        }}
      />

      {/* Developer-only JSON-LD debug panel */}
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
          <p className="text-gray-600">
            No companies found in the Rotten Index. Rotten Scores may not have
            been calculated yet.
          </p>
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
