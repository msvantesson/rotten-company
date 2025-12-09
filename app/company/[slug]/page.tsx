// app/company/[slug]/page.tsx
import React from "react";
import { fetchEntityBySlug, fetchApprovedEvidence } from "@/app/lib/data";

export default async function CompanyPage({
  params,
}: {
  params: any;
}) {
  const resolvedParams = await Promise.resolve(params);
  const slug = resolvedParams?.slug as string | undefined;

  if (!slug) {
    return (
      <div style={{ padding: 24 }}>
        <h1>No company found for slug</h1>
      </div>
    );
  }

  const company = await fetchEntityBySlug("company", slug);
  if (!company) {
    return (
      <div style={{ padding: 24 }}>
        <h1>No company found for slug: {slug}</h1>
      </div>
    );
  }

  const evidence = await fetchApprovedEvidence("company", company.id);

  return (
    <main style={{ padding: 24 }}>
      <header>
        <h1>{company.name}</h1>
        <p>{company.description}</p>
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
