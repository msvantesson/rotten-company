// app/manager/[slug]/page.tsx
import { fetchEntityBySlug, fetchApprovedEvidence } from "../../lib/api";
import { badgeForScore } from "../../lib/scoring";

export default async function ManagerPage({ params }: { params: { slug: string } }) {
  const manager = await fetchEntityBySlug("manager", params.slug);
  const evidence = await fetchApprovedEvidence("manager", manager.id);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{manager.name}</h1>
      <p>
        RottenMeter: {manager.rotten_score} ({badgeForScore(manager.rotten_score)})
      </p>
      <p>Role: {manager.role}</p>
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
