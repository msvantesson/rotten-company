export const dynamic = "force-dynamic";

export default function DisclaimerPage() {
  return (
    <main className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-semibold mb-6">
        Disclaimer
      </h1>

      <div className="space-y-4 text-gray-700 leading-relaxed">
        <p>
          Rotten Company is an informational platform operating in the public
          interest. It aggregates, organizes, and presents documented evidence
          relating to corporate behavior, governance, and impact.
        </p>

        <p>
          All content is based on verifiable sources and contributor submissions
          and is provided for transparency, research, and public accountability
          purposes. Rotten Scores and related materials represent analytical
          assessments derived from the evidence cited and do not constitute legal
          determinations, findings of liability, or allegations of criminal
          conduct.
        </p>

        <p>
          Companies and individuals referenced on this platform are presumed to
          act lawfully unless and until determined otherwise by a competent
          judicial or regulatory authority. Where interpretations or conclusions
          are presented, they are subject to revision as additional evidence
          becomes available.
        </p>

        <p>
          Rotten Company does not provide legal, financial, or investment advice.
          The platform aims to facilitate informed public discourse by making
          evidence accessible, contextualized, and open to scrutiny.
        </p>
      </div>
    </main>
  );
}
