import type { Metadata } from "next";
import { canonicalUrl } from "@/lib/seo";
import { getEvidencePageData } from "./detail-data";

type Params = Promise<{ id: string }> | { id: string };

function parseEvidenceId(value: string | undefined): number | null {
  if (!value || !/^\d+$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function buildFallbackMetadata(id: number | null): Metadata {
  const title = "Evidence | Rotten Company";
  const description = "Evidence details are unavailable on Rotten Company.";
  const url = id === null ? undefined : canonicalUrl(`/evidence/${id}`);

  return {
    title: { absolute: title },
    description,
    ...(url ? { alternates: { canonical: url } } : {}),
    robots: { index: false, follow: false },
    openGraph: {
      title,
      description,
      ...(url ? { url } : {}),
      siteName: "Rotten Company",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

function buildDescription(summary: string | null, companyName: string): string {
  const summaryText = summary?.trim();
  const description = summaryText
    ? `${companyName}: ${summaryText}`
    : `Approved evidence record for ${companyName} on Rotten Company.`;
  return description.length > 160
    ? `${description.slice(0, 157).trimEnd()}…`
    : description;
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const resolved = await params;
  const id = parseEvidenceId(resolved?.id);
  if (id === null) return buildFallbackMetadata(null);

  try {
    const data = await getEvidencePageData(id);
    if (!data) return buildFallbackMetadata(id);

    const title = `${data.evidence.title} | ${data.company.name} | Rotten Company`;
    const description = buildDescription(data.evidence.summary, data.company.name);
    const url = canonicalUrl(`/evidence/${data.evidence.id}`);

    return {
      title: { absolute: title },
      description,
      alternates: { canonical: url },
      openGraph: {
        title,
        description,
        url,
        siteName: "Rotten Company",
        type: "article",
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
      },
    };
  } catch (error) {
    console.error("Evidence metadata lookup failed", {
      id,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return buildFallbackMetadata(id);
  }
}
