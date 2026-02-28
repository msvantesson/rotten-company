export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { supabaseServer } from "@/lib/supabase-server";
import { supabaseService } from "@/lib/supabase-service";
import Link from "next/link";
import LeadershipStartTenureForm from "@/components/LeadershipStartTenureForm";
import LeadershipEndTenureButton from "@/components/LeadershipEndTenureButton";

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
    });
  } catch {
    return dateStr;
  }
}

type CeoTenureRow = {
  id: number;
  leader_id: number;
  started_at: string;
  ended_at: string | null;
  role: string | null;
  leaders: { id: number; name: string; slug: string } | null;
  companies: { id: number; name: string; slug: string } | null;
};

export default async function LeadershipPage() {
  const supabase = await supabaseServer();
  const service = supabaseService();

  // Auth check
  let userId: string | null = null;
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userId = user?.id ?? null;
  } catch (e) {
    console.error("[LeadershipPage] auth error:", e);
  }

  // Check moderator status
  let isModerator = false;
  if (userId) {
    try {
      const { data: modRow } = await service
        .from("moderators")
        .select("user_id")
        .eq("user_id", userId)
        .maybeSingle();
      isModerator = !!modRow;
    } catch (e) {
      console.error("[LeadershipPage] moderator check error:", e);
    }
  }

  // Fetch CEO tenures with leader and company info
  let tenures: CeoTenureRow[] = [];
  try {
    const { data, error } = await service
      .from("leader_tenures")
      .select(
        "id, leader_id, started_at, ended_at, role, leaders(id, name, slug), companies(id, name, slug)",
      )
      .eq("role", "ceo")
      .order("started_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("[LeadershipPage] tenures fetch error:", error.message);
    } else {
      // Sort: current CEOs (no ended_at) first, then past by started_at desc
      const raw = (data ?? []) as unknown as CeoTenureRow[];
      tenures = raw.sort((a, b) => {
        const aCurrent = !a.ended_at;
        const bCurrent = !b.ended_at;
        if (aCurrent && !bCurrent) return -1;
        if (!aCurrent && bCurrent) return 1;
        return new Date(b.started_at).getTime() - new Date(a.started_at).getTime();
      });
    }
  } catch (e) {
    console.error("[LeadershipPage] unexpected tenures error:", e);
  }

  // Fetch company rotten scores for companies in the list
  const companyIds = [
    ...new Set(
      tenures
        .map((t) => (t.companies as { id: number } | null)?.id)
        .filter((id): id is number => id != null),
    ),
  ];
  const companyScoreMap: Record<number, number> = {};
  if (companyIds.length > 0) {
    try {
      const { data: scoreRows } = await service
        .from("company_rotten_score")
        .select("company_id, rotten_score")
        .in("company_id", companyIds);
      for (const row of scoreRows ?? []) {
        companyScoreMap[row.company_id] = Number(row.rotten_score);
      }
    } catch (e) {
      console.error("[LeadershipPage] company scores fetch error:", e);
    }
  }

  return (
    <main className="max-w-6xl mx-auto px-4 py-12 space-y-16">
      {/* HERO */}
      <section className="space-y-6">
        <h1 className="text-4xl font-bold">Leadership Accountability</h1>

        <p className="text-xl text-gray-700 max-w-3xl">
          CEO‑to‑worker pay ratios have risen dramatically since the 1950s. Today&apos;s CEOs earn
          hundreds of times what their median employees make — a gap that has grown far faster than
          company performance, productivity, or worker wages.
        </p>

        <p className="text-lg text-gray-600 max-w-3xl">
          This disconnect raises a fundamental question: are these leaders truly worth their obscene
          compensation, or has corporate governance simply lost touch with the people who do the
          actual work? This page tracks CEOs behind the companies — current and past — so you can
          judge for yourself.
        </p>

        <div className="flex flex-wrap items-center gap-4 pt-2">
          <Link href="/" className="text-blue-700 font-medium hover:underline">
            ← Back to companies
          </Link>
        </div>
      </section>

      {/* MODERATOR: Propose new CEO tenure */}
      {isModerator && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Moderator Controls</h2>
          <LeadershipStartTenureForm />
        </section>
      )}

      {/* CEO TABLE */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold">CEOs — Current &amp; Past</h2>

        {tenures.length === 0 ? (
          <p className="text-gray-500 text-sm">No CEO records found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b text-left text-sm text-gray-600">
                  <th className="py-2 pr-4">#</th>
                  <th className="py-2 pr-4">CEO</th>
                  <th className="py-2 pr-4">Company</th>
                  <th className="py-2 pr-4">Started</th>
                  <th className="py-2 pr-4">Ended</th>
                  <th className="py-2 pr-4 text-right">Company Score</th>
                  {isModerator && <th className="py-2 pl-4">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {tenures.map((t, index) => {
                  const leaderName = t.leaders?.name ?? "Unknown";
                  const leaderSlug = t.leaders?.slug ?? null;
                  const companyData = t.companies as { id: number; name: string; slug: string } | null;
                  const companyName = companyData?.name ?? "Unknown";
                  const companySlug = companyData?.slug ?? null;
                  const companyId = companyData?.id ?? null;
                  const companyScore =
                    companyId != null ? (companyScoreMap[companyId] ?? null) : null;
                  const isCurrent = !t.ended_at;

                  return (
                    <tr key={t.id} className="border-b hover:bg-gray-50">
                      <td className="py-2 pr-4 text-sm text-gray-500">{index + 1}</td>
                      <td className="py-2 pr-4 font-medium">
                        {leaderSlug ? (
                          <Link
                            href={`/leader/${leaderSlug}`}
                            className="text-blue-700 hover:underline"
                          >
                            {leaderName}
                          </Link>
                        ) : (
                          leaderName
                        )}
                      </td>
                      <td className="py-2 pr-4">
                        {companySlug ? (
                          <Link
                            href={`/company/${companySlug}`}
                            className="text-blue-700 hover:underline"
                          >
                            {companyName}
                          </Link>
                        ) : (
                          companyName
                        )}
                      </td>
                      <td className="py-2 pr-4 text-gray-600">{formatDate(t.started_at)}</td>
                      <td className="py-2 pr-4 text-gray-600">
                        {isCurrent ? (
                          <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                            Current
                          </span>
                        ) : (
                          formatDate(t.ended_at)
                        )}
                      </td>
                      <td className="py-2 pr-4 text-right font-mono tabular-nums">
                        {companyScore != null ? companyScore.toFixed(2) : "—"}
                      </td>
                      {isModerator && (
                        <td className="py-2 pl-4">
                          {isCurrent && (
                            <LeadershipEndTenureButton
                              tenureId={t.id}
                              leaderName={leaderName}
                            />
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
