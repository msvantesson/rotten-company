export const dynamic = "force-dynamic";
export const dynamicParams = true;
export const fetchCache = "force-no-store";

import { supabaseServer } from "@/lib/supabase-server";
import EvidenceList from "@/components/EvidenceList";
import RatingStars from "@/components/RatingStars";
import RottenScoreMeter from "@/components/RottenScoreMeter";
import { CategoryBreakdown } from "@/components/CategoryBreakdown";
import { ScoreDebugPanel } from "@/components/ScoreDebugPanel";
import { buildCompanyJsonLd } from "@/lib/jsonld-company";
import { getEvidenceWithManagers } from "@/lib/getEvidenceWithManagers";
import { JsonLdDebugPanel } from "@/components/JsonLdDebugPanel";

type EvidenceItem = {
  id: number;
  title: string;
  summary?: string | null;
  file_url?: string | null;
  [key: string]: unknown;
};

type CategoryBreakdownItem = {
  category_id: number;
  category_name: string;
  rating_count?: number | null;
  avg_rating_score?: number | null;
  evidence_count?: number | null;
  evidence_score?: number | null;
  final_score?: number | null;
};

type OwnershipSignal = {
  company_id: number;
  [key: string]: unknown;
};

type DestructionLever = {
  company_id: number;
  [key: string]: unknown;
};

// --- Category icons ---
const CATEGORY_ICON_MAP: Record<number, string> = {
  1: "💼",
  2: "📰",
  3: "🎭",
  4: "🧪",
  5: "🚨",
  6: "🌱",
  13: "💸",
};

function getCategoryIcon(categoryId: number): string {
  return CATEGORY_ICON_MAP[categoryId] ?? "⚠️";
}

type Params = Promise<{ slug: string }> | { slug: string };

