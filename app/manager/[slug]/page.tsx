import { fetchEntityBySlug, fetchApprovedEvidence } from "@/app/lib/data";

export default async function ManagerPage({
  params,
}: {
  params: { slug: string };
}) {
  const manager = await fetchEntityBySlug("manager", params.slug);

  if (!manager) {
    return <h1>No manager found for slug: {params.slug}</h1>;
  }

  const evidence = await fetchApprovedEvidence("manager", manager.id);

  return (
    <div>
      <h1>{manager.name}</h1>
      <p>{manager.description}</p>

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
