import { fetchEntityBySlug, fetchApprovedEvidence } from "@/app/lib/data";

export default async function LeaderPage({
  params,
}: {
  params: { slug: string };
}) {
  const leader = await fetchEntityBySlug("leader", params.slug);

  if (!leader) {
    return <h1>No leader found for slug: {params.slug}</h1>;
  }

  const evidence = await fetchApprovedEvidence("leader", leader.id);

  return (
    <div>
      <h1>{leader.name}</h1>
      <p>{leader.description}</p>

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
