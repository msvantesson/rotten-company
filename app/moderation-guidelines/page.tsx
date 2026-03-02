import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Moderation Guidelines | Rotten Company",
  description:
    "Learn what content Rotten Company accepts, what we reject, and how evidence is reviewed.",
};

export default function ModerationGuidelinesPage() {
  return (
    <main className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-semibold mb-6">Moderation Guidelines</h1>

      <div className="space-y-8 text-gray-700 leading-relaxed">

        {/* What we accept */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">What we accept</h2>
          <p>
            Rotten Company focuses on the documented actions of corporate leaders and
            decision-makers. Submissions are accepted when they concern:
          </p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>
              <strong>C-suite executives, board members, and senior directors</strong> acting
              in their official capacity.
            </li>
            <li>
              <strong>Managers</strong> — only where their managerial role is clearly evidenced
              in the submission (e.g., court filings, regulatory decisions, or credible news
              reports that identify the person by their managerial title and describe conduct
              connected to that role).
            </li>
          </ul>
          <p className="mt-2">
            Evidence must relate to conduct that occurred in a professional or corporate
            context. Personal conduct unrelated to a leadership role falls outside our scope.
          </p>
        </section>

        {/* What we do not accept */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">What we do not accept</h2>
          <p>The following will be removed and may result in account suspension:</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>
              <strong>Non-leader targeting:</strong> submissions about employees, contractors,
              or individuals with no documented leadership or managerial responsibility.
            </li>
            <li>
              <strong>Sexual or explicit content</strong> of any kind.
            </li>
            <li>
              <strong>Doxxing and personal identifying information (PII):</strong> home
              addresses, personal phone numbers, personal email addresses, national
              identification numbers, or any information that could enable targeted harassment
              of an individual.
            </li>
            <li>
              <strong>Threats, harassment, and hate:</strong> content that threatens physical
              harm, encourages harassment campaigns, or promotes hatred based on protected
              characteristics.
            </li>
            <li>
              <strong>Content involving minors</strong> in any form.
            </li>
          </ul>
        </section>

        {/* Links and promotion policy */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">Links &amp; promotion policy</h2>

          <h3 className="text-base font-semibold text-gray-800 mb-2">Allowed</h3>
          <p>
            Links are permitted when they support the evidence or provide context for the
            submission. Examples of acceptable sources include:
          </p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>News articles from credible outlets directly related to the conduct described.</li>
            <li>Court filings, regulatory decisions, or official government documents.</li>
            <li>Academic or non-profit research reports.</li>
          </ul>
          <p className="mt-2">
            Links must be <strong>supplementary</strong> — they support the submission but
            are not the only content. A submission that consists solely of a link without
            substantive descriptive text will be rejected.
          </p>

          <h3 className="text-base font-semibold text-gray-800 mt-4 mb-2">Not allowed</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>Affiliate, referral, promotional, or advertising links of any kind.</li>
            <li>Promo codes or discount links.</li>
            <li>
              Link dumps or spam — submissions composed primarily of multiple links with
              little or no substantive content.
            </li>
          </ul>
        </section>

        {/* Evidence quality */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">Evidence quality expectations</h2>
          <p>
            Strong submissions include:
          </p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>A clear description of what happened and when.</li>
            <li>Identification of the specific leader or decision-maker involved and their role.</li>
            <li>
              At least one verifiable source (court document, regulatory filing, news report,
              or official corporate communication).
            </li>
            <li>An explanation of why the conduct is relevant to corporate accountability.</li>
          </ul>
          <p className="mt-2">
            Vague, unsubstantiated, or speculative submissions will be declined during review.
            Moderators may request clarification or additional sources before approving a
            submission.
          </p>
        </section>

        {/* Moderation outcomes */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">Moderation outcomes</h2>
          <p>Each submission is reviewed against these guidelines and may result in:</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li><strong>Approved</strong> — the submission meets quality standards and is published.</li>
            <li>
              <strong>Returned for revision</strong> — the submission has potential but needs
              additional evidence, clarification, or other changes before it can be approved.
            </li>
            <li>
              <strong>Declined</strong> — the submission does not meet our guidelines and will
              not be published.
            </li>
            <li>
              <strong>Removed</strong> — already-published content that is found to violate
              these guidelines will be taken down.
            </li>
          </ul>
          <p className="mt-2">
            Repeated submission of content that violates these guidelines may result in
            account suspension.
          </p>
        </section>

        {/* Disclaimer */}
        <section className="border-t border-gray-200 pt-6">
          <p className="text-sm text-gray-500">
            <strong>Disclaimer:</strong> These guidelines describe our content moderation
            practices and do not constitute legal advice. Nothing on this platform should be
            construed as a legal determination, finding of liability, or allegation of
            criminal conduct. See our{" "}
            <Link href="/disclaimer" className="underline hover:text-gray-700">
              full disclaimer
            </Link>
            {" "}for more information.
          </p>
        </section>

      </div>
    </main>
  );
}
