import type { Metadata } from "next";
import { canonicalUrl } from "../../lib/seo";

export const metadata: Metadata = {
  title: {
    absolute: "Contact Rotten Company",
  },
  description:
    "Contact Rotten Company with questions, corrections, source material, media enquiries, and other feedback.",
  alternates: {
    canonical: canonicalUrl("/contact"),
  },
  openGraph: {
    title: "Contact Rotten Company",
    description:
      "Contact Rotten Company with questions, corrections, source material, media enquiries, and other feedback.",
    url: canonicalUrl("/contact"),
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Contact Rotten Company",
    description:
      "Contact Rotten Company with questions, corrections, source material, media enquiries, and other feedback.",
  },
};

export default function ContactPage() {
  return (
    <main className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-semibold mb-6">Contact</h1>

      <div className="space-y-4 text-muted-foreground leading-relaxed">
        <p>
          Rotten Company welcomes questions, corrections, source material,
          media enquiries, and other feedback.
        </p>

        <p>
          If you believe information published on Rotten Company is inaccurate
          or incomplete, please contact us and include the company or evidence
          item concerned and any supporting documentation.
        </p>

        <p>
          Email:{" "}
          <a
            href="mailto:contact@rotten-company.com"
            className="underline hover:text-foreground"
          >
            contact@rotten-company.com
          </a>
        </p>
      </div>
    </main>
  );
}
