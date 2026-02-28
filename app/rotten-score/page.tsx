import type { Metadata } from "next";
import Link from "next/link";
import {
  CATEGORY_WEIGHTS,
  SIZE_MULTIPLIERS,
  OWNERSHIP_MULTIPLIERS,
  COUNTRY_REGION_MULTIPLIERS,
} from "@/lib/rotten-score";

export const metadata: Metadata = {
  title: "How Rotten Score Works | Rotten Company",
  description:
    "Learn how the Rotten Score is calculated — a transparent, evidence-based measure of corporate misconduct across 18 harm categories.",
};

/** Format a snake_case key into Title Case for display. */
function formatKey(key: string): string {
  return key
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default function RottenScorePage() {
  // Worked example values (fictional company: AcmeCorp)
  const exampleCategories = [
    { id: "toxic_workplace", score: 60 },
    { id: "wage_abuse", score: 50 },
    { id: "pollution_environmental_damage", score: 70 },
  ] as const;

  const exampleBase = exampleCategories.reduce(
    (sum, c) => sum + c.score * CATEGORY_WEIGHTS[c.id],
    0
  );
  // medium size × public company × western
  const exampleSize = 1.0;
  const exampleOwnership = 1.05;
  const exampleCountry = 1.1;
  const exampleFinal = Math.min(
    100,
    Math.max(0, exampleBase * exampleSize * exampleOwnership * exampleCountry)
  );

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
          The Rotten Score is a single number (0–100) that summarises how much
          documented harm a company has caused across 18 harm categories.{" "}
          <strong>0 means clean</strong>; <strong>100 means extremely rotten</strong>.
        </p>
      </section>

      {/* ── Simple explainer ── */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold">The short version</h2>

        <ol className="list-decimal list-inside space-y-3 text-gray-800">
          <li>
            <strong>Evidence is submitted</strong> for a company across any of
            the 18 harm categories (e.g. wage abuse, greenwashing, fraud).
          </li>
          <li>
            <strong>Each category gets an average score</strong> (0–100) based
            on the severity ratings of all submitted evidence for that category.
          </li>
          <li>
            <strong>A weighted average</strong> of those category scores forms
            the <em>base category score</em>. Categories with higher ethical
            weight (e.g. wage abuse) contribute more to the total.
          </li>
          <li>
            <strong>Three multipliers</strong> are applied in order to
            contextualise the score:
            <ul className="list-disc list-inside ml-4 mt-1 space-y-1 text-gray-700">
              <li>
                <strong>Company size</strong> — larger companies face higher
                scrutiny because their harm has wider reach.
              </li>
              <li>
                <strong>Ownership type</strong> — private equity and
                hedge-fund-owned companies receive a higher multiplier,
                reflecting known extractive patterns.
              </li>
              <li>
                <strong>Country / region</strong> — global multinationals and
                western-headquartered companies carry a higher multiplier due to
                greater systemic impact.
              </li>
            </ul>
          </li>
          <li>
            The result is <strong>clamped to 0–100</strong>.
          </li>
          <li>
            If a company has <strong>no evidence at all</strong>, its score is
            shown as <em>null</em> — a positive "no data" state, not a zero.
          </li>
        </ol>

        {/* Worked example */}
        <div className="border rounded-lg p-6 bg-gray-50 space-y-4">
          <h3 className="text-lg font-semibold">
            Worked example — AcmeCorp (fictional)
          </h3>
          <p className="text-sm text-gray-600">
            AcmeCorp is a medium-sized public company headquartered in a western
            country. Three categories have evidence:
          </p>

          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b text-left text-gray-600">
                <th className="py-1 pr-4">Category</th>
                <th className="py-1 pr-4 text-right">Avg score</th>
                <th className="py-1 pr-4 text-right">Weight</th>
                <th className="py-1 text-right">Contribution</th>
              </tr>
            </thead>
            <tbody>
              {exampleCategories.map((c) => (
                <tr key={c.id} className="border-b">
                  <td className="py-1 pr-4">{formatKey(c.id)}</td>
                  <td className="py-1 pr-4 text-right font-mono">{c.score}</td>
                  <td className="py-1 pr-4 text-right font-mono">
                    {CATEGORY_WEIGHTS[c.id]}
                  </td>
                  <td className="py-1 text-right font-mono">
                    {(c.score * CATEGORY_WEIGHTS[c.id]).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3} className="py-2 text-right font-medium text-gray-700">
                  Base category score
                </td>
                <td className="py-2 text-right font-mono font-semibold">
                  {exampleBase.toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>

          <div className="text-sm space-y-1 text-gray-700">
            <p>
              <span className="font-medium">× Size multiplier</span> (medium) ={" "}
              {exampleSize} → {(exampleBase * exampleSize).toFixed(2)}
            </p>
            <p>
              <span className="font-medium">× Ownership multiplier</span>{" "}
              (public company) = {exampleOwnership} →{" "}
              {(exampleBase * exampleSize * exampleOwnership).toFixed(2)}
            </p>
            <p>
              <span className="font-medium">× Country multiplier</span>{" "}
              (western) = {exampleCountry} →{" "}
              {(exampleBase * exampleSize * exampleOwnership * exampleCountry).toFixed(
                2
              )}
            </p>
            <p className="font-semibold text-gray-900 pt-1">
              Final Rotten Score (clamped 0–100):{" "}
              <span className="font-mono">{exampleFinal.toFixed(2)}</span>
            </p>
          </div>
        </div>
      </section>

      {/* ── Complex / full methodology (collapsed) ── */}
      <section>
        <details className="border rounded-lg">
          <summary className="cursor-pointer px-6 py-4 text-lg font-semibold select-none hover:bg-gray-50">
            Full methodology &amp; current weights
          </summary>

          <div className="px-6 pb-6 space-y-8 pt-4">
            <p className="text-sm text-gray-600">
              All weights and multipliers are sourced directly from{" "}
              <code className="bg-gray-100 px-1 rounded">
                lib/rotten-score.ts
              </code>{" "}
              and will stay in sync as the algorithm evolves.
            </p>

            {/* Category weights */}
            <div className="space-y-3">
              <h3 className="text-base font-semibold">
                Category weights (sum = 1.0)
              </h3>
              <p className="text-sm text-gray-600">
                The base category score is a weighted sum of whichever
                categories have evidence. Only categories with evidence
                contribute; their individual weights are not renormalized — this
                means companies with evidence in more categories can score
                higher.
              </p>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b text-left text-gray-600">
                    <th className="py-1 pr-4">Category</th>
                    <th className="py-1 text-right">Weight</th>
                  </tr>
                </thead>
                <tbody>
                  {(
                    Object.entries(CATEGORY_WEIGHTS) as [string, number][]
                  ).map(([key, weight]) => (
                    <tr key={key} className="border-b">
                      <td className="py-1 pr-4">{formatKey(key)}</td>
                      <td className="py-1 text-right font-mono">{weight}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Size multipliers */}
            <div className="space-y-3">
              <h3 className="text-base font-semibold">Size multipliers</h3>
              <p className="text-sm text-gray-600">
                Applied first. Larger companies cause wider harm, so they carry
                a higher multiplier.
              </p>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b text-left text-gray-600">
                    <th className="py-1 pr-4">Size tier</th>
                    <th className="py-1 text-right">Multiplier</th>
                  </tr>
                </thead>
                <tbody>
                  {(
                    Object.entries(SIZE_MULTIPLIERS) as [string, number][]
                  ).map(([key, mult]) => (
                    <tr key={key} className="border-b">
                      <td className="py-1 pr-4">{formatKey(key)}</td>
                      <td className="py-1 text-right font-mono">{mult}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Ownership multipliers */}
            <div className="space-y-3">
              <h3 className="text-base font-semibold">Ownership multipliers</h3>
              <p className="text-sm text-gray-600">
                Applied second. Reflects the degree to which ownership
                structures incentivise extractive or harmful behaviour.
              </p>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b text-left text-gray-600">
                    <th className="py-1 pr-4">Ownership type</th>
                    <th className="py-1 text-right">Multiplier</th>
                  </tr>
                </thead>
                <tbody>
                  {(
                    Object.entries(OWNERSHIP_MULTIPLIERS) as [string, number][]
                  ).map(([key, mult]) => (
                    <tr key={key} className="border-b">
                      <td className="py-1 pr-4">{formatKey(key)}</td>
                      <td className="py-1 text-right font-mono">{mult}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Country / region multipliers */}
            <div className="space-y-3">
              <h3 className="text-base font-semibold">
                Country / region multipliers
              </h3>
              <p className="text-sm text-gray-600">
                Applied last. Global multinationals and western-based companies
                receive a higher multiplier, reflecting their greater systemic
                reach and accountability expectations.
              </p>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b text-left text-gray-600">
                    <th className="py-1 pr-4">Region</th>
                    <th className="py-1 text-right">Multiplier</th>
                  </tr>
                </thead>
                <tbody>
                  {(
                    Object.entries(
                      COUNTRY_REGION_MULTIPLIERS
                    ) as [string, number][]
                  ).map(([key, mult]) => (
                    <tr key={key} className="border-b">
                      <td className="py-1 pr-4">{formatKey(key)}</td>
                      <td className="py-1 text-right font-mono">{mult}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Key behaviours */}
            <div className="space-y-2">
              <h3 className="text-base font-semibold">Key behaviours</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                <li>
                  Base category score = weighted sum of available category
                  scores (weights sum to 1.0 across all 18 categories).
                </li>
                <li>
                  Multipliers applied in order: size → ownership → country /
                  region.
                </li>
                <li>Final score is clamped to the range 0–100.</li>
                <li>
                  If there are no category scores, the score is{" "}
                  <code className="bg-gray-100 px-1 rounded">null</code> — a
                  positive "no data" state, not a zero.
                </li>
              </ul>
            </div>
          </div>
        </details>
      </section>
    </main>
  );
}
