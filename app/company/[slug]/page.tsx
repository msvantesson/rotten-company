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
import { getRottenFlavor } from "@/lib/flavor-engine";
import CategoryInfoPopover from "@/components/CategoryInfoPopover";
import CeoSection from "@/components/CeoSection";

// --- Toggle debug UI in non-production or when explicit env flag is set ---
// Set SHOW_DEBUG=1 (or SHOW_DEBUG === '1') to enable in production if needed.
const SHOW_DEBUG =
  process.env.NODE_ENV !== "production" || process.env.SHOW_DEBUG === "1";

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
  const rawSlug = resolvedParams?.slug
    ? decodeURIComponent(resolvedParams.slug)
    : "";

  const supabase = await supabaseServer();

  // 1) Core company fetch — include country, website, description so they can be displayed
  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select(
      "id, name, slug, industry, size_employees, rotten_score, country, website, description",
    )
    .eq("slug", rawSlug)
    .maybeSingle();

  if (companyError) {
    console.error("Error loading company:", rawSlug, companyError);
  }

  // If no company found and a DB error occurred, attempt a fallback select('*') for the same slug
  // (only when SHOW_DEBUG is enabled — does not affect the production experience)
  let fallbackCompany: any = null;
  let fallbackError: any = null;
  if (!company && companyError && SHOW_DEBUG) {
    const { data: fbData, error: fbError } = await supabase
      .from("companies")
      .select("*")
      .eq("slug", rawSlug)
      .maybeSingle();
    fallbackCompany = fbData ?? null;
    fallbackError = fbError ?? null;
    if (fallbackError) {
      console.error("Fallback select('*') also failed:", rawSlug, fallbackError);
    }
  }

  if (!company) {
    // When SHOW_DEBUG is enabled and there was a DB error, surface the error details to the maintainer
    if (SHOW_DEBUG && (companyError || fallbackError)) {
      return (
        <div className="max-w-3xl mx-auto py-16 px-4">
          <h1 className="text-2xl font-semibold">No company found</h1>
          <p className="mt-2 text-sm text-gray-600">
            <strong>Slug</strong>: {rawSlug || "null"}
          </p>
          {/* Debug error panel — only rendered when SHOW_DEBUG is enabled */}
          <div className="mt-4 p-4 bg-red-50 border border-red-300 rounded text-xs text-red-800 font-mono whitespace-pre-wrap">
            <p className="font-bold mb-1">[DEBUG] Company query error:</p>
            <p>{JSON.stringify(companyError, null, 2)}</p>
            {fallbackError && (
              <>
                <p className="font-bold mt-2 mb-1">
                  [DEBUG] Fallback select(&apos;*&apos;) error:
                </p>
                <p>{JSON.stringify(fallbackError, null, 2)}</p>
              </>
            )}
            {fallbackCompany && (
              <>
                <p className="font-bold mt-2 mb-1">
                  [DEBUG] Fallback select(&apos;*&apos;) result:
                </p>
                <p>{JSON.stringify(fallbackCompany, null, 2)}</p>
              </>
            )}
          </div>
        </div>
      );
    }

    // Default: keep the 'No company found' state as before
    return (
      <div className="max-w-3xl mx-auto py-16 px-4">
        <h1 className="text-2xl font-semibold">No company found</h1>
        <p className="mt-2 text-sm text-gray-600">
          <strong>Slug</strong>: {rawSlug || "null"}
        </p>
      </div>
    );
  }

  // Evidence
  let evidence: any[] = [];
  try {
    evidence = (await getEvidenceWithManagers(company.id)) ?? [];
  } catch (e) {
    console.error("Error loading evidence for company:", company.id, e);
    evidence = [];
  }

  // Category breakdown
  let breakdownWithFlavor: any[] = [];
  try {
    const { data: mergedBreakdown, error: breakdownError } = await supabase
      .from("company_category_full_breakdown")
      .select(
        "category_id, category_name, rating_count, avg_rating_score, evidence_count, evidence_score, final_score",
      )
      .eq("company_id", company.id);

    if (breakdownError) {
      console.error(
        "Error loading company_category_full_breakdown for company:",
        company.id,
        breakdownError,
      );
    }

    breakdownWithFlavor = mergedBreakdown ?? [];
  } catch (e) {
    console.error(
      "Unexpected error building breakdown for company:",
      company.id,
      e,
    );
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
      console.error(
        "Error loading company_rotten_score for company:",
        company.id,
        scoreError,
      );
    }

    liveRottenScore = scoreRow?.rotten_score ?? null;
  } catch (e) {
    console.error(
      "Unexpected error loading Rotten Score for company:",
      company.id,
      e,
    );
    liveRottenScore = null;
  }

  // Flavor (canonical)
  const flavor = getRottenFlavor(liveRottenScore ?? company.rotten_score ?? 0);

  // Categories
  let categories: { id: number; slug: string; name: string; description: string | null }[] = [];
  try {
    const { data: categoriesData, error: categoriesError } = await supabase
      .from("categories")
      .select("id, slug, name, description")
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
  let ownershipSignals: any[] = [];
  try {
    const { data: ownershipSignalsData, error: ownershipError } = await supabase
      .from("ownership_signals_summary")
      .select("*")
      .eq("company_id", company.id);

    if (ownershipError) {
      console.error(
        "Error loading ownership_signals_summary for company:",
        company.id,
        ownershipError,
      );
    }

    ownershipSignals = ownershipSignalsData ?? [];
  } catch (e) {
    console.error("Unexpected error loading ownership_signals_summary:", e);
    ownershipSignals = [];
  }

  // Destruction lever
  let destructionLever: any | null = null;
  try {
    const { data: destructionLeverData, error: destructionError } = await supabase
      .from("company_destruction_lever")
      .select("*")
      .eq("company_id", company.id)
      .maybeSingle();

    if (destructionError) {
      console.error(
        "Error loading company_destruction_lever for company:",
        company.id,
        destructionError,
      );
    }

    destructionLever = destructionLeverData ?? null;
  } catch (e) {
    console.error("Unexpected error loading company_destruction_lever:", e);
    destructionLever = null;
  }

  // JSON-LD
  let jsonLd: any = null;
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

      {/* Debug panels: only show in development or when SHOW_DEBUG env flag is set */}
      {SHOW_DEBUG && (
        <JsonLdDebugPanel data={jsonLd ?? { error: "JSON-LD generation failed" }} />
      )}

      <div className="max-w-3xl mx-auto py-8 px-4">
        <header className="space-y-3">
          <h1 className="text-3xl font-semibold">{company.name}</h1>

          <div className="flex items-center gap-3">
            <span
              className="text-sm font-semibold px-2 py-1 rounded"
              style={{ color: flavor.color }}
            >
              {flavor.macroTier}
            </span>
            <p className="text-sm italic text-gray-600">{flavor.microFlavor}</p>
          </div>

          <div className="text-sm text-gray-700 space-y-1">
            <p>
              <strong>Industry:</strong> {company.industry ?? "Unknown"}
            </p>
            <p>
              <strong>Employees:</strong> {company.size_employees ?? "Unknown"}
            </p>
            <p>
              <strong>Country (Headquarters):</strong>{" "}
              {company.country ? company.country : "Unknown"}
            </p>
            <p>
              <strong>Website:</strong>{" "}
              {company.website ? (
                <a
                  href={company.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-700 hover:underline"
                >
                  {company.website}
                </a>
              ) : (
                "—"
              )}
            </p>
            {company.description && (
              <p className="mt-2 text-sm text-gray-700">{company.description}</p>
            )}
          </div>

          <div className="mt-6 mb-8">
            <RottenScoreMeter score={liveRottenScore ?? 0} />
          </div>
        </header>

        <section className="mt-6">
          <h2 className="text-xl font-semibold">Rate this company</h2>
          <p className="mt-1 text-sm text-gray-500">1 = low harm · 5 = severe harm</p>

          {categories && categories.length > 0 ? (
            <div className="mt-4 divide-y">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center justify-between py-3"
                >
                  <span className="flex items-center">
                    {getCategoryIcon(cat.id)} {cat.name}
                    <CategoryInfoPopover
                      categoryName={cat.name}
                      categorySlug={cat.slug}
                      description={cat.description ?? null}
                    />
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
            <p className="mt-4 text-sm text-gray-600">
              No categories configured yet.
            </p>
          )}
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-semibold">Rotten Score Breakdown</h2>
          <div className="mt-4">
            <CategoryBreakdown
              company={company}
              breakdown={breakdownWithFlavor}
              evidence={evidence}
            />
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-semibold">Approved Evidence</h2>

          <div className="mt-4">
            {user ? (
              <a
                href={`/company/${company.slug}/submit-evidence`}
                className="inline-block px-4 py-2 bg-black text-white rounded"
              >
                Submit Evidence
              </a>
            ) : (
              <a
                href="/login"
                className="inline-block px-4 py-2 bg-gray-700 text-white rounded"
              >
                Sign in to submit evidence
              </a>
            )}
          </div>

          <div className="mt-6">
            <EvidenceList evidence={evidence} />
          </div>
        </section>

        {/* CEO section — defensive: does not block page render on failure */}
        <CeoSection companyId={company.id} userId={user?.id ?? null} />

        {/* Score debug panel only for dev / SHOW_DEBUG */}
        {user && SHOW_DEBUG && (
          <div className="mt-8">
            <ScoreDebugPanel
              score={liveRottenScore}
              breakdown={breakdownWithFlavor}
            />
          </div>
        )}
      </div>
    </>
  );
}
