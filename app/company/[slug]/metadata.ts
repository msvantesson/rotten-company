import { Metadata } from "next";
import { getMacroTier } from "@/lib/flavor-engine";
import { resolveCompanySlug } from "@/lib/company-slug";
import { supabaseServer } from "@/lib/supabase-server";
import { isTestCompany } from "@/lib/test-company";
import { canonicalUrl, SITE_ORIGIN } from "@/lib/seo";
import { notFound, permanentRedirect } from "next/navigation";

type Params = { slug: string };

export async function generateMetadata(
  { params }: { params: Params }
): Promise<Metadata> {
  const supabase = await supabaseServer();
  const slugResolution = await resolveCompanySlug(
    supabase as unknown as Parameters<typeof resolveCompanySlug>[0],
    params.slug,
  );

  if (slugResolution.kind === "not_found") {
    notFound();
  }

  if (slugResolution.kind === "redirect") {
    permanentRedirect(`/company/${slugResolution.canonicalSlug}`);
  }

  const { data: company } = await supabase
    .from("companies")
    .select("id, name, slug, industry")
    .eq("id", slugResolution.companyId)
    .maybeSingle();

  if (!company) {
    notFound();
  }

  const { data: scoreRow } = await supabase
    .from("company_rotten_score_v2")
    .select("rotten_score")
    .eq("company_id", company.id)
    .maybeSingle();

  const rottenScore = scoreRow?.rotten_score ?? null;

  const scoreLabel = rottenScore !== null ? rottenScore.toFixed(1) : "—";
  const macroTier = rottenScore !== null ? getMacroTier(rottenScore) : "—";
  const title = `${company.name} — Rotten Score ${scoreLabel} — ${macroTier}`;
  const description = `${company.name}: Rotten Score ${scoreLabel} — ${macroTier}. See category breakdown, evidence, and ratings.`;

  const url = canonicalUrl(`/company/${company.slug}`);

  // Prevent test companies from being indexed.
  if (isTestCompany(company.name)) {
    return {
      title,
      description,
      robots: { index: false, follow: false },
      openGraph: {
        title,
        description,
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
      },
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
          url: `${SITE_ORIGIN}/api/og/company?slug=${company.slug}`,
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
      images: [`${SITE_ORIGIN}/api/og/company?slug=${company.slug}`],
    },
  };
}
