// app/manager/[slug]/page.tsx
import React from "react";
import { fetchEntityBySlug, fetchApprovedEvidence } from "@/app/lib/data";

export default async function ManagerPage({
  params,
}: {
  params: any;
}) {
  const resolvedParams = await Promise.resolve(params);
  const slug = resolvedParams?.slug as string | undefined;

  if (!slug) {
    return (
      <div style={{ padding: 24 }}>
        <h1>No manager found for slug</h1>
      </div>
    );
  }

  const manager = await fetchEntityBySlug("manager", slug);
  if (!manager) {
    return (
      <div style={{ padding: 24 }}>
        <h1>No manager found for slug: {slug}</h1>
      </div>
    );
  }

  const evidence = await fetchApprovedEvidence("manager", manager.id);

  return (
    <main style={{ padding: 24 }}>
      <header>
        <h1>{manager.name}</h1>
        <p>{manager.description}</p>
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
