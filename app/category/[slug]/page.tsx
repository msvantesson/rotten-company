// app/category/[slug]/page.tsx
import React from "react";
import { fetchEntityBySlug, fetchApprovedEvidence } from "@/app/lib/data";

export default async function CategoryPage({
  params,
}: {
  params: any;
}) {
  // Resolve params in case the runtime provides a thenable/promise
  const resolvedParams = await Promise.resolve(params);
  console.log("DEBUG resolvedParams:", JSON.stringify(resolvedParams));

  const slug = resolvedParams?.slug;
  if (!slug) {
    console.error("DEBUG: resolvedParams.slug is undefined", JSON.stringify(resolvedParams));
    throw new Error("DEBUG: params.slug is undefined. params: " + JSON.stringify(resolvedParams));
  }

  const category = await fetchEntityBySlug("category", slug);
  if (!category) {
    return (
      <div style={{ padding: 24 }}>
        <h1>No category found for slug: {slug}</h1>
      </div>
    );
  }

  const evidence = await fetchApprovedEvidence("category", category.id);

  return (
    <main style={{ padding: 24 }}>
      <header>
        <h1>{category.name}</h1>
        <p>{category.description}</p>
      </header>

      <section style={{ marginTop: 24 }}>
        <h2>Approved Evidence</h2>
        {evidence.length === 0 ? (
          <p>No approved evidence yet.</p>
        ) : (
          <ul>
            {evidence.map((item: any) => (
              <li key={item.id}>{item.title}</li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
