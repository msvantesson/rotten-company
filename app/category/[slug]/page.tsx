export const dynamic = "force-dynamic";
export const dynamicParams = true;
export const fetchCache = "force-no-store";

import type { Metadata } from "next";
import React from "react";
import Link from "next/link";
import { fetchEntityBySlug, fetchApprovedEvidence } from "@/app/lib/data";
import { getCategoryHelp } from "@/lib/category-help";
import { getCategoryFlavor } from "@/lib/flavor-engine";
import BackLink from "@/components/BackLink";
import { canonicalUrl, buildBreadcrumbJsonLd } from "@/lib/seo";

type Params = Promise<{ slug: string }> | { slug: string };

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const resolvedParams = (await Promise.resolve(params)) as { slug?: string };
  const slug = resolvedParams?.slug as string | undefined;

  if (!slug) {
    return { title: "Category Not Found", robots: { index: false, follow: false } };
  }

  const category = await fetchEntityBySlug("category", slug);

  if (!category) {
    return { title: "Category Not Found", robots: { index: false, follow: false } };
  }

  const flavor = getCategoryFlavor(category.id);
  const title = `${category.name} — Misconduct Category`;
  const description =
    category.description ??
    `Browse verified evidence and company misconduct records in the ${category.name} category on Rotten Company. ${flavor}`;
  const url = canonicalUrl(`/category/${category.slug}`);

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function CategoryPage({ params }: { params: Params }) {
  const resolvedParams = await Promise.resolve(params);
  const slug = resolvedParams?.slug as string | undefined;

  if (!slug) {
    return (
      <div style={{ padding: 24 }}>
        <h1>No category found for slug</h1>
      </div>
    );
  }

  // 1. Fetch category metadata
  const category = await fetchEntityBySlug("category", slug);
  if (!category) {
    return (
      <div style={{ padding: 24 }}>
        <h1>No category found for slug: {slug}</h1>
      </div>
    );
  }

  const categoryFlavor = getCategoryFlavor(category.id);
  const categoryHelp = getCategoryHelp(category.slug);

  // 2. Fetch approved evidence for this category
  const evidence = await fetchApprovedEvidence("category", category.id);

  // 3. Compute evidence stats
  const evidenceCount = evidence.length;

  // 4. JSON-LD for SEO
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "DefinedTerm",
    name: category.name,
    termCode: category.id,
    url: canonicalUrl(`/category/${category.slug}`),
    description: categoryFlavor,
    inDefinedTermSet: canonicalUrl("/categories"),

    additionalProperty: [
      {
        "@type": "PropertyValue",
        name: "evidenceCount",
        value: evidenceCount,
      },
      {
        "@type": "PropertyValue",
        name: "flavor",
        value: categoryFlavor,
      },
    ],

    hasPart:
      evidence.slice(0, 10).map((item: any) => ({
        "@type": "CreativeWork",
        name: item.title,
        url: canonicalUrl(`/evidence/${item.id}`),
      })) ?? [],
  };

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", url: canonicalUrl("/") },
    { name: "Categories", url: canonicalUrl("/categories") },
    { name: category.name, url: canonicalUrl(`/category/${category.slug}`) },
  ]);

  return (
    <>
      {/* JSON-LD injection */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd, null, 2),
        }}
      />

      {/* Breadcrumb JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd),
        }}
      />

      <main style={{ padding: 24 }}>
        {/* Back to where user came from (history), fallback to /categories */}
        <BackLink fallbackHref="/categories">← Back</BackLink>

        <header>
          <h1>{category.name}</h1>
          <p style={{ opacity: 0.8 }}>{categoryFlavor}</p>

          {categoryHelp ? (
            <div style={{ marginTop: 8 }}>
              <p style={{ marginBottom: 4 }}>{categoryHelp.definition}</p>
              <p style={{ fontSize: 14, color: "#4b5563" }}>
                <strong>Examples:</strong> {categoryHelp.examples}
              </p>
            </div>
          ) : (
            category.description && <p style={{ marginTop: 8 }}>{category.description}</p>
          )}
        </header>

        <section style={{ marginTop: 24 }}>
          <h2>Approved Evidence</h2>

          {evidence.length === 0 ? (
            <p>No approved evidence yet.</p>
          ) : (
            <ul>
              {evidence.map((item: any) => (
                <li key={item.id} style={{ marginBottom: 8 }}>
                  <Link
                    href={`/evidence/${item.id}`}
                    style={{ textDecoration: "none", fontWeight: 600 }}
                  >
                    {item.title}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}
