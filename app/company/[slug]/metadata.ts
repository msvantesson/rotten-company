import { Metadata } from "next";
import { isTestCompany } from "@/lib/test-company";
import { canonicalUrl, SITE_ORIGIN } from "@/lib/seo";
import {
  buildOverviewTitle,
} from "@/lib/company-seo";
import {
  getCompanyDetailErrorMessage,
  getCompanyDetailRouteData,
} from "./detail-data";

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

  let detailData: Awaited<ReturnType<typeof getCompanyDetailRouteData>>;
  try {
    detailData = await getCompanyDetailRouteData(slug);
    if (detailData.slugResolution.kind !== "canonical") {
      return buildFallbackMetadata();
    }
  } catch (error) {
    console.error("Company metadata slug resolution failed", {
      slug,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return buildFallbackMetadata();
  }

  const { company, companyError } = detailData;

  if (companyError || !company) {
    console.error("Company metadata lookup failed", {
      slug,
      error: getCompanyDetailErrorMessage(companyError),
    });

    return buildFallbackMetadata();
  }

  const rottenScore = detailData.rottenScore;
  const evidenceCount = detailData.evidenceCount;

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
