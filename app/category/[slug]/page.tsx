export const dynamic = "force-dynamic";
export const dynamicParams = true;
export const fetchCache = "force-no-store";

import React from "react";
import { fetchEntityBySlug, fetchApprovedEvidence } from "@/app/lib/data";

import type { Evidence } from "@/lib/types";

// --- Category flavor taxonomy ---
const CATEGORY_FLAVORS: Record<number, string> = {
  1: "Rotten to the core",
  2: "Smells like spin",
  3: "Boardroom smoke and mirrors",
  4: "Toxic workplace vibes",
  5: "Ethics on life support",
  6: "Greenwashing deluxe",
  13: "Customer trust? Never heard of it",
};

function getCategoryFlavor(categoryId: number): string {
  return CATEGORY_FLAVORS[categoryId] ?? "No flavor assigned";
}

export default async function CategoryPage({ params }: { params: Promise<{ slug?: string }> | { slug?: string } }) {
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
    url: `https://rotten-company.com/category/${category.slug}`,
    description: categoryFlavor,
    inDefinedTermSet: "https://rotten-company.com/categories",

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
      evidence.slice(0, 10).map((item: Evidence) => ({
        "@type": "CreativeWork",
        name: item.title,
        url: `https://rotten-company.com/evidence/${item.id}`,
      })) ?? [],
  };

  return (
    <>
      {/* JSON-LD injection */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd, null, 2),
        }}
      />

      <main style={{ padding: 24 }}>
        <header>
          <h1>{category.name}</h1>
          <p style={{ opacity: 0.8 }}>{categoryFlavor}</p>
          {category.description && (
            <p style={{ marginTop: 8 }}>{category.description}</p>
          )}
        </header>

        <section style={{ marginTop: 24 }}>
          <h2>Approved Evidence</h2>

          {evidence.length === 0 ? (
            <p>No approved evidence yet.</p>
          ) : (
            <ul>
              {evidence.map((item: Evidence) => (
                <li key={item.id} style={{ marginBottom: 8 }}>
                  <a
                    href={`/evidence/${item.id}`}
                    style={{ textDecoration: "none", fontWeight: 600 }}
                  >
                    {item.title}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}
