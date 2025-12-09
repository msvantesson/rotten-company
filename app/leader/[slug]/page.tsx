// app/leader/[slug]/page.tsx
import { fetchEntityBySlug, fetchApprovedEvidence } from "../../lib/api";
import { badgeForScore } from "../../lib/scoring";

export default async function LeaderPage({ params }: { params: { slug: string } }) {
  const leader = await fetchEntityBySlug("leader", params.slug);
  const evidence = await fetchApprovedEvidence("leader", leader.id);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{leader.name}</h1>
      <p>
        RottenMeter: {leader.rotten_score} ({badgeForScore(leader.rotten_score)})
      </p>
      <p>Role: {leader.role}</p>
      <section>
        <h2 className="text-xl font-semibold">Evidence</h2>
        <ul>
          {evidence.map((e: any) => (
            <li key={e.id}>
              <strong>{e.title}</strong> — {e.category} · {e.severity}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
