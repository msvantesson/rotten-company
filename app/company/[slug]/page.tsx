// src/app/company/[slug]/page.tsx
import { fetchEntityBySlug, fetchApprovedEvidence } from "@/src/lib/api";
import { badgeForScore } from "@/src/lib/scoring";

export default async function CompanyPage({ params }: { params: { slug: string } }) {
  // Fetch company by slug
  const company = await fetchEntityBySlug("company", params.slug);
  // Fetch approved evidence linked to this company
  const evidence = await fetchApprovedEvidence("company", company.id);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{company.name}</h1>
      <p>
        RottenMeter: {company.rotten_score} ({badgeForScore(company.rotten_score)})
      </p>
      <section>
        <h2 className="text-xl font-semibold">Evidence</h2>
        <ul className="space-y-2">
          {evidence.map((e: any) => (
            <li key={e.id}>
              <strong>{e.title}</strong> — {e.category} · {e.severity}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
