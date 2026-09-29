export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export { generateMetadata } from "./metadata";

import Link from "next/link";
import { buildBreadcrumbJsonLd, canonicalUrl } from "@/lib/seo";
import { getEvidencePageData } from "./detail-data";

type Params = Promise<{ id: string }> | { id: string };

function parseEvidenceId(value: string | undefined): number | null {
  if (!value || !/^\d+$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export default async function EvidencePage({ params }: { params: Params }) {
  const resolved = await params;
  const id = parseEvidenceId(resolved?.id);
  let data = null;

  if (id !== null) {
    try {
      data = await getEvidencePageData(id);
    } catch (error) {
      console.error("Evidence page lookup failed", {
        id,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  if (!data) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-3xl font-semibold">Evidence unavailable</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          This evidence record is not publicly available.
        </p>
      </main>
    );
  }

  const companyUrl = `/company/${encodeURIComponent(data.company.slug)}`;
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", url: canonicalUrl("/") },
    { name: data.company.name, url: canonicalUrl(companyUrl) },
    { name: "Evidence", url: canonicalUrl(`${companyUrl}/evidence`) },
    {
      name: data.evidence.title,
      url: canonicalUrl(`/evidence/${data.evidence.id}`),
    },
  ]);

  return (
    <main className="mx-auto max-w-3xl space-y-5 px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbJsonLd) }}
      />
      <nav aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <li>
            <Link className="hover:underline" href="/">Home</Link>
          </li>
          <li aria-hidden="true">&gt;</li>
          <li>
            <Link className="hover:underline" href={companyUrl}>
              {data.company.name}
            </Link>
          </li>
          <li aria-hidden="true">&gt;</li>
          <li>
            <Link className="hover:underline" href={`${companyUrl}/evidence`}>
              Evidence
            </Link>
          </li>
          <li aria-hidden="true">&gt;</li>
          <li aria-current="page">{data.evidence.title}</li>
        </ol>
      </nav>
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">{data.evidence.title}</h1>
        <p className="text-sm text-muted-foreground">
          Company:{" "}
          <Link className="text-accent hover:underline" href={companyUrl}>
            {data.company.name}
          </Link>
        </p>
      </header>
      {data.evidence.summary && (
        <section className="rounded-md border border-border bg-surface-2 p-4">
          <h2 className="mb-1 font-medium">Summary</h2>
          <p className="whitespace-pre-wrap text-sm text-foreground">
            {data.evidence.summary}
          </p>
        </section>
      )}
    </main>
  );
}
