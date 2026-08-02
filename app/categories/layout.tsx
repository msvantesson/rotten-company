import type { Metadata } from "next";
import { canonicalUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Misconduct Categories",
  description:
    "Explore corporate misconduct categories used to assess companies on Rotten Company: labour practices, environmental harm, financial misconduct, and more.",
  alternates: {
    canonical: canonicalUrl("/categories"),
  },
  openGraph: {
    title: "Misconduct Categories | Rotten Company",
    description:
      "Explore corporate misconduct categories used to assess companies on Rotten Company.",
    url: canonicalUrl("/categories"),
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Misconduct Categories | Rotten Company",
    description:
      "Explore corporate misconduct categories used to assess companies on Rotten Company.",
  },
};

export default function CategoriesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
