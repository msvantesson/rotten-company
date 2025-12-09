import { fetchEntityBySlug, fetchApprovedEvidence } from "@/app/lib/data";

export default async function CompanyPage({
  params,
}: {
  params: { slug: string };
}) {
  const company = await fetchEntityBySlug("company", params.slug);

  if (!company) {
    return <h1>No company found for slug: {params.slug}</h1>;
  }

  const evidence = await fetchApprovedEvidence("company", company.id);

  return (
    <div>
      <h1>{company.name}</h1>
      <p>{company.description}</p>

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
}
