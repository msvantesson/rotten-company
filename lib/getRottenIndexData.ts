import { createClient } from "@supabase/supabase-js";
import { computeEscalationScore } from "./leader-escalation";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export type RottenIndexRow = {
  id: number;
  name: string;
  slug: string;
  country: string | null;
  rotten_score: number | null;
  // company-only
  industry?: string | null;
  approved_evidence_count?: number;
  // leader-only
  tenure_id?: number | null;
  company_name?: string | null;
  company_slug?: string | null;
  started_at?: string | null;
  ended_at?: string | null;
  escalation_score?: number | null;
};

const VALID_SORT_FIELDS: Record<string, "asc" | "desc"> = {
  rotten_score: "desc",
  approved_evidence_count: "desc",
  name: "asc",
  industry: "asc",
};

export type GetRottenIndexParams = {
  type?: "company" | "leader";
  limit?: number;
  country?: string | null;
  q?: string | null;
  sort?: string | null;
  dir?: string | null;
};

export async function getRottenIndexData(
  params: GetRottenIndexParams,
): Promise<{ rows: RottenIndexRow[] } | { error: string }> {
  const supabase = getSupabase();

  const type: "company" | "leader" = params.type === "leader" ? "leader" : "company";
  const limit = Number(params.limit ?? 10);
  const country = params.country ?? null;

  try {
    if (type === "company") {
      const rawSort = params.sort ?? "rotten_score";
      const rawDir = params.dir;
      const sortField = rawSort in VALID_SORT_FIELDS ? rawSort : "rotten_score";
      const defaultDir = VALID_SORT_FIELDS[sortField];
      const ascending =
        rawDir === "asc" || rawDir === "desc"
          ? rawDir === "asc"
          : defaultDir === "asc";

      let query = supabase
        .from("global_rotten_index")
        .select("id, name, slug, country, rotten_score, industry, approved_evidence_count")
        .order(sortField, { ascending, nullsFirst: false })
        .limit(limit);

      if (country) query = query.eq("country", country);

      const q = params.q;
      if (q) {
        // Escape backslashes first so they don't double-escape what follows,
        // then escape LIKE wildcards (% _) so they match literally,
        // and strip characters (, ( )) that could inject PostgREST filter conditions.
        const safeQ = q
          .replace(/\\/g, "\\\\")
          .replace(/[%_]/g, "\\$&")
          .replace(/[(),]/g, "");
        query = query.or(
          `name.ilike.%${safeQ}%,industry.ilike.%${safeQ}%,country.ilike.%${safeQ}%`,
        );
      }

      const { data, error } = await query;

      if (error) {
        console.error("Supabase error:", error);
        return { error: error.message };
      }

      const rows: RottenIndexRow[] = (data ?? []).map((r: any) => ({
        id: r.id,
        name: r.name,
        slug: r.slug,
        country: r.country ?? null,
        rotten_score: Number(r.rotten_score),
        industry: r.industry ?? null,
        approved_evidence_count: Number(r.approved_evidence_count) || 0,
      }));

      return { rows };
    } else {
      // Leaders — fetch leaders (no legacy leader_rotten_score join; score is
      // derived from the primary company's company_rotten_score_v2 row instead).
      // We fetch up to 1000 leaders without a DB-level limit so we can sort by
      // company score in JS and then slice to `limit` (applying the DB limit
      // before scoring would yield an arbitrary subset, not the top-N by score).
      let leadersQuery = supabase
        .from("leaders")
        .select("id, name, slug, country")
        .limit(1000);

      if (country) leadersQuery = leadersQuery.eq("country", country);

      const { data: leadersData, error: leadersError } = await leadersQuery;

      if (leadersError) {
        console.error("Supabase error:", leadersError);
        return { error: leadersError.message };
      }

      const leaders = leadersData ?? [];

      if (leaders.length === 0) {
        return { rows: [] };
      }

      const leaderIds = leaders.map((l: any) => l.id);

      // Fetch all tenures for these leaders in one query (batch, no N+1)
      const { data: tenuresData } = await supabase
        .from("leader_tenures")
        .select("id, leader_id, started_at, ended_at, companies(id, name, slug)")
        .in("leader_id", leaderIds)
        .order("started_at", { ascending: true });

      const allTenures: any[] = tenuresData ?? [];

      // Group tenures by leader_id (already ordered ascending by started_at)
      const tenuresByLeader = new Map<number, any[]>();
      for (const tenure of allTenures) {
        const list = tenuresByLeader.get(tenure.leader_id) ?? [];
        list.push(tenure);
        tenuresByLeader.set(tenure.leader_id, list);
      }

      // Collect all unique company IDs referenced by any tenure
      const companyIds = new Set<number>();
      for (const tenure of allTenures) {
        const company = tenure.companies as any;
        if (company?.id != null) companyIds.add(company.id);
      }

      // Fetch all company scores in one batch query (no N+1)
      const companyScoreMap = new Map<number, number>();
      if (companyIds.size > 0) {
        const { data: scoreRows } = await supabase
          .from("company_rotten_score_v2")
          .select("company_id, rotten_score")
          .in("company_id", Array.from(companyIds));
        for (const row of scoreRows ?? []) {
          const s = Number(row.rotten_score);
          if (isFinite(s)) companyScoreMap.set(row.company_id, s);
        }
      }

      // Pick the best (primary) tenure per leader: active > past, then most recent started_at
      const primaryTenureMap = new Map<number, any>();
      for (const tenures of tenuresByLeader.values()) {
        // tenures are already sorted ascending by started_at
        let primary = tenures[0];
        for (const t of tenures) {
          const tActive = !t.ended_at;
          const pActive = !primary.ended_at;
          if (tActive && !pActive) {
            primary = t;
          } else if (!tActive && pActive) {
            // keep primary
          } else {
            // both active or both past — prefer more recent started_at
            const tTime = new Date(t.started_at).getTime();
            const pTime = new Date(primary.started_at).getTime();
            if (tTime > pTime) primary = t;
          }
        }
        primaryTenureMap.set(primary.leader_id, primary);
      }

      const rows: RottenIndexRow[] = leaders
        .map((l: any) => {
          const tenure = primaryTenureMap.get(l.id);
          const company = tenure?.companies as any;
          const companyId: number | null = company?.id ?? null;
          const rotten_score: number | null =
            companyId != null ? (companyScoreMap.get(companyId) ?? null) : null;

          // Compute escalation_score from all tenures ordered by started_at asc
          const leaderTenures = tenuresByLeader.get(l.id) ?? [];
          const orderedScores = leaderTenures.map((t: any) => {
            const cId: number | null = (t.companies as any)?.id ?? null;
            return cId != null ? (companyScoreMap.get(cId) ?? null) : null;
          });
          const escalation_score = computeEscalationScore(orderedScores);

          return {
            id: l.id,
            name: l.name,
            slug: l.slug,
            country: l.country ?? null,
            rotten_score,
            tenure_id: tenure?.id ?? null,
            company_name: company?.name ?? null,
            company_slug: company?.slug ?? null,
            started_at: tenure?.started_at ?? null,
            ended_at: tenure?.ended_at ?? null,
            escalation_score,
          };
        })
        // Sort by computed score descending, nulls last
        .sort((a, b) => {
          if (a.rotten_score == null && b.rotten_score == null) return 0;
          if (a.rotten_score == null) return 1;
          if (b.rotten_score == null) return -1;
          return b.rotten_score - a.rotten_score;
        })
        .slice(0, limit);

      return { rows };
    }
  } catch (err) {
    console.error("Error in getRottenIndexData:", err);
    return { error: "Failed to load Rotten Index" };
  }
}
