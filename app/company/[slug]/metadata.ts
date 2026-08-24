import { Metadata } from "next";
import { resolveCompanySlug } from "@/lib/company-slug";
import { supabaseServer } from "@/lib/supabase-server";
import { isTestCompany } from "@/lib/test-company";
import { canonicalUrl, SITE_ORIGIN } from "@/lib/seo";
import { notFound, permanentRedirect } from "next/navigation";
import {
  buildOverviewTitle,
  buildOverviewDescription,
} from "@/lib/company-seo";

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
    .select("id, name, slug, industry, updated_at")
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

  // Sum approved evidence count from category breakdown view
  const { data: breakdownRows } = await supabase
    .from("company_category_full_breakdown")
    .select("evidence_count")
    .eq("company_id", company.id);

  const evidenceCount = (breakdownRows ?? []).reduce(
    (sum: number, row: { evidence_count?: number | null }) =>
      sum + (row.evidence_count ?? 0),
    0,
  );

  const title = buildOverviewTitle(company.name, rottenScore);
  const description = buildOverviewDescription(
    company.name,
    rottenScore,
    evidenceCount,
  );

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
