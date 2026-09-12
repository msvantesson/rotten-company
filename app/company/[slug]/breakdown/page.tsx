// Cache this page for 5 minutes (ISR) to reduce Supabase query volume and server load
// while still serving reasonably fresh data. Increase for lower load or decrease for fresher data.
export const revalidate = 300;

import { type Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { getEvidenceWithManagers } from "@/lib/getEvidenceWithManagers";
import { CategoryBreakdown } from "@/components/CategoryBreakdown";
import CompanyTabs from "@/components/CompanyTabs";
import { generateBreakdownMetadata } from "./metadata";
import { canonicalUrl, buildBreadcrumbJsonLd } from "@/lib/seo";
import {
  getCompanyDetailErrorCode,
  getCompanyDetailRouteData,
} from "../detail-data";

type BreakdownData = Parameters<typeof CategoryBreakdown>[0]["breakdown"];
type EvidenceData = Parameters<typeof CategoryBreakdown>[0]["evidence"];

// Re-export generateMetadata so Next.js picks it up from this route file.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug?: string }> | { slug?: string };
}): Promise<Metadata> {
  const resolvedParams = await Promise.resolve(params);
  return generateBreakdownMetadata({ slug: resolvedParams?.slug });
}

export default async function BreakdownPage({
  params,
}: {
  params: Promise<{ slug?: string }> | { slug?: string };
}) {
  const resolvedParams = await Promise.resolve(params);
  const rawSlug = resolvedParams?.slug ?? "";

  if (!rawSlug) {
    console.warn("⚠️ Missing slug in breakdown page");
    return notFound();
  }

  const detailData = await getCompanyDetailRouteData(rawSlug);
  const { slugResolution } = detailData;

  if (slugResolution.kind === "not_found") {
    console.warn("[company-breakdown] company_not_found", { slug: rawSlug });
    return notFound();
  }

  if (slugResolution.kind === "redirect") {
    permanentRedirect(`/company/${slugResolution.canonicalSlug}/breakdown`);
  }

  const slug = slugResolution.canonicalSlug;
  const { company, companyError } = detailData;

  if (companyError) {
    console.error("[company-breakdown] company_lookup_failed", {
      slug,
      code: getCompanyDetailErrorCode(companyError),
    });
    throw companyError;
  }

  if (!company) {
    console.warn("[company-breakdown] company_not_found", { slug });
    return notFound();
  }

  const evidencePromise: Promise<EvidenceData> = getEvidenceWithManagers(company.id)
    .then((rows) => rows ?? [])
    .catch((e) => {
      console.error("❌ Error loading evidence for company:", company.id, e);
      return [];
    });

  const breakdownPromise: Promise<BreakdownData> = Promise.resolve(
    detailData.breakdown.map((row) => ({
      ...row,
      rating_count: row.rating_count ?? 0,
      evidence_count: row.evidence_count ?? 0,
    })),
  );

  const [evidence, breakdown] = await Promise.all([
    evidencePromise,
    breakdownPromise,
  ]);

  // 4) Render
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", url: canonicalUrl("/") },
    { name: "Rotten Index", url: canonicalUrl("/rotten-index") },
    { name: company.name, url: canonicalUrl(`/company/${company.slug}`) },
    { name: "Breakdown", url: canonicalUrl(`/company/${company.slug}/breakdown`) },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <div className="max-w-3xl mx-auto py-8 px-4">
      <header>
        <h1 className="text-3xl font-semibold">{company.name} Rotten Score Breakdown</h1>
        <CompanyTabs slug={company.slug} />
      </header>

      <section>
        <CategoryBreakdown company={company} breakdown={breakdown} evidence={evidence} showHeader={false} />
      </section>
    </div>
    </>
  );
}
