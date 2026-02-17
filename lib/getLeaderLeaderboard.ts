import { supabaseServer } from "@/lib/supabase-server";
import { getLeaderData } from "@/lib/getLeaderData";

export type LeaderNormalizationMode = "none" | "per_evidence" | "per_year";

type LeaderLeaderboardInput = {
  selectedCountry: string | null;
  limit: number;
  normalization?: LeaderNormalizationMode;
};

type LeaderLeaderboardRow = {
  rank: number;
  leaderId: number;
  name: string;
  slug: string;
  companyName: string | null;
  country: string | null;
  rawScore: number;
  finalScore: number;
  normalizedScore: number;
  evidenceCount: number;
};

type LeaderLeaderboardResult = {
  rows: LeaderLeaderboardRow[];
  jsonld: any;
  debug: {
    type: "leader";
    selectedCountry: string | null;
    limit: number;
    normalization: LeaderNormalizationMode;
  };
};

export async function getLeaderLeaderboard(
  input: LeaderLeaderboardInput
): Promise<LeaderLeaderboardResult> {
  const { selectedCountry, limit, normalization = "none" } = input;

  const supabase = await supabaseServer();

  // 1) Fetch leaders (without company join - we'll derive primary company from tenures)
  const { data: leadersRaw, error: leadersError } = await supabase
    .from("leaders")
    .select(
      `
      id,
      name,
      slug
    `
    )
    .limit(1000); // safety cap

  if (leadersError || !leadersRaw || leadersRaw.length === 0) {
    console.error("Leader leaderboard: leaders fetch error", leadersError);
    return {
      rows: [],
      jsonld: buildEmptyJsonLd(selectedCountry, limit, normalization),
      debug: {
        type: "leader",
        selectedCountry,
        limit,
        normalization,
      },
    };
  }

  // 2) For each leader, call getLeaderData(slug) to get tenure-aware score + evidence
  // We'll apply country filter after getting data since we derive company from tenures
  const leaderDetails = await Promise.all(
    leadersRaw.map(async (l: any) => {
      const slug = l.slug as string;
      const data = await getLeaderData(slug);

      if (!data) return null;

      // Get primary company info from the data (derived from tenures)
      const primaryCompanyId = data.leader.company_id;
      
      // We need to fetch the company's country if filtering by country
      let country: string | null = null;
      if (selectedCountry && primaryCompanyId) {
        const { data: companyData } = await supabase
          .from("companies")
          .select("country")
          .eq("id", primaryCompanyId)
          .maybeSingle();
        country = companyData?.country ?? null;
      }

      // Apply country filter
      if (selectedCountry) {
        if (!country || country !== selectedCountry) {
          return null;
        }
      }

      const rawScore = data.score?.raw_score ?? 0;
      const finalScore = data.score?.final_score ?? 0;
      const evidenceCount = (data.evidence ?? []).length;

      // tenure span in years (for per_year normalization)
      const tenures = data.tenures ?? [];
      let tenureYears = 0;
      if (tenures.length > 0) {
        const startMs = Math.min(
          ...tenures.map((t: any) => new Date(t.started_at).getTime())
        );
        const endMs = Math.max(
          ...tenures.map((t: any) =>
            t.ended_at ? new Date(t.ended_at).getTime() : Date.now()
          )
        );
        const diffYears = (endMs - startMs) / (1000 * 60 * 60 * 24 * 365.25);
        tenureYears = diffYears > 0 ? diffYears : 0;
      }

      let normalizedScore = finalScore;

      if (normalization === "per_evidence") {
        normalizedScore =
          evidenceCount > 0 ? finalScore / evidenceCount : 0;
      } else if (normalization === "per_year") {
        normalizedScore = tenureYears > 0 ? finalScore / tenureYears : 0;
      }

      return {
        leaderId: data.leader.id,
        name: data.leader.name,
        slug: data.leader.slug,
        companyName: data.leader.company_name,
        country,
        rawScore,
        finalScore,
        normalizedScore,
        evidenceCount,
      };
    })
  );

  const validLeaders = leaderDetails.filter(
    (x): x is NonNullable<typeof x> => x !== null
  );

  if (validLeaders.length === 0) {
    return {
      rows: [],
      jsonld: buildEmptyJsonLd(selectedCountry, limit, normalization),
      debug: {
        type: "leader",
        selectedCountry,
        limit,
        normalization,
      },
    };
  }

  // 4) Sort by normalizedScore (or finalScore if you ever want to switch)
  validLeaders.sort((a, b) => b.normalizedScore - a.normalizedScore);

  // 5) Slice to requested limit
  const top = validLeaders.slice(0, limit);

  // 6) Build rows with rank
  const rows: LeaderLeaderboardRow[] = top.map((l, idx) => ({
    rank: idx + 1,
    leaderId: l.leaderId,
    name: l.name,
    slug: l.slug,
    companyName: l.companyName,
    country: l.country,
    rawScore: l.rawScore,
    finalScore: l.finalScore,
    normalizedScore: l.normalizedScore,
    evidenceCount: l.evidenceCount,
  }));

  // 7) Build JSON-LD ItemList (Person items)
  const jsonld = buildLeaderJsonLdList(rows);

  return {
    rows,
    jsonld,
    debug: {
      type: "leader",
      selectedCountry,
      limit,
      normalization,
    },
  };
}

/* ---------------- JSON-LD helpers ---------------- */

function buildEmptyJsonLd(
  selectedCountry: string | null,
  limit: number,
  normalization: LeaderNormalizationMode
) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "Global Rotten Index – Leaders",
    "itemListOrder": "Descending",
    "numberOfItems": 0,
    "itemListElement": [],
    "meta": {
      type: "leader",
      selectedCountry,
      limit,
      normalization,
    },
  };
}

function buildLeaderJsonLdList(rows: LeaderLeaderboardRow[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "Global Rotten Index – Leaders",
    "itemListOrder": "Descending",
    "numberOfItems": rows.length,
    "itemListElement": rows.map((row) => ({
      "@type": "ListItem",
      "position": row.rank,
      "url": `https://rotten-company.com/leader/${row.slug}`,
      "item": {
        "@type": "Person",
        "name": row.name,
        "worksFor": row.companyName ?? undefined,
      },
    })),
  };
}
