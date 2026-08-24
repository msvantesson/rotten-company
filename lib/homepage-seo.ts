import type { Metadata } from "next";
import { canonicalUrl } from "@/lib/seo";

export const HOMEPAGE_TITLE = "Rotten Company | Evidence-Based Corporate Accountability";
export const HOMEPAGE_DESCRIPTION =
  "Expose and track corporate wrongdoing backed by verified evidence. Browse Rotten Scores, misconduct records, and leadership accountability for companies worldwide.";

export const homepageMetadata: Metadata = {
  title: HOMEPAGE_TITLE,
  description: HOMEPAGE_DESCRIPTION,
  alternates: {
    canonical: canonicalUrl("/"),
  },
  openGraph: {
    title: HOMEPAGE_TITLE,
    description: HOMEPAGE_DESCRIPTION,
    url: canonicalUrl("/"),
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: HOMEPAGE_TITLE,
    description: HOMEPAGE_DESCRIPTION,
  },
};
