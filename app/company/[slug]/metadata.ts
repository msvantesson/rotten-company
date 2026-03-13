import { Metadata } from "next";
import { supabaseServer } from "@/lib/supabase-server";
import { isTestCompany } from "@/lib/test-company";

type Params = { slug: string };

export async function generateMetadata(
  { params }: { params: Params }
): Promise<Metadata> {
  const supabase = await supabaseServer();

  const { data: company } = await supabase
    .from("companies")
    .select("id, name, slug, industry")
    .eq("slug", params.slug)
    .maybeSingle();

  if (!company) {
    return {
      title: "Company Not Found – Rotten Company",
      description: "This company does not exist in the Rotten Company database.",
    };
  }

  const { data: scoreRow } = await supabase
    .from("company_rotten_score_v2")
    .select("rotten_score")
    .eq("company_id", company.id)
    .maybeSingle();

  const rottenScore = scoreRow?.rotten_score ?? null;

  const title = `${company.name} – Rotten Score ${rottenScore !== null ? rottenScore.toFixed(1) : "—"}`;
  const description = `See the Rotten Score, category breakdown, evidence, and ratings for ${company.name}.`;

  const url = `https://rotten-company.com/company/${company.slug}`;

  // Prevent test companies from being indexed.
  if (isTestCompany(company.name)) {
    return {
      title,
      description,
      robots: { index: false, follow: false },
    };
  }

  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description,
      url,
      siteName: "Rotten Company",
      type: "website",
      images: [
        {
          url: `https://rotten-company.com/api/og/company?slug=${company.slug}`,
          width: 1200,
          height: 630,
          alt: `${company.name} Rotten Score`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`https://rotten-company.com/api/og/company?slug=${company.slug}`],
    },
  };
}
