import type { Metadata } from "next";
import { canonicalUrl } from "@/lib/seo";

export const rottenIndexMetadata: Metadata = {
  title: {
    absolute: "Rotten Index | Companies Ranked by Documented Misconduct",
  },
  description:
    "Browse the global Rotten Index: companies and leaders ranked by severity of verified misconduct. Filter by country, industry, and evidence count.",
  alternates: {
    canonical: canonicalUrl("/rotten-index"),
  },
  openGraph: {
    title: "Rotten Index — Companies Ranked by Documented Misconduct",
    description:
      "Browse the global Rotten Index: companies and leaders ranked by severity of verified misconduct. Filter by country, industry, and evidence count.",
    url: canonicalUrl("/rotten-index"),
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Rotten Index — Companies Ranked by Documented Misconduct",
    description:
      "Browse the global Rotten Index: companies and leaders ranked by severity of verified misconduct.",
  },
};
