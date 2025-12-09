// app/company/[slug]/page.tsx
import { fetchEntityBySlug, fetchApprovedEvidence } from "@/lib/data";

export default async function CompanyPage({ params }: { params: { slug: string } }) {
  try {
    const company = await fetchEntityBySlug("company", params.slug);
    if (!company) return <div>Company not found</div>;

    const evidence = await fetchApprovedEvidence("company", company.id);

    return (
      <div>
        <h1>{company.name}</h1>
        <p>RottenMeter: {company.rotten_score}</p>
        <h2>Evidence</h2>
        {evidence.length === 0 ? (
          <p>No approved evidence yet.</p>
        ) : (
          <ul>
            {evidence.map((e: any) => (
              <li key={e.id}>
                <strong>{e.title}</strong> — {e.summary} · {e.severity}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  } catch (err) {
    return <div>Error loading company: {(err as Error).message}</div>;
  }
}
