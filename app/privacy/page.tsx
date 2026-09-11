import type { Metadata } from "next";
import { canonicalUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: {
    absolute: "Privacy Policy | Rotten Company",
  },
  description: "Privacy information for users of Rotten Company.",
  alternates: {
    canonical: canonicalUrl("/privacy"),
  },
};

export default function PrivacyPage() {
  return (
    <main className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-semibold mb-6">Privacy Policy</h1>

      <div className="space-y-8 text-gray-700 leading-relaxed">
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">What Rotten Company is</h2>
          <p>
            Rotten Company is a public-interest informational platform that
            aggregates, organizes, and presents documented evidence relating to
            companies. The platform also supports user accounts, submissions,
            ratings, feedback, and moderation-related participation.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Information users provide
          </h2>
          <p>
            Depending on how you use Rotten Company, you may provide information
            such as your email address, account or profile identifiers, evidence
            submissions, comments, descriptions, source URLs, ratings, feedback,
            and communications you send to us by email or through contact
            features.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">Authentication</h2>
          <p>
            Authentication is handled using Supabase Auth. Users may be able to
            sign up or sign in with email and password, and Google sign-in may
            also be available.
          </p>
          <p>
            If you use Google sign-in, Rotten Company receives the account
            information needed for authentication, such as your name, email
            address, and profile image where provided by Google. Rotten Company
            does not request access to Gmail, Google Drive, Google Calendar,
            contacts, or other unrelated Google services.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Technical information and session data
          </h2>
          <p>
            Like most web services, Rotten Company and its infrastructure may
            process technical information such as IP address, browser or device
            information, timestamps, request and error logs, and session or
            cookie information needed for authentication, security, and normal
            operation.
          </p>
          <p>
            Cookies or similar browser storage may be used for authentication
            sessions, maintaining logged-in state, security, and essential site
            functionality.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">
            How information is used
          </h2>
          <p>
            Rotten Company may use information to create and authenticate
            accounts, operate the platform, process submissions, support
            moderation, prevent abuse, maintain security, troubleshoot issues,
            respond to users, and improve the reliability and functionality of
            the service.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">Public submissions</h2>
          <p>
            Information intentionally submitted for publication, including
            evidence submissions, source material, descriptions, comments, or
            similar content, may become publicly visible after moderation or
            publication. Please avoid submitting sensitive personal information
            unless it is necessary, lawful, and appropriate for the purpose of
            the submission.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Third-party providers
          </h2>
          <p>
            Rotten Company relies on third-party service providers to operate
            the site, including Supabase for authentication and supporting
            infrastructure. Google is also involved when Google sign-in is used.
            The service may additionally rely on a hosting provider and related
            infrastructure providers to deliver the website.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">Data retention</h2>
          <p>
            Information may be retained for as long as reasonably necessary to
            provide the service, maintain account and security records, handle
            moderation decisions and disputes, comply with legal obligations,
            and protect legitimate interests related to the platform.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">Your rights</h2>
          <p>
            Depending on your circumstances and applicable law, you may contact
            Rotten Company about access to information about you, correction or
            deletion requests, account questions, or other privacy concerns.
          </p>
          <p>
            Contact:{" "}
            <a
              href="mailto:contact@rotten-company.com"
              className="underline hover:text-foreground"
            >
              contact@rotten-company.com
            </a>
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">Security</h2>
          <p>
            Rotten Company uses reasonable technical and organizational measures
            intended to protect information, but no internet service can
            guarantee absolute security.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">Children</h2>
          <p>
            Rotten Company is not intended for children. If you believe
            information relating to a child has been submitted inappropriately,
            please contact us.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Changes to this policy
          </h2>
          <p>
            This Privacy Policy may be updated from time to time. This page is
            intended to reflect the current version.
          </p>
        </section>
      </div>
    </main>
  );
}
