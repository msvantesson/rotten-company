import { cache } from "react";
import { computeLeaderScoreFromEvidence } from "@/lib/computeLeaderScoreFromEvidence";
import type { CategoryId } from "@/lib/rotten-score";
import { supabaseServer } from "@/lib/supabase-server";

type LeaderRow = {
  id: number;
  name: string;
  role: string | null;
  slug: string;
  rotten_score: number | null;
  country: string | null;
  linkedin_url: string | null;
};

type TenureRow = {
  company_id: number;
  company_name: string | null;
  company_slug: string | null;
  company_size_employees_range: string | null;
  started_at: string;
  ended_at: string | null;
};

type InequalityRow = {
  pay_ratio?: number | null;
} | null;

type EvidenceRow = {
  id: number;
  title: string;
  summary: string | null;
  category: string;
  severity: number;
  severity_suggested: number | null;
  created_at: string;
  evidence_type?: string | null;
  company_id?: number | null;
};

type CategoryRow = Record<string, unknown>;

export type LeaderRouteData = {
  leader: {
    id: number;
    name: string;
    role: string | null;
    slug: string;
    company_name: string | null;
  };
  tenures: TenureRow[];
  score: {
    final_score: number;
    raw_score: number;
    direct_evidence_score: number;
    inequality_score: number;
    company_rotten_score: number;
  };
  categories: CategoryRow[];
  inequality: InequalityRow;
  evidence: EvidenceRow[];
};

function isWithinAnyTenure(createdAt: string, tenures: TenureRow[]) {
  const timestamp = new Date(createdAt).getTime();

  for (const tenure of tenures) {
    const start = new Date(tenure.started_at).getTime();
    const end = tenure.ended_at ? new Date(tenure.ended_at).getTime() : Date.now();
    if (timestamp >= start && timestamp <= end) {
      return true;
    }
  }

  return false;
}

export const getLeaderRouteData = cache(
  async (requestedSlug: string): Promise<LeaderRouteData | null> => {
    const supabase = await supabaseServer();

    const { data: leader, error: leaderError } = await supabase
      .from("leaders")
      .select(`
        id,
        name,
        role,
        slug,
        rotten_score,
        country,
        linkedin_url
      `)
      .eq("slug", requestedSlug)
      .maybeSingle();

    if (leaderError) {
      throw leaderError;
    }

    if (!leader) {
      return null;
    }

    const typedLeader = leader as LeaderRow;

    const { data: tenuresRaw, error: tenuresError } = await supabase
      .from("leader_tenures")
      .select(`
        company_id,
        started_at,
        ended_at,
        companies (
          name,
          slug,
          size_employees_range
        )
      `)
      .eq("leader_id", typedLeader.id)
      .order("started_at", { ascending: true });

    if (tenuresError) {
      console.error("Leader tenures error:", tenuresError);
    }

    const tenures: TenureRow[] = (tenuresRaw ?? []).map((tenure: any) => ({
      company_id: tenure.company_id,
      company_name: tenure.companies?.name ?? null,
      company_slug: tenure.companies?.slug ?? null,
      company_size_employees_range:
        tenure.companies?.size_employees_range ?? null,
      started_at: tenure.started_at,
      ended_at: tenure.ended_at,
    }));

    const activeTenure =
      tenures.find((tenure) => !tenure.ended_at) ??
      tenures[tenures.length - 1] ??
      null;
    const company_name = activeTenure?.company_name ?? null;

    const { data: inequality, error: inequalityError } = await supabase
      .from("leader_inequality")
      .select("*")
      .eq("leader_id", typedLeader.id)
      .maybeSingle();

    if (
      inequalityError &&
      typeof inequalityError === "object" &&
      inequalityError !== null &&
      "code" in inequalityError &&
      inequalityError.code !== "PGRST205"
    ) {
      console.error("Leader inequality error:", inequalityError);
    }

    const { data: evidenceRaw, error: evidenceError } = await supabase
      .from("evidence")
      .select("*")
      .eq("leader_id", typedLeader.id)
      .eq("status", "approved")
      .order("created_at", { ascending: false });

    if (evidenceError) {
      console.error("Leader evidence error:", evidenceError);
    }

    const typedEvidenceRaw = (evidenceRaw ?? []) as EvidenceRow[];
    const evidence =
      tenures.length === 0
        ? typedEvidenceRaw
        : typedEvidenceRaw.filter((item) => {
            if (item.evidence_type === "seed") {
              return true;
            }

            return isWithinAnyTenure(item.created_at, tenures);
          });

    const sizeEmployeesRange = activeTenure?.company_size_employees_range ?? null;

    const computedScore = computeLeaderScoreFromEvidence({
      evidence: evidence.map((item) => ({
        category: item.category as CategoryId,
        severity: item.severity_suggested ?? item.severity ?? 0,
      })),
      companyContext: {
        ownershipType: "public_company",
        sizeEmployeesRange,
        countryRegion: "western",
      },
    });

    const { data: categories, error: categoriesError } = await supabase
      .from("leader_category_breakdown")
      .select("*")
      .eq("leader_id", typedLeader.id);

    if (
      categoriesError &&
      typeof categoriesError === "object" &&
      categoriesError !== null &&
      "code" in categoriesError &&
      categoriesError.code !== "PGRST205"
    ) {
      console.error("Leader category breakdown error:", categoriesError);
    }

    return {
      leader: {
        id: typedLeader.id,
        name: typedLeader.name,
        role: typedLeader.role,
        slug: typedLeader.slug,
        company_name,
      },
      tenures,
      score: {
        final_score: computedScore.finalScore ?? 0,
        raw_score: computedScore.baseCategoryScore ?? 0,
        direct_evidence_score: computedScore.baseCategoryScore ?? 0,
        inequality_score: typeof inequality?.pay_ratio === "number"
          ? inequality.pay_ratio
          : 0,
        company_rotten_score: 0,
      },
      categories: (categories ?? []) as CategoryRow[],
      inequality: (inequality as InequalityRow) ?? null,
      evidence,
    };
  },
);
