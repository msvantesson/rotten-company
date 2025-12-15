export const dynamic = "force-dynamic";
export const dynamicParams = true;
export const fetchCache = "force-no-store";

import { supabase } from "@/lib/supabaseClient";

export default async function CompanyPage({
  params,
}: {
  params: { slug: string };
}) {
  const rawSlug = params?.slug ? decodeURIComponent(params.slug) : "";

  if (!rawSlug) {
    return <div>Slug is missing — params.slug is undefined</div>;
  }

  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("id, name, slug")
    .eq("slug", rawSlug)
    .single();

  if (!company) {
    return (
      <div>
        <h1>No company found</h1>
        <p>Slug: {rawSlug}</p>
        <pre>{JSON.stringify(companyError, null, 2)}</pre>
      </div>
    );
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
        <p>No approved evidence found.</p>
      )}
    </div>
  );
}
