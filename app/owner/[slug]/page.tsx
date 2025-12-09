// app/owner/[slug]/page.tsx
import { fetchEntityBySlug, fetchApprovedEvidence } from "@/lib/data";

export default async function OwnerPage({ params }: { params: { slug: string } }) {
  try {
    const owner = await fetchEntityBySlug("owner", params.slug);
    if (!owner) return <div>Owner/Investor not found</div>;

    const evidence = await fetchApprovedEvidence("owner", owner.id);

    return (
      <div>
        <h1>{owner.name}</h1>
        <p>Type: {owner.type}</p>
        <p>RottenMeter: {owner.rotten_score}</p>
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
    return <div>Error loading owner/investor: {(err as Error).message}</div>;
  }
}
