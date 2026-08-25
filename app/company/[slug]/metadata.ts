import { Metadata } from "next";
import { resolveCompanySlug } from "@/lib/company-slug";
import { supabaseServer } from "@/lib/supabase-server";
import { isTestCompany } from "@/lib/test-company";
import { canonicalUrl, SITE_ORIGIN } from "@/lib/seo";
import {
  buildOverviewTitle,
} from "@/lib/company-seo";

type Params = Promise<{ slug: string }> | { slug: string };

type CompanyMetadataRow = {
  id: number;
  name: string;
  slug: string;
  industry: string | null;
};

type FallbackCompany = Pick<CompanyMetadataRow, "name" | "slug">;

function buildCompanyFallbackTitle(companyName: string): string {
  return `${companyName} Rotten Score & Evidence | Rotten Company`;
}

function buildCompanyFallbackDescription(companyName: string): string {
  return `Review ${companyName}'s Rotten Score, documented evidence, misconduct cases, category breakdown and sources.`;
}

function buildSuccessDescription(
  companyName: string,
  score: number,
  evidenceCount: number,
): string {
  return `${companyName} has a Rotten Score of ${Math.round(Math.max(0, Math.min(100, score)))}/100 based on ${evidenceCount} documented evidence records. Review misconduct cases, category breakdown, sources and current status.`;
}

function buildFallbackMetadata(company?: FallbackCompany): Metadata {
  const title = company
    ? buildCompanyFallbackTitle(company.name)
    : "Company Rotten Score & Evidence | Rotten Company";
  const description = company
    ? buildCompanyFallbackDescription(company.name)
    : "Review company Rotten Scores, documented evidence, misconduct cases and sources on Rotten Company.";
  const url = company ? canonicalUrl(`/company/${company.slug}`) : null;
  const metadata: Metadata = {
    title,
    description,
    openGraph: {
      title,
      description,
      siteName: "Rotten Company",
      type: "website",
      ...(url ? { url } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };

  if (company && url) {
    metadata.alternates = {
      canonical: url,
    };
    metadata.openGraph = {
      ...metadata.openGraph,
      images: [
        {
          url: `${SITE_ORIGIN}/api/og/company?slug=${company.slug}`,
          width: 1200,
          height: 630,
          alt: `${company.name} Rotten Score`,
        },
      ],
    };
    metadata.twitter = {
      ...metadata.twitter,
      images: [`${SITE_ORIGIN}/api/og/company?slug=${company.slug}`],
    };
  }

  if (company && isTestCompany(company.name)) {
    metadata.robots = { index: false, follow: false };
  }

  return metadata;
}

export async function generateMetadata(
  { params }: { params: Params }
): Promise<Metadata> {
  const resolvedParams = (await params) as { slug?: string } | undefined;
  const slug = resolvedParams?.slug
    ? decodeURIComponent(resolvedParams.slug)
    : "";
  const supabase = await supabaseServer();
  let slugResolution: Awaited<ReturnType<typeof resolveCompanySlug>>;
  try {
    slugResolution = await resolveCompanySlug(
      supabase as unknown as Parameters<typeof resolveCompanySlug>[0],
      slug,
    );
  } catch (error) {
    console.error("Company metadata slug resolution failed", {
      slug,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return buildFallbackMetadata();
  }

  if (slugResolution.kind !== "canonical") {
    return buildFallbackMetadata();
  }

  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("id, name, slug, industry")
    .eq("id", slugResolution.companyId)
    .maybeSingle();

  if (companyError || !company) {
    console.error("Company metadata lookup failed", {
      slug,
      error: companyError?.message ?? null,
    });

    return buildFallbackMetadata();
  }

  let rottenScore: number | null = null;
  try {
    const { data: scoreRow, error: scoreError } = await supabase
      .from("company_rotten_score_v2")
      .select("rotten_score")
      .eq("company_id", company.id)
      .maybeSingle();

    if (scoreError) {
      console.error("Company metadata score lookup failed", {
        slug,
        error: scoreError.message ?? null,
      });
    } else if (
      scoreRow &&
      typeof scoreRow.rotten_score === "number" &&
      Number.isFinite(scoreRow.rotten_score)
    ) {
      rottenScore = scoreRow.rotten_score;
    }
  } catch (error) {
    console.error("Company metadata score lookup failed", {
      slug,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }

  let evidenceCount: number | null = null;
  try {
    const { data: breakdownRows, error: breakdownError } = await supabase
      .from("company_category_full_breakdown")
      .select("evidence_count")
      .eq("company_id", company.id);

    if (breakdownError) {
      console.error("Company metadata evidence lookup failed", {
        slug,
        error: breakdownError.message ?? null,
      });
    } else {
      evidenceCount = (breakdownRows ?? []).reduce(
        (sum: number, row: { evidence_count?: number | null }) =>
          sum + (row.evidence_count ?? 0),
        0,
      );
    }
  } catch (error) {
    console.error("Company metadata evidence lookup failed", {
      slug,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }

  const rawTitle = rottenScore !== null
    ? buildOverviewTitle(company.name, rottenScore)
    : buildCompanyFallbackTitle(company.name);
  const description = rottenScore !== null && evidenceCount !== null
    ? buildSuccessDescription(company.name, rottenScore, evidenceCount)
    : buildCompanyFallbackDescription(company.name);

  const url = canonicalUrl(`/company/${company.slug}`);

  const title = rottenScore !== null
    ? { absolute: rawTitle }
    : rawTitle;

  const metadata: Metadata = {
    title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: rawTitle,
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
      title: rawTitle,
      description,
      images: [`${SITE_ORIGIN}/api/og/company?slug=${company.slug}`],
    },
  };

  if (isTestCompany(company.name)) {
    metadata.robots = { index: false, follow: false };
  }

  return metadata;
}
