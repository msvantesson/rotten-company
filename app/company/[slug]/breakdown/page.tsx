// app/company/[slug]/breakdown/page.tsx

import { supabaseServer } from "@/lib/supabase-server";
import ScoreMeter from "@/components/score-meter";

function Debug({ data }: { data: any }) {
  if (process.env.NODE_ENV === "production") return null;

  return (
    <pre className="mt-6 p-4 bg-black text-green-400 text-xs rounded-lg overflow-auto">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

type BreakdownRow = {
  category_id: string;
  category_name: string;
  rating_count: number;
  avg_rating_score: number;
  evidence_count: number;
  evidence_score: number;
  final_score: number;
};

export default async function BreakdownPage({
  params,
}: {
  params: { slug: string };
}) {
  const supabase = supabaseServer();
  const slug = params.slug;

  // Fetch company
  const {
    data: company,
    error: companyError,
  } = await supabase
    .from("companies")
    .select("id, name, slug")
    .eq("slug", slug)
    .single();

  // Fetch breakdown only if company exists
  const {
    data: breakdown,
    error: breakdownError,
  } = company
    ? await supabase
        .from("company_category_breakdown")
        .select(
          "category_id, category