export default async function CompanyPage({ params }: { params: Params }) {
  const resolvedParams = (await params) as { slug?: string } | undefined;
  const rawSlug = resolvedParams?.slug ? decodeURIComponent(resolvedParams.slug) : "";

  const supabase = await supabaseServer();

  // 1) Core company fetch — this is the only hard requirement
  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("id, name, slug, industry, size_employees, rotten_score")
    .eq("slug", rawSlug)
    .maybeSingle();

  if (companyError) {
    console.error("Error loading company:", rawSlug, companyError);
  }

  if (!company) {
    // If this happens for rotten-widgets-gmbh, something is wrong in the DB,
    // but we should at least see the slug.
    return (
      <div style={{ padding: "2rem" }}>
        <h1>No company found</h1>
        <p>
          <strong>Slug</strong>: {rawSlug || "null"}
        </p>
      </div>
    );
  }

  // 2) Everything below is "best-effort" and must never crash the page

  // Evidence (wrapped in try/catch in case helper throws)
  let evidence: EvidenceItem[] = [];
  try {
    evidence = (await getEvidenceWithManagers(company.id)) ?? [];
  } catch (e) {
    console.error("Error loading evidence for company:", company.id, e);
    evidence = [];
  }

  // Category breakdown
  let breakdownWithFlavor: CategoryBreakdownItem[] = [];
  try {
    const { data: mergedBreakdown, error: breakdownError } = await supabase
      .from("company_category_full_breakdown")
      .select(
        "category_id, category_name, rating_count, avg_rating_score, evidence_count, evidence_score, final_score"
      )
      .eq("company_id", company.id);

    if (breakdownError) {
      console.error(
        "Error loading company_category_full_breakdown for company:",
        company.id,
        breakdownError
      );
    }

    breakdownWithFlavor = mergedBreakdown ?? [];
  } catch (e) {
    console.error("Unexpected error building breakdown for company:", company.id, e);
    breakdownWithFlavor = [];
  }

  // Live Rotten Score
  let liveRottenScore: number | null = null;
  try {
    const { data: scoreRow, error: scoreError } = await supabase
      .from("company_rotten_score")
      .select("rotten_score")
      .eq("company_id", company.id)
      .maybeSingle();

    if (scoreError) {
      console.error("Error loading company_rotten_score for company:", company.id, scoreError);
    }

    liveRottenScore = scoreRow?.rotten_score ?? null;
  } catch (e) {
    console.error("Unexpected error loading Rotten Score for company:", company.id, e);
    liveRottenScore = null;
  }

  // Categories
  let categories: { id: number; slug: string; name: string }[] = [];
  try {
    const { data: categoriesData, error: categoriesError } = await supabase
      .from("categories")
      .select("id, slug, name")
      .order("id", { ascending: true });

    if (categoriesError) {
      console.error("Error loading categories:", categoriesError);
    }

    categories = categoriesData ?? [];
  } catch (e) {
    console.error("Unexpected error loading categories:", e);
    categories = [];
  }

  // Auth user
  let user: { id: string } | null = null;
  try {
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      console.error("Error loading auth user:", authError);
    }

    user = authUser ?? null;
  } catch (e) {
    console.error("Unexpected error loading auth user:", e);
    user = null;
  }

  // User ratings
  let userRatings: Record<number, number> = {};
  if (user) {
    try {
      const { data: ratings, error: ratingsError } = await supabase
        .from("ratings")
        .select("category, score")
        .eq("company_id", company.id)
        .eq("user_id", user.id);

      if (ratingsError) {
        console.error("Error loading user ratings:", ratingsError);
      }

      if (ratings) {
        for (const r of ratings) {
          userRatings[r.category] = r.score;
        }
      }
    } catch (e) {
      console.error("Unexpected error loading user ratings:", e);
      userRatings = {};
    }
  }

  // Ownership signals
  let ownershipSignals: OwnershipSignal[] = [];
  try {
    const { data: ownershipSignalsData, error: ownershipError } = await supabase
      .from("ownership_signals_summary")
      .select("*")
      .eq("company_id", company.id);

    if (ownershipError) {
      console.error("Error loading ownership_signals_summary for company:", company.id, ownershipError);
    }

    ownershipSignals = ownershipSignalsData ?? [];
  } catch (e) {
    console.error("Unexpected error loading ownership_signals_summary:", e);
    ownershipSignals = [];
  }

  // Destruction lever
  let destructionLever: DestructionLever | null = null;
  try {
    const { data: destructionLeverData, error: destructionError } = await supabase
      .from("company_destruction_lever")
      .select("*")
      .eq("company_id", company.id)
      .maybeSingle();

    if (destructionError) {
      console.error("Error loading company_destruction_lever for company:", company.id, destructionError);
    }

    destructionLever = destructionLeverData ?? null;
  } catch (e) {
    console.error("Unexpected error loading company_destruction_lever:", e);
    destructionLever = null;
  }

  // JSON-LD: also must never crash the page
  let jsonLd: unknown = null;
  try {
    jsonLd = buildCompanyJsonLd({
      company,
      rottenScore: liveRottenScore,
      breakdown: breakdownWithFlavor,
      ownershipSignals,
      destructionLever,
    });
  } catch (e) {
    console.error("Error building company JSON-LD for company:", company.id, e);
    jsonLd = null;
  }

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd, null, 2),
          }}
        />
      )}

      <JsonLdDebugPanel data={jsonLd ?? { error: "JSON-LD generation failed" }} />

      <div style={{ padding: "2rem" }}>
        <h1>{company.name}</h1>

        <p>
          <strong>Industry:</strong> {company.industry ?? "Unknown"}
        </p>
        <p>
          <strong>Employees:</strong> {company.size_employees ?? "Unknown"}
        </p>

        <div style={{ marginTop: "1.5rem", marginBottom: "2rem" }}>
          <RottenScoreMeter score={liveRottenScore ?? 0} />
        </div>

        <h2 style={{ marginTop: "2rem" }}>Rate this company</h2>
        {categories && categories.length > 0 ? (
          <div style={{ marginBottom: "2rem" }}>
            {categories.map((cat) => (
              <div
                key={cat.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "8px 0",
                  borderBottom: "1px solid #eee",
                }}
              >
                <span>
                  {getCategoryIcon(cat.id)} {cat.name}
                </span>
                <RatingStars
                  companySlug={company.slug}
                  categorySlug={cat.slug}
                  initialScore={userRatings[cat.id] ?? null}
                />
              </div>
            ))}
          </div>
        ) : (
          <p>No categories configured yet.</p>
        )}

        <h2 style={{ marginTop: "2rem" }}>Rotten Score Breakdown</h2>

        <div style={{ marginBottom: "2rem" }}>
          <CategoryBreakdown breakdown={breakdownWithFlavor} />
        </div>

        <h2>Approved Evidence</h2>
        <EvidenceList evidence={evidence} />

        {user && (
          <ScoreDebugPanel
            score={liveRottenScore}
            breakdown={breakdownWithFlavor}
          />
        )}
      </div>
    </>
  );
}
