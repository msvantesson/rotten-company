// app/leader/[slug]/page.tsx
import React from "react";
import { fetchEntityBySlug, fetchApprovedEvidence } from "@/app/lib/data";

export default async function LeaderPage({
  params,
}: {
  params: any;
}) {
  const resolvedParams = await Promise.resolve(params);
  const slug = resolvedParams?.slug as string | undefined;

  if (!slug) {
    return (
      <div style={{ padding: 24 }}>
        <h1>No leader found for slug</h1>
      </div>
    );
  }

  const leader = await fetchEntityBySlug("leader", slug);
  if (!leader) {
    return (
      <div style={{ padding: 24 }}>
        <h1>No leader found for slug: {slug}</h1>
      </div>
    );
  }

  const evidence = await fetchApprovedEvidence("leader", leader.id);

  return (
    <main style={{ padding: 24 }}>
      <header>
        <h1>{leader.name}</h1>
        <p>{leader.description}</p>
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
