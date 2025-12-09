import { fetchEntityBySlug, fetchApprovedEvidence } from "@/app/lib/data";

export default async function OwnerPage({
  params,
}: {
  params: { slug: string };
}) {
  const owner = await fetchEntityBySlug("owner", params.slug);

  if (!owner) {
    return <h1>No owner/investor found for slug: {params.slug}</h1>;
  }

  const evidence = await fetchApprovedEvidence("owner", owner.id);

  return (
    <div>
      <h1>{owner.name}</h1>
      <p>{owner.description}</p>

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
