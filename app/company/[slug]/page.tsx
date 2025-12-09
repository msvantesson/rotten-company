// app/company/[slug]/page.tsx
import { fetchEntityBySlug, fetchApprovedEvidence } from "@/lib/data";

export default async function CompanyPage({
  params,
}: {
  params: { slug: string };
}) {
  try {
    if (!params.slug) {
      throw new Error("Slug param is missing");
    }

    // Fetch company by slug
    const company = await fetchEntityBySlug("company", params.slug);

    if (!company) {
      return <div>No company found for slug: {params.slug}</div>;
    }

    // Fetch approved evidence linked to this company
    const evidence = await fetchApprovedEvidence("company", company.id);

    return (
      <div>
        <h1>{company.name}</h1>
        <p>Slug: {company.slug}</p>
        <p>Description: {company.description}</p>

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
      </div>
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return <div>Unexpected error occurred.</div>;
  }
}
