// app/company/[slug]/page.tsx
import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export default async function CompanyPage({ params }: { params: { slug: string } }) {
  const supabase = createClient();

  // Decode slug from URL
  const rawSlug = decodeURIComponent(params.slug);

  // Try to fetch company by slug
  const { data: company } = await supabase
    .from("companies")
    .select("id, name, slug")
    .eq("slug", rawSlug)
    .single();

  if (!company) {
    notFound();
  }

  // Fetch approved evidence for this company
  const { data: evidence } = await supabase
    .from("evidence")
    .select("id, title, content")
    .eq("company_id", company.id)
    .eq("status", "approved");

  return (
    <div>
      <h1>{company.name}</h1>

      <h2>Approved Evidence</h2>
      {evidence && evidence.length > 0 ? (
        <ul>
          {evidence.map((item) => (
            <li key={item.id}>{item.title}</li>
          ))}
        </ul>
      ) : (
        <p>No approved evidence yet.</p>
      )}
    </div>
  );
}
