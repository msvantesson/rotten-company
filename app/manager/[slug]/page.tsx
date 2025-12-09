// app/manager/[slug]/page.tsx
import { fetchEntityBySlug, fetchApprovedEvidence } from "@/lib/data";

export default async function ManagerPage({ params }: { params: { slug: string } }) {
  try {
    const manager = await fetchEntityBySlug("manager", params.slug);
    if (!manager) return <div>Manager not found</div>;

    const evidence = await fetchApprovedEvidence("manager", manager.id);

    return (
      <div>
        <h1>{manager.name}</h1>
        <p>Role: {manager.role}</p>
        <p>RottenMeter: {manager.rotten_score}</p>
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
    return <div>Error loading manager: {(err as Error).message}</div>;
  }
}
