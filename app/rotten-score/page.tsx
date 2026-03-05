import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "How Rotten Score Works | Rotten Company",
  description:
    "Learn how the Rotten Score is calculated — a transparent, evidence-based measure of corporate misconduct.",
};

export default function RottenScorePage() {
  // Worked example values (fictional company: AcmeCorp)
  // Using illustrative base_weight values; actual weights are set per-category in the database.
  const exampleCategories = [
    {
      name: "Toxic Workplace",
      avgRating: 3.5,
      low: 2,
      medium: 1,
      high: 0,
      baseWeight: 2.0,
    },
    {
      name: "Wage Abuse",
      avgRating: 4.2,
      low: 0,
      medium: 1,
      high: 1,
      baseWeight: 1.5,
    },
    {
      name: "Greenwashing",
      avgRating: 2.0,
      low: 0,
      medium: 2,
      high: 0,
      baseWeight: 1.0,
    },
  ];

  // Illustrative total — the real count is whatever is in the categories table.
  // Update this constant if the example needs to match a specific DB snapshot.
  const EXAMPLE_TOTAL_CATEGORIES = 18;
  const managerRollup = 1.5;

  const categoriesWithScores = exampleCategories.map((c) => {
    const severityScore = c.low * 1 + c.medium * 3 + c.high * 6;
    const finalScore = c.avgRating * severityScore * c.baseWeight;
    return { ...c, severityScore, finalScore };
  });

  const sumFinalScores = categoriesWithScores.reduce(
    (sum, c) => sum + c.finalScore,
    0
  );
  // Other categories (no evidence) contribute 0 each
  const categoryScore =
    Math.round((sumFinalScores / EXAMPLE_TOTAL_CATEGORIES) * 100) / 100;
  const managerComponent = managerRollup * 2;
  const rottenScore =
    Math.round((categoryScore + managerComponent) * 100) / 100;

  return (
    <main className="max-w-3xl mx-auto px-4 py-12 space-y-12">
      {/* Breadcrumb / back link */}
      <Link href="/" className="text-sm text-blue-700 hover:underline">
        ← Back to home
      </Link>

      {/* Page title */}
      <section className="space-y-4">
        <h1 className="text-4xl font-bold">How Rotten Score Works</h1>
        <p className="text-lg text-gray-700">
          The Rotten Score is a number that summarises how much documented harm
          a company has caused, weighted by evidence severity and category
          importance. <strong>Higher means more rotten</strong>; a score of{" "}
          <strong>0</strong> means no evidence of harm has been recorded.
        </p>
      </section>

      {/* ── Simple explainer ── */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold">The short version</h2>

        <ol className="list-decimal list-inside space-y-3 text-gray-800">
          <li>
            <strong>Evidence is submitted</strong> across any harm category
            (e.g. wage abuse, greenwashing, fraud). Each piece of evidence is
            assigned a severity: <em>low</em>, <em>medium</em>, or{" "}
            <em>high</em>.
          </li>
          <li>
            <strong>Community members rate</strong> each piece of evidence on a
            numeric scale. The average of those ratings becomes the{" "}
            <em>avg_rating</em> for that category.
          </li>
          <li>
            <strong>A severity score</strong> is computed for each category by
            weighting evidence counts:
            <br />
            <code className="bg-gray-100 px-1 rounded text-sm">
              severity_score = (low_count × 1) + (medium_count × 3) +
              (high_count × 6)
            </code>
          </li>
          <li>
            <strong>Each category&rsquo;s final score</strong> combines all
            three signals — ratings, severity, and the category&rsquo;s own
            base weight (set in the database to reflect the category&rsquo;s
            ethical importance):
            <br />
            <code className="bg-gray-100 px-1 rounded text-sm">
              final_score = avg_rating × severity_score × base_weight
            </code>
            <br />
            Categories with no approved evidence have a final_score of{" "}
            <strong>0</strong>.
          </li>
          <li>
            <strong>The category score</strong> is the average of
            final_score across <em>all</em> harm categories in the system
            (including those with no evidence, which each contribute 0):
            <br />
            <code className="bg-gray-100 px-1 rounded text-sm">
              category_score = round(avg(final_score), 2)
            </code>
          </li>
          <li>
            <strong>A manager component</strong> may be added if any of the
            company&rsquo;s managers carry a rolled-up score:
            <br />
            <code className="bg-gray-100 px-1 rounded text-sm">
              manager_component = COALESCE(manager_rollup, 0) × 2
            </code>
          </li>
          <li>
            <strong>Final Rotten Score:</strong>{" "}
            <code className="bg-gray-100 px-1 rounded text-sm">
              rotten_score = category_score + manager_component
            </code>
          </li>
          <li>
            If a company has <strong>no evidence at all</strong>, every
            category&rsquo;s final_score is 0, the category_score is 0, and
            (absent any manager component) the Rotten Score is{" "}
            <strong>0</strong> — reflecting a clean slate rather than missing
            data.
          </li>
        </ol>

        {/* Worked example */}
        <div className="border border-border rounded-lg p-6 bg-surface-2 space-y-4">
          <h3 className="text-lg font-semibold">
            Worked example — AcmeCorp (fictional)
          </h3>
          <p className="text-sm text-gray-600">
            AcmeCorp has approved evidence in 3 out of {EXAMPLE_TOTAL_CATEGORIES} harm
            categories. The other {EXAMPLE_TOTAL_CATEGORIES - exampleCategories.length}{" "}
            categories each contribute a final_score of 0. Base weights shown
            here are illustrative; actual per-category weights are stored in
            the database.
          </p>

          {/* Per-category breakdown */}
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b text-left text-gray-600">
                <th className="py-1 pr-3">Category</th>
                <th className="py-1 pr-3 text-right">Avg rating</th>
                <th className="py-1 pr-3 text-right">
                  Severity score
                  <br />
                  <span className="font-normal text-xs">
                    (L×1+M×3+H×6)
                  </span>
                </th>
                <th className="py-1 pr-3 text-right">Base weight</th>
                <th className="py-1 text-right">Final score</th>
              </tr>
            </thead>
            <tbody>
              {categoriesWithScores.map((c) => (
                <tr key={c.name} className="border-b">
                  <td className="py-1 pr-3">{c.name}</td>
                  <td className="py-1 pr-3 text-right font-mono">
                    {c.avgRating}
                  </td>
                  <td className="py-1 pr-3 text-right font-mono">
                    {c.severityScore}
                    <span className="text-xs text-gray-500 ml-1">
                      ({c.low}×1+{c.medium}×3+{c.high}×6)
                    </span>
                  </td>
                  <td className="py-1 pr-3 text-right font-mono">
                    {c.baseWeight}
                  </td>
                  <td className="py-1 text-right font-mono">
                    {c.finalScore.toFixed(2)}
                  </td>
                </tr>
              ))}
              <tr className="border-b text-gray-400 italic">
                <td className="py-1 pr-3 text-sm">
                  Other {EXAMPLE_TOTAL_CATEGORIES - exampleCategories.length} categories
                </td>
                <td className="py-1 pr-3 text-right font-mono" aria-label="no ratings">N/A</td>
                <td className="py-1 pr-3 text-right font-mono">0</td>
                <td className="py-1 pr-3 text-right font-mono" aria-label="varies">varies</td>
                <td className="py-1 text-right font-mono">0.00</td>
              </tr>
            </tbody>
          </table>

          {/* Score roll-up */}
          <div className="text-sm space-y-1 text-gray-700">
            <p>
              <span className="font-medium">Sum of final scores:</span>{" "}
              <span className="font-mono">
                {sumFinalScores.toFixed(2)}
              </span>
            </p>
            <p>
              <span className="font-medium">category_score</span> ={" "}
              round({sumFinalScores.toFixed(2)} ÷ {EXAMPLE_TOTAL_CATEGORIES}, 2) ={" "}
              <span className="font-mono">{categoryScore.toFixed(2)}</span>
            </p>
            <p>
              <span className="font-medium">manager_component</span> ={" "}
              manager_rollup ({managerRollup}) × 2 ={" "}
              <span className="font-mono">{managerComponent.toFixed(2)}</span>
            </p>
            <p className="font-semibold text-gray-900 pt-1">
              Rotten Score = {categoryScore.toFixed(2)} +{" "}
              {managerComponent.toFixed(2)} ={" "}
              <span className="font-mono">{rottenScore.toFixed(2)}</span>
            </p>
          </div>
        </div>
      </section>

      {/* ── Full methodology (collapsed) ── */}
      <section>
        <details className="border rounded-lg">
          <summary className="cursor-pointer px-6 py-4 text-lg font-semibold select-none hover:bg-muted">
            Full methodology
          </summary>

          <div className="px-6 pb-6 space-y-8 pt-4">
            <p className="text-sm text-gray-600">
              Company Rotten Scores are computed entirely inside the database
              via the{" "}
              <code className="bg-gray-100 px-1 rounded">
                company_rotten_score
              </code>{" "}
              view, which aggregates data from{" "}
              <code className="bg-gray-100 px-1 rounded">
                company_category_full_breakdown
              </code>
              . The formulas below reflect those view definitions.
            </p>

            {/* Step 1 */}
            <div className="space-y-2">
              <h3 className="text-base font-semibold">
                Step 1 — Severity score per category
              </h3>
              <p className="text-sm text-gray-600">
                For each company–category pair, count the approved evidence
                items by severity and combine them:
              </p>
              <pre className="bg-gray-50 border rounded p-3 text-xs overflow-x-auto">
                {`severity_score =
  (low_count  × 1)
+ (medium_count × 3)
+ (high_count  × 6)`}
              </pre>
              <p className="text-sm text-gray-600">
                High-severity evidence has six times the weight of low-severity
                evidence, reflecting greater harm.
              </p>
            </div>

            {/* Step 2 */}
            <div className="space-y-2">
              <h3 className="text-base font-semibold">
                Step 2 — Per-category final score
              </h3>
              <p className="text-sm text-gray-600">
                Multiply the average community rating for the category, the
                severity score, and the category&rsquo;s base weight:
              </p>
              <pre className="bg-gray-50 border rounded p-3 text-xs overflow-x-auto">
                {`final_score = COALESCE(avg_rating, 0) × severity_score × base_weight`}
              </pre>
              <p className="text-sm text-gray-600">
                <code className="bg-gray-100 px-1 rounded">avg_rating</code> is
                the average of all community ratings submitted for that
                company–category pair.{" "}
                <code className="bg-gray-100 px-1 rounded">base_weight</code>{" "}
                is a per-category constant stored in the database that reflects
                the relative ethical importance of the category. When there are
                no ratings,{" "}
                <code className="bg-gray-100 px-1 rounded">avg_rating</code>{" "}
                defaults to 0, making final_score 0 for that category.
              </p>
            </div>

            {/* Step 3 */}
            <div className="space-y-2">
              <h3 className="text-base font-semibold">
                Step 3 — Company category score
              </h3>
              <p className="text-sm text-gray-600">
                Average the final_score across <em>all</em> categories in the
                system (the view cross-joins every company with every category,
                so categories with no evidence contribute 0):
              </p>
              <pre className="bg-gray-50 border rounded p-3 text-xs overflow-x-auto">
                {`category_score = round(avg(final_score), 2)`}
              </pre>
            </div>

            {/* Step 4 */}
            <div className="space-y-2">
              <h3 className="text-base font-semibold">
                Step 4 — Manager component
              </h3>
              <p className="text-sm text-gray-600">
                If any of the company&rsquo;s managers have a rolled-up score,
                that score is added in. If no manager rollup exists, this
                component is 0:
              </p>
              <pre className="bg-gray-50 border rounded p-3 text-xs overflow-x-auto">
                {`manager_component = COALESCE(manager_rollup, 0) × 2`}
              </pre>
            </div>

            {/* Step 5 */}
            <div className="space-y-2">
              <h3 className="text-base font-semibold">
                Step 5 — Final Rotten Score
              </h3>
              <pre className="bg-gray-50 border rounded p-3 text-xs overflow-x-auto">
                {`rotten_score = category_score + manager_component`}
              </pre>
            </div>

            {/* Key behaviours */}
            <div className="space-y-2">
              <h3 className="text-base font-semibold">Key behaviours</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                <li>
                  More evidence — especially high-severity evidence — increases
                  the score.
                </li>
                <li>
                  Higher community ratings on that evidence also increase the
                  score.
                </li>
                <li>
                  Category base weights are set in the database and reflect the
                  relative severity of each harm type.
                </li>
                <li>
                  Because the category average is taken over{" "}
                  <em>all</em> categories (including those with no evidence),
                  a company&rsquo;s score is naturally bounded by how many
                  categories have evidence and how severe that evidence is.
                </li>
                <li>
                  A company with no approved evidence and no manager component
                  will have a Rotten Score of{" "}
                  <strong>0</strong>.
                </li>
                <li>
                  The Rotten Score has no fixed upper bound; it scales with the
                  amount and severity of evidence.
                </li>
              </ul>
            </div>
          </div>
        </details>
      </section>
    </main>
  );
}
