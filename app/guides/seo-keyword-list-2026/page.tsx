import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SEO Keyword List 2026 — Corporate Accountability & Misconduct | Rotten Company",
  description:
    "A comprehensive SEO keyword reference for corporate accountability research in 2026. Covers entity search, Rotten Score methodology, category-level, listicle, and AI-friendly explainer keywords.",
  alternates: {
    canonical: "https://rotten-company.com/guides/seo-keyword-list-2026",
  },
  openGraph: {
    title: "SEO Keyword List 2026 — Corporate Accountability & Misconduct",
    description:
      "A comprehensive SEO keyword reference for corporate accountability research in 2026.",
    url: "https://rotten-company.com/guides/seo-keyword-list-2026",
    siteName: "Rotten Company",
    type: "article",
  },
};

export default function SeoKeywordList2026Page() {
  return (
    <main className="max-w-4xl mx-auto px-4 py-12 space-y-12">
      <header className="space-y-4">
        <h1 className="text-4xl font-bold">
          Rotten Company — SEO Keyword List (2026 Edition)
        </h1>
        <p className="text-lg text-muted-foreground">
          Keywords grouped by intent — because that&apos;s how Google ranks
          content today. Use this reference to align your research with how
          people actually search for corporate misconduct and accountability
          information.
        </p>
      </header>

      {/* Section 1 */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">
          1. High‑Intent &ldquo;Entity Search&rdquo; Keywords
        </h2>
        <p className="text-muted-foreground">
          The most valuable keywords — people searching for specific companies,
          executives, or controversies. These bring ready‑to‑convert users who
          are already suspicious or actively researching.
        </p>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[480px] border-collapse text-sm">
            <thead className="bg-muted border-b border-border">
              <tr className="text-left text-muted-foreground">
                <th className="py-2 px-3">Keyword pattern</th>
                <th className="py-2 px-3">Intent</th>
                <th className="py-2 px-3">Where to use it</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[
                ["Is [company] ethical", "Investigative", "Company pages, FAQs"],
                ["[company] controversies", "High‑intent", "Evidence timeline"],
                ["[company] labor violations", "High‑intent", "Category pages"],
                ["[company] ESG score", "Informational", "Company pages"],
                ["[company] reputation", "Informational", "Company overview"],
                ["[company] workplace culture", "High‑intent", "Company page intro"],
                ["[company] employment practices", "Informational", "Company overview"],
                ["[company] environmental record", "Informational", "Company pages"],
                ["[company] compliance issues", "High‑intent", "Evidence timeline"],
                ["[company] allegations", "Investigative", "Evidence pages"],
              ].map(([keyword, intent, where]) => (
                <tr key={keyword} className="odd:bg-surface even:bg-surface-2">
                  <td className="py-2 px-3 font-mono text-xs">{keyword}</td>
                  <td className="py-2 px-3 text-muted-foreground">{intent}</td>
                  <td className="py-2 px-3 text-muted-foreground">{where}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Section 2 */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">
          2. Rotten Score &amp; Methodology Keywords
        </h2>
        <p className="text-muted-foreground">
          These build authority and help AI assistants reference Rotten Company
          as a source. Use them on the methodology and Rotten Score pages.
        </p>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[480px] border-collapse text-sm">
            <thead className="bg-muted border-b border-border">
              <tr className="text-left text-muted-foreground">
                <th className="py-2 px-3">Keyword</th>
                <th className="py-2 px-3">Intent</th>
                <th className="py-2 px-3">Where to use it</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[
                ["corporate toxicity score", "Informational", "Methodology page"],
                ["company rottenness index", "Branded", "Rotten Index"],
                ["corporate accountability index 2026", "Informational", "Annual article"],
                ["how to measure corporate misconduct", "Informational", "Methodology"],
                ["ethical company rating system", "Informational", "Methodology"],
                ["corporate misconduct database", "Informational", "Homepage"],
                ["evidence-based company ratings", "Informational", "Methodology"],
              ].map(([keyword, intent, where]) => (
                <tr key={keyword} className="odd:bg-surface even:bg-surface-2">
                  <td className="py-2 px-3 font-mono text-xs">{keyword}</td>
                  <td className="py-2 px-3 text-muted-foreground">{intent}</td>
                  <td className="py-2 px-3 text-muted-foreground">{where}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Section 3 */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">3. Category‑Level Keywords</h2>
        <p className="text-muted-foreground">
          These help category pages rank and tell Google your taxonomy. Each
          category page should target 1–2 primary keywords from this list.
        </p>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[480px] border-collapse text-sm">
            <thead className="bg-muted border-b border-border">
              <tr className="text-left text-muted-foreground">
                <th className="py-2 px-3">Category</th>
                <th className="py-2 px-3">Keywords</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[
                [
                  "Labor",
                  "labor violations list, worst companies for workers, union busting companies",
                ],
                [
                  "Environment",
                  "environmental offenders list, polluting companies ranking",
                ],
                [
                  "Governance",
                  "corporate governance failures, board scandals 2026",
                ],
                [
                  "Diversity",
                  "DEI controversies, diversity scandal companies",
                ],
                [
                  "Private Equity",
                  "private equity fallout, PE cost cutting harm, private equity portfolio controversies",
                ],
              ].map(([category, keywords]) => (
                <tr key={category} className="odd:bg-surface even:bg-surface-2">
                  <td className="py-2 px-3 font-semibold">{category}</td>
                  <td className="py-2 px-3 text-muted-foreground text-xs font-mono">
                    {keywords}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Section 4 */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">
          4. &ldquo;Listicle&rdquo; Keywords — High Click‑Through
        </h2>
        <p className="text-muted-foreground">
          SEO gold — these attract backlinks and social shares. Create evergreen
          articles targeting these terms; update them every 60–90 days for
          freshness signals.
        </p>
        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
          <li>worst companies to work for 2026</li>
          <li>most unethical companies 2026</li>
          <li>top corporate scandals 2026</li>
          <li>worst CEOs 2026</li>
          <li>most toxic workplaces list</li>
          <li>companies with highest Rotten Score</li>
          <li>corporate accountability rankings 2026</li>
        </ul>
      </section>

      {/* Section 5 */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">
          5. &ldquo;Explainer&rdquo; Keywords — AI‑Friendly
        </h2>
        <p className="text-muted-foreground">
          These help AI assistants cite Rotten Company as a reference. Structured,
          explanatory content with clear headings performs best here.
        </p>
        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
          <li>what is corporate misconduct</li>
          <li>how to evaluate company ethics</li>
          <li>what makes a company toxic</li>
          <li>corporate accountability explained</li>
          <li>how to report company misconduct</li>
          <li>what is an ESG score</li>
        </ul>
      </section>

      {/* Section 6 — How to use */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold">
          How to Use This Keyword List
        </h2>

        <div className="space-y-4">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">
              1. Assign 1–2 primary keywords per page
            </h3>
            <p className="text-sm text-muted-foreground">
              Never target more than two primary keywords on a single page —
              Google gets confused. Example for a company page: primary keyword{" "}
              <em>&ldquo;Is [company] ethical&rdquo;</em>; secondary keyword{" "}
              <em>&ldquo;[company] controversies&rdquo;</em>.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-semibold">
              2. Place keywords naturally in
            </h3>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>Page title and meta description</li>
              <li>First 100 words of body copy</li>
              <li>Section headings (H2 / H3)</li>
              <li>Image alt text</li>
              <li>FAQ section answers</li>
              <li>Internal link anchor text</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-semibold">3. Build topic clusters</h3>
            <p className="text-sm text-muted-foreground">
              Google ranks clusters, not isolated pages. Example cluster: a main
              page &ldquo;Corporate Toxicity Score Explained&rdquo; supported by
              category-level pages (Labor Violations, Environmental Offenses,
              Governance Failures), all internally linked to each other.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-semibold">
              4. Refresh pages every 60–90 days
            </h3>
            <p className="text-sm text-muted-foreground">
              Google rewards freshness, especially for controversies, executive
              changes, and score updates. Even small additions boost rankings.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-semibold">5. Add schema markup</h3>
            <p className="text-sm text-muted-foreground">
              Structured data (JSON-LD) is a major organic search signal in
              2026. Rotten Company already emits JSON-LD on company pages.
              Extend it to leader, owner, evidence, and category pages for
              maximum coverage.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">
          Frequently Asked Questions
        </h2>
        <dl className="space-y-4 text-sm">
          <div>
            <dt className="font-semibold">What is the Rotten Score?</dt>
            <dd className="text-muted-foreground mt-1">
              The Rotten Score is an evidence-based corporate accountability
              index (0–100) calculated from moderated, documented submissions.
              Higher scores indicate more verified misconduct.{" "}
              <a href="/rotten-score" className="text-accent hover:underline">
                Learn how it works →
              </a>
            </dd>
          </div>
          <div>
            <dt className="font-semibold">
              How do you verify evidence of corporate misconduct?
            </dt>
            <dd className="text-muted-foreground mt-1">
              All evidence submissions are reviewed by community moderators
              against clear guidelines before they can affect any score.{" "}
              <a
                href="/moderation-guidelines"
                className="text-accent hover:underline"
              >
                Read the moderation guidelines →
              </a>
            </dd>
          </div>
          <div>
            <dt className="font-semibold">
              Can a company improve its Rotten Score?
            </dt>
            <dd className="text-muted-foreground mt-1">
              Yes. Remediation evidence — documented corrective actions — is
              reviewed and weighted in the score formula, allowing genuine
              improvement to be reflected.
            </dd>
          </div>
        </dl>
      </section>
    </main>
  );
}
