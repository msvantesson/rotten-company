import { type Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase-server";
import { resolveCompanySlug } from "@/lib/company-slug";
import { isTestCompany } from "@/lib/test-company";
import { canonicalUrl, SITE_ORIGIN } from "@/lib/seo";
import {
  buildBreakdownTitle,
  buildBreakdownDescription,
} from "@/lib/company-seo";

type Params = { slug?: string };

export async function generateBreakdownMetadata(
  params: Params,
): Promise<Metadata> {
  const rawSlug = params.slug
    ? decodeURIComponent(params.slug)
    : "";

  const supabase = await supabaseServer();
  const slugResolution = await resolveCompanySlug(
    supabase as unknown as Parameters<typeof resolveCompanySlug>[0],
    rawSlug,
  );

  if (slugResolution.kind === "not_found") {
    notFound();
  }

  if (slugResolution.kind === "redirect") {
    permanentRedirect(`/company/${slugResolution.canonicalSlug}/breakdown`);
  }

  const { data: company } = await supabase
    .from("companies")
    .select("id, name, slug")
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

  const titleString = buildBreakdownTitle(company.name);
  const title = { absolute: titleString };
  const description = buildBreakdownDescription(company.name, rottenScore);
  const url = canonicalUrl(`/company/${company.slug}/breakdown`);

  if (isTestCompany(company.name)) {
    return {
      title,
      description,
      robots: { index: false, follow: false },
      openGraph: { title: titleString, description },
      twitter: { card: "summary_large_image", title: titleString, description },
    };
  }

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: titleString,
      description,
      url,
      siteName: "Rotten Company",
      type: "website",
      images: [
        {
          url: `${SITE_ORIGIN}/api/og/company?slug=${company.slug}`,
          width: 1200,
          height: 630,
          alt: `${company.name} Rotten Score Breakdown`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: titleString,
      description,
      images: [`${SITE_ORIGIN}/api/og/company?slug=${company.slug}`],
    },
  };
}
