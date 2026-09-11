import type { Metadata } from "next";
import { canonicalUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: {
    absolute: "Terms of Service | Rotten Company",
  },
  description: "Terms governing use of Rotten Company.",
  alternates: {
    canonical: canonicalUrl("/terms"),
  },
};

export default function TermsPage() {
  return (
    <main className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-semibold mb-6">Terms of Service</h1>

      <div className="space-y-8 text-gray-700 leading-relaxed">
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">Acceptance</h2>
          <p>
            By accessing or using Rotten Company, you agree to these Terms of
            Service.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Purpose of the platform
          </h2>
          <p>
            Rotten Company is an informational and public-interest platform for
            documented corporate evidence, scoring and analysis, user
            submissions, and public accountability or research. Rotten Scores
            and related assessments are analytical and informational in nature.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">Accounts</h2>
          <p>
            You are responsible for providing accurate account information,
            maintaining the security of your account, and activity that occurs
            through your account. Email-and-password authentication and Google
            sign-in may be available.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">
            User submissions
          </h2>
          <p>
            Users may submit evidence, links, descriptions, ratings, and other
            permitted content. You must have a lawful basis to submit the
            material and must not knowingly submit false, fabricated, unlawful,
            malicious, infringing, or otherwise unjustified personal data.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">Moderation</h2>
          <p>
            Rotten Company may review submissions, edit them for formatting or
            clarity, reject or remove material, request clarification, and
            change publication status where reasonably necessary for quality,
            legality, relevance, or platform integrity.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Evidence and accuracy
          </h2>
          <p>
            Content on Rotten Company may come from public sources, user
            submissions, and documented evidence. Reasonable efforts may be made
            to verify material, but publication does not mean Rotten Company
            guarantees every source, claim, or interpretation. Interpretations
            may change as new information becomes available, and users should
            review cited sources directly.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">Rotten Scores</h2>
          <p>
            Rotten Scores are analytical assessments based on available evidence
            and methodology. Scores and explanations may change if the evidence
            base or methodology changes. They are not legal findings and are not
            declarations of criminal liability.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">Prohibited use</h2>
          <p>
            You must not abuse the service, attempt unauthorized access,
            interfere with site operations, automate harmful traffic, submit
            malicious code, impersonate others, manipulate ratings or
            submissions, or use the platform unlawfully.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Intellectual property
          </h2>
          <p>
            Rotten Company&apos;s site design, branding, original text,
            methodology, and original platform content may be protected by
            intellectual property law. Third-party material remains the property
            of its respective owners, and users should respect copyright and
            source attribution requirements.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">
            User content licence
          </h2>
          <p>
            By submitting content intended for publication, you grant Rotten
            Company a non-exclusive licence to host, reproduce, display, format,
            and distribute that content as needed to operate the platform. You
            retain ownership of your content.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">
            No professional advice
          </h2>
          <p>
            Rotten Company does not provide legal, financial, or investment
            advice.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">Availability</h2>
          <p>
            The service may change, experience interruptions, contain errors, or
            be modified or discontinued. Rotten Company does not guarantee
            uninterrupted availability.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Account restriction
          </h2>
          <p>
            Rotten Company may suspend or remove accounts for abuse, security
            threats, repeated policy violations, or unlawful conduct.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Limitation and disclaimer
          </h2>
          <p>
            Rotten Company is provided for informational and public-interest
            purposes, and use of the platform is at your own judgment.
            References, evidence, and scores should be considered together with
            the cited sources and the site disclaimer.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Changes to these terms
          </h2>
          <p>
            These Terms of Service may be updated from time to time. Continued
            use of Rotten Company after updates means the updated terms apply,
            subject to applicable law.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">Contact</h2>
          <p>
            Questions about these terms may be sent to{" "}
            <a
              href="mailto:contact@rotten-company.com"
              className="underline hover:text-foreground"
            >
              contact@rotten-company.com
            </a>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
