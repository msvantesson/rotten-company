export const dynamic = "force-dynamic";
export const dynamicParams = true;
export const fetchCache = "force-no-store";

import { supabaseServer } from "@/lib/supabase-server";
import { EvidenceList } from "@/components/EvidenceList";

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

type CategoryBreakdown = {
  category_id: number;
  category_name: string;
  evidence_count: number;
  avg_score: number | null;
  flavor: string;
};

export default async function CompanyPage({ params }: { params: Params }) {
  const resolvedParams = (await params) as { slug?: string } | undefined;
  const rawSlug = resolvedParams?.slug ? decodeURIComponent(resolvedParams.slug) : "";

  // IMPORTANT: use SSR Supabase client
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

  // 3. Fetch category breakdown (evidence counts)
  const { data: breakdown, error: breakdownError } = await supabase
    .from("company_category_breakdown")
    .select("category_id, category_name, evidence_count")
    .eq("company_id", company.id);

  // 4. Fetch category rankings (avg scores)
  const { data: rankings, error: rankingsError } = await supabase
    .from("category_company_rankings")
    .select("category_id, category_name, avg_score")
    .eq("company_id", company.id);

  // 5. Merge both views + flavor text
  const mergedBreakdown: CategoryBreakdown[] =
    breakdown
