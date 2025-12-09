// app/leader/[slug]/page.tsx
import { fetchEntityBySlug, fetchApprovedEvidence } from "@/lib/data";

export default async function LeaderPage({ params }: { params: { slug: string } }) {
  try {
    const leader = await fetchEntityBySlug("leader", params.slug);
    if (!leader) return <div>Leader not found</div>;

    const evidence = await fetchApprovedEvidence("leader", leader.id);

    return (
      <div>
        <h1>{leader.name}</h1>
        <p>Role: {leader.role}</p>
        <p>RottenMeter: {leader.rotten_score}</p>
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
    return <div>Error loading leader: {(err as Error).message}</div>;
  }
}
