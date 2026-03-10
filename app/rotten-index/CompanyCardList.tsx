import Link from "next/link";

type CompanyRow = {
  id: number;
  name: string;
  slug: string;
  country?: string | null;
  rotten_score: number | null;
  industry?: string | null;
  approved_evidence_count?: number;
};

export default function CompanyCardList({ rows }: { rows: CompanyRow[] }) {
  return (
    <ul className="space-y-3">
      {rows.map((r, i) => (
        <li key={r.id}>
          <Link
            href={`/company/${r.slug}`}
            className="flex items-center justify-between gap-4 rounded-lg border border-border bg-surface p-4 hover:bg-muted transition-colors"
          >
            <div className="flex items-start gap-3 min-w-0">
              <span className="mt-0.5 text-xs font-medium text-muted-foreground w-6 shrink-0 text-right">
                {i + 1}
              </span>
              <div className="min-w-0">
                <p className="font-semibold text-foreground truncate">{r.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {[r.country, r.industry].filter(Boolean).join(" · ") || "—"}
                </p>
              </div>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-lg font-mono font-bold tabular-nums text-foreground leading-none">
                {r.rotten_score != null ? r.rotten_score.toFixed(2) : "—"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {r.approved_evidence_count ?? 0}{" "}
                {(r.approved_evidence_count ?? 0) === 1 ? "piece" : "pieces"}
              </p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
