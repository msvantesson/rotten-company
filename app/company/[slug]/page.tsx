export const dynamic = "force-dynamic";
export const dynamicParams = false;
export const fetchCache = "force-no-store";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";



export default async function CompanyPage({ params }: { params: { slug: string } }) {
  // Use the supabase client directly
  const rawSlug = decodeURIComponent(params.slug);

  const { data: company } = await supabase
    .from("companies")
    .select("id, name, slug")
    .eq("slug", rawSlug)
    .single();

if (!company) {
  return <div>NO COMPANY FOUND FOR SLUG: {rawSlug}</div>;
}


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
