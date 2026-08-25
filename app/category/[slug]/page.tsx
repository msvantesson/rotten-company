export const dynamic = "force-dynamic";
export const dynamicParams = true;
export const fetchCache = "force-no-store";

import type { Metadata } from "next";
import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  fetchApprovedEvidence,
  supabase,
} from "@/app/lib/data";
import { getCategoryHelp } from "@/lib/category-help";
import { getCategoryFlavor } from "@/lib/flavor-engine";
import BackLink from "@/components/BackLink";
import { canonicalUrl, buildBreadcrumbJsonLd } from "@/lib/seo";

type Params = Promise<{ slug: string }> | { slug: string };
type CategoryEvidenceItem = {
  id: number;
  title: string;
  entity_type?: string | null;
  entity_id?: number | null;
};

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

  const { data: category, error } = await supabase
    .from("categories")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    console.error(`Error fetching category metadata for slug ${slug}:`, error);
    return { title: "Category Not Found", robots: { index: false, follow: false } };
  }

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
    notFound();
  }

  // 1. Fetch category metadata — distinguish DB error from missing record
  const { data: category, error: categoryError } = await supabase
    .from("categories")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (categoryError) {
    console.error(`Error fetching category with slug ${slug}:`, categoryError);
    throw categoryError;
  }

  if (!category) {
    notFound();
  }

  const categoryFlavor = getCategoryFlavor(category.id);
  const categoryHelp = getCategoryHelp(category.slug);

  // 2. Fetch approved evidence for this category
  const evidence = (await fetchApprovedEvidence(
    "category",
    category.id
  )) as CategoryEvidenceItem[];

  const companyIds = Array.from(
    new Set(
      evidence
        .filter(
          (item) =>
            item.entity_type === "company" &&
            Number.isInteger(item.entity_id) &&
            Number(item.entity_id) > 0
        )
        .map((item) => Number(item.entity_id))
    )
  );

  const companySlugById = new Map<number, string>();
  if (companyIds.length > 0) {
    const { data: companies } = await supabase
      .from("companies")
      .select("id, slug")
      .in("id", companyIds);
    for (const company of companies ?? []) {
      if (company?.id && company?.slug) {
        companySlugById.set(company.id, company.slug);
      }
    }
  }

  const evidenceUrlById = new Map<number, string>();
  for (const item of evidence) {
    const companyId = Number(item.entity_id);
    const slug =
      item.entity_type === "company" && Number.isInteger(companyId)
        ? companySlugById.get(companyId)
        : undefined;
    if (!slug) continue;
    evidenceUrlById.set(
      item.id,
      canonicalUrl(`/company/${slug}/evidence#evidence-${item.id}`)
    );
  }

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
      evidence.slice(0, 10).map((item: CategoryEvidenceItem) => ({
        "@type": "CreativeWork",
        name: item.title,
        ...(evidenceUrlById.get(item.id)
          ? { url: evidenceUrlById.get(item.id) }
          : {}),
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
              {evidence.map((item: CategoryEvidenceItem) => (
                <li key={item.id} style={{ marginBottom: 8 }}>
                  {evidenceUrlById.get(item.id) ? (
                    <Link
                      href={evidenceUrlById.get(item.id)!}
                      style={{ textDecoration: "none", fontWeight: 600 }}
                    >
                      {item.title}
                    </Link>
                  ) : (
                    <span style={{ fontWeight: 600 }}>{item.title}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}
