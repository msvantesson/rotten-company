import { fetchEntityBySlug, fetchApprovedEvidence } from "@/lib/data";

export default async function CompanyPage({ params }: { params: { slug: string } }) {
  try {
    const company = await fetchEntityBySlug("company", params.slug);
    if (!company) return <div>No company found for slug: {params.slug}</div>;

    const evidence = await fetchApprovedEvidence("company", company.id);

    return (
      <div>
        <h1>{company.name}</h1>
        <p>{company.description}</p>
        <h2>Approved Evidence</h2>
        {evidence.length ? (
          <ul>{evidence.map((e: any) => <li key={e.id}>{e.title}</li>)}</ul>
        ) : <p>No approved evidence yet.</p>}
      </div>
    );
  } catch (err) {
    console.error(err);
    return <div>Unexpected error occurred.</div>;
  }
}
