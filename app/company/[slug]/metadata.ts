import { Metadata } from "next";
import { supabaseServer } from "@/lib/supabase-server";

type Params = { slug: string };

export async function generateMetadata(
  { params }: { params: Params }
): Promise<Metadata> {
  const supabase = await supabaseServer();

  const { data: company } = await supabase
    .from("companies")
    .select("id, name, slug, industry, rotten_score")
    .eq("slug", params.slug)
    .maybeSingle();

  if (!company) {
    return {
      title: "Company Not Found – Rotten Company",
      description: "This company does not exist in the Rotten Company database.",
    };
  }

  const title = `${company.name} – Rotten Score ${company.rotten_score ?? "—"}`;
  const description = `See the Rotten Score, category breakdown, evidence, and ratings for ${company.name}.`;

  const url = `https://rotten-company.com/company/${company.slug}`;

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
