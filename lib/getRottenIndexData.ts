import { createClient } from "@supabase/supabase-js";

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
      // Leaders — join with leader_rotten_score (left join via PostgREST) to get
      // computed final_score. Leaders without a score record are included with null.
      let leadersQuery = supabase
        .from("leaders")
        .select("id, name, slug, country, leader_rotten_score(final_score)")
        .limit(limit);

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
      const { data: tenuresData } = await supabase
        .from("leader_tenures")
        .select("id, leader_id, started_at, ended_at, companies(id, name, slug)")
        .in("leader_id", leaderIds);

      // Pick the best tenure per leader: active > past, then most recent started_at
      const tenureMap = new Map<number, any>();
      for (const tenure of tenuresData ?? []) {
        const existing = tenureMap.get(tenure.leader_id);
        if (!existing) {
          tenureMap.set(tenure.leader_id, tenure);
          continue;
        }
        const tActive = !tenure.ended_at;
        const eActive = !existing.ended_at;
        if (tActive && !eActive) {
          tenureMap.set(tenure.leader_id, tenure);
          continue;
        }
        if (!tActive && eActive) continue;
        const tTime = new Date(tenure.started_at).getTime();
        const eTime = new Date(existing.started_at).getTime();
        if (tTime > eTime) tenureMap.set(tenure.leader_id, tenure);
      }

      const rows: RottenIndexRow[] = leaders
        .map((l: any) => {
          const tenure = tenureMap.get(l.id);
          const company = tenure?.companies as any;
          const scoreRaw = l.leader_rotten_score?.final_score;
          const scoreNum = scoreRaw != null ? Number(scoreRaw) : NaN;
          const rotten_score: number | null =
            isFinite(scoreNum) ? scoreNum : null;
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
          };
        })
        // Sort by computed score descending, nulls last
        .sort((a, b) => {
          if (a.rotten_score == null && b.rotten_score == null) return 0;
          if (a.rotten_score == null) return 1;
          if (b.rotten_score == null) return -1;
          return b.rotten_score - a.rotten_score;
        });

      return { rows };
    }
  } catch (err) {
    console.error("Error in getRottenIndexData:", err);
    return { error: "Failed to load Rotten Index" };
  }
}
