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

  const { data: company } = await supabase
    .from("companies")
    .select("id, name, slug, industry, size_employees, rotten_score")
    .eq("slug", rawSlug)
    .maybeSingle();

  if (!company) {
    return (
      <div style={{ padding: "2rem" }}>
        <h1>No company found</h1>
        <p><strong>Slug</strong>: {rawSlug || "null"}</p>
      </div>
    );
  }

  const evidence = await getEvidenceWithManagers(company.id);

  const { data: mergedBreakdown } = await supabase
    .from("company_category_full_breakdown")
    .select(
      "category_id, category_name, rating_count, avg_rating_score, evidence_count, evidence_score, final_score"
    )
    .eq("company_id", company.id);

  const breakdownWithFlavor = mergedBreakdown ?? [];

  const { data: scoreRow } = await supabase
    .from("company_rotten_score")
    .select("rotten_score")
    .eq("company_id", company.id)
    .maybeSingle();

  const liveRottenScore = scoreRow?.rotten_score ?? null;

  const { data: categories } = await supabase
    .from("categories")
    .select("id, slug, name")
    .order("id", { ascending: true });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userRatings: Record<number, number> = {};

  if (user) {
    const { data: ratings } = await supabase
      .from("ratings")
      .select("category, score")
      .eq("company_id", company.id)
      .eq("user_id", user.id);

    if (ratings) {
      for (const r of ratings) {
        userRatings[r.category] = r.score;
      }
    }
  }

  const { data: ownershipSignals } = await supabase
    .from("ownership_signals_summary")
    .select("*")
    .eq("company_id", company.id);

  const { data: destructionLever } = await supabase
    .from("company_destruction_lever")
    .select("*")
    .eq("company_id", company.id)
    .maybeSingle();

  const jsonLd = buildCompanyJsonLd({
    company,
    rottenScore: liveRottenScore,
    breakdown: breakdownWithFlavor,
    ownershipSignals,
    destructionLever,
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd, null, 2),
        }}
      />

      <JsonLdDebugPanel data={jsonLd} />

      <div style={{ padding: "2rem" }}>
        <h1>{company.name}</h1>

        <p><strong>Industry:</strong> {company.industry ?? "Unknown"}</p>
        <p><strong>Employees:</strong> {company.size_employees ?? "Unknown"}</p>

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
