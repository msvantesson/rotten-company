export const dynamic = "force-dynamic";
export const dynamicParams = true;
export const fetchCache = "force-no-store";

import { supabaseServer } from "@/lib/supabase-server";
import { EvidenceList } from "@/components/EvidenceList";
import RatingStars from "@/components/RatingStars";
import { RottenScoreMeter } from "@/components/RottenScoreMeter";
import { CategoryBreakdown } from "@/components/CategoryBreakdown";
import { buildCompanyJsonLd } from "@/lib/jsonld-company";

// --- Flavor taxonomy ---
const CATEGORY_FLAVORS: Record<number, string> = {
  1: "Rotten to the core",
  2: "Smells like spin",
  3: "Boardroom smoke and mirrors",
  4: "Toxic workplace vibes",
  5: "Ethics on life support",
  6: "Greenwashing deluxe",
  13: "Customer trust? Never heard of it",
};

function getFlavor(categoryId: number): string {
  return CATEGORY_FLAVORS[categoryId] ?? "No flavor assigned";
}

// --- Types ---
type Params = Promise<{ slug: string }> | { slug: string };

type Evidence = {
  id: number;
  title: string;
  summary?: string;
  file_url?: string;
  file_type?: string;
  file_size?: number;
};

type Company = {
  id: number;
  name: string;
  slug: string;
  industry?: string;
  size_employees?: number;
  rotten_score?: number;
} | null;

type CategoryBreakdownRow = {
  category_id: number;
  category_name: string;
  evidence_count: number;
  avg_score: number | null;
  flavor: string;
};

type Category = {
  id: number;
  slug: string;
  name: string;
};

export default async function CompanyPage({ params }: { params: Params }) {
  const resolvedParams = (await params) as { slug?: string } | undefined;
  const rawSlug = resolvedParams?.slug ? decodeURIComponent(resolvedParams.slug) : "";

  const supabase = await supabaseServer();

  // 1. Fetch company
  const { data: company, error: companyError }: { data: Company; error: any } =
    await supabase
      .from("companies")
      .select("id, name, slug, industry, size_employees, rotten_score")
      .eq("slug", rawSlug)
      .maybeSingle();

  if (!company) {
    return (
      <div style={{ padding: "2rem" }}>
        <h1>No company found</h1>
        <p><strong>Slug</strong>: {rawSlug || "null"}</p>
        <pre>{JSON.stringify(companyError, null, 2)}</pre>
      </div>
    );
  }

  // 2. Fetch approved evidence
  const { data: evidence, error: evidenceError }: { data: Evidence[] | null; error: any } =
    await supabase
      .from("evidence")
      .select("id, title, summary, file_url, file_type, file_size")
      .eq("company_id", company.id)
      .eq("status", "approved");

  // 3. Unified breakdown view
  const { data: mergedBreakdown, error: breakdownError } = await supabase
    .from("company_category_full_breakdown")
    .select("category_id, category_name, evidence_count, avg_score")
    .eq("company_id", company.id);

  // Add flavor text
  const breakdownWithFlavor: CategoryBreakdownRow[] =
    mergedBreakdown?.map((row) => ({
      ...row,
      flavor: getFlavor(row.category_id),
    })) ?? [];

  // 4.5 Fetch overall Rotten Score (computed via SQL view)
  const { data: scoreRow } = await supabase
    .from("company_rotten_score")
    .select("rotten_score")
    .eq("company_id", company.id)
    .maybeSingle();

  const liveRottenScore = scoreRow?.rotten_score ?? null;

  // 6. Fetch all categories for rating UI
  const { data: categories } = await supabase
    .from("categories")
    .select("id, slug, name")
    .order("id", { ascending: true }) as { data: Category[] | null };

  // 7. Fetch logged-in user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 8. Fetch user's existing ratings for this company
  let userRatings: Record<number, number> = {};

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

  // --- JSON-LD payload ---
  const jsonLd = buildCompanyJsonLd({
    company,
    rottenScore: liveRottenScore,
    breakdown: breakdownWithFlavor,
  });

  return (
    <>
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd, null, 2),
        }}
      />

      <div style={{ padding: "2rem" }}>
        <h1>{company.name}</h1>

        <p><strong>Industry:</strong> {company.industry ?? "Unknown"}</p>
        <p><strong>Employees:</strong> {company.size_employees ?? "Unknown"}</p>

        {/* --- Rotten Score Meter --- */}
        <div style={{ marginTop: "1.5rem", marginBottom: "2rem" }}>
          <RottenScoreMeter score={liveRottenScore ?? 0} />
        </div>

        {/* --- Ratings UI --- */}
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
                <span>{cat.name}</span>
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

        {/* --- Category Breakdown UI --- */}
        <h2 style={{ marginTop: "2rem" }}>Rotten Score Breakdown</h2>

        <div style={{ marginBottom: "2rem" }}>
          <CategoryBreakdown breakdown={breakdownWithFlavor} />
        </div>

        {breakdownError && (
          <pre>{JSON.stringify({ breakdownError }, null, 2)}</pre>
        )}

        {/* --- Evidence List --- */}
        <h2>Approved Evidence</h2>
        <EvidenceList evidence={evidence || []} />

        {evidenceError ? (
          <pre style={{ marginTop: 12 }}>{JSON.stringify(evidenceError, null, 2)}</pre>
        ) : null}
      </div>
    </>
  );
}
