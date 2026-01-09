// app/company/[slug]/breakdown/page.tsx

import { supabaseServer } from "@/lib/supabase-server";
import ScoreMeter from "@/components/score-meter";

type BreakdownRow = {
  category_id: string;
  category_name: string;
  rating_count: number;
  avg_rating_score: number;
  evidence_count: number;
  evidence_score: number;
  final_score: number;
};

export default async function BreakdownPage({ params }: { params: { slug: string } }) {
  const supabase = await supabaseServer();

  // Fetch company
  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("id, name, slug")
    .eq("slug", params.slug)
    .single();

  if (companyError || !company) {
    return (
      <div className="max-w-3xl mx-auto py-8">
        <h1 className="text-2xl font-bold mb-2">Company not found</h1>
        <p className="text-muted-foreground">
          We couldn’t find a company with this slug.
        </p>
      </div>
    );
  }

  // Fetch breakdown
  const { data: breakdown, error: breakdownError } = await supabase
    .from("company_category_breakdown")
    .select(
      "category_id, category_name, rating_count, avg_rating_score, evidence_count, evidence_score, final_score"
    )
    .eq("company_id", company.id);

  const rows = (breakdown ?? []) as BreakdownRow[];

  return (
    <div className="max-w-3xl mx-auto py-8 space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">{company.name}</h1>
        <p className="text-muted-foreground">
          Category-level breakdown of this company&apos;s Rotten Score.
        </p>
      </header>

      {breakdownError && (
        <div className="rounded-md bg-red-100 text-red-800 px-3 py-2 text-sm">
          Could not load breakdown. Try refreshing the page.
        </div>
      )}

      {rows.length === 0 && !breakdownError && (
        <div className="rounded-md border px-4 py-3 text-sm text-muted-foreground">
          This company does not have any category data yet. Once people start
          rating and adding evidence, the breakdown will appear here.
        </div>
      )}

      {rows.length > 0 && (
        <div className="space-y-4">
          {rows.map((cat) => (
            <article
              key={cat.category_id}
              className="border rounded-lg p-4 hover:bg-muted/40 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <h2 className="font-semibold">{cat.category_name}</h2>
                  <p className="text-xs text-muted-foreground">
                    {cat.rating_count} rating
                    {cat.rating_count === 1 ? "" : "s"} • {cat.evidence_count}{" "}
                    evidence item
                    {cat.evidence_count === 1 ? "" : "s"}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-1">
                  <ScoreMeter score={cat.final_score} />
                  <p className="text-xs text-muted-foreground">
                    Final category score:{" "}
                    <span className="font-medium">{cat.final_score}</span>
                  </p>
                </div>
              </div>

              <details className="mt-3 group">
                <summary className="cursor-pointer text-sm text-muted-foreground list-none flex items-center gap-1">
                  <span className="underline underline-offset-2">
                    Show details
                  </span>
                  <span className="text-xs text-muted-foreground group-open:hidden">
                    ▼
                  </span>
                  <span className="text-xs text-muted-foreground hidden group-open:inline">
                    ▲
                  </span>
                </summary>

                <div className="mt-2 text-sm space-y-1">
                  <p>
                    <span className="font-medium">Average rating score:</span>{" "}
                    {cat.avg_rating_score}
                  </p>
                  <p>
                    <span className="font-medium">Evidence score:</span>{" "}
                    {cat.evidence_score}
                  </p>
                  <p>
                    <span className="font-medium">Final category score:</span>{" "}
                    {cat.final_score}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-4">
                    <a
                      href={`/company/${company.slug}/evidence?category=${cat.category_id}`}
                      className="text-xs underline underline-offset-2"
                    >
                      View evidence for this category
                    </a>
                    <a
                      href={`/company/${company.slug}/rate?category=${cat.category_id}`}
                      className="text-xs underline underline-offset-2"
                    >
                      Rate this company in this category
                    </a>
                  </div>
                </div>
              </details>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
