export const dynamic = "force-dynamic";
export const dynamicParams = true;
export const fetchCache = "force-no-store";

import { supabase } from "@/lib/supabaseClient";

export default async function CompanyPage({
  params,
}: {
  params: { slug: string };
}) {
  // ✅ Extract slug safely
  const rawSlug = params?.slug ? decodeURIComponent(params.slug) : "";

  // ✅ Debug logs (safe + inside component)
  console.log("DEBUG: params =", params);
  console.log("DEBUG: rawSlug =", rawSlug);

  // ✅ Fetch company
  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("id, name, slug")
    .eq("slug", rawSlug)
    .single();

  console.log("DEBUG: company =", company);
  console.log("DEBUG: companyError =", companyError);

  // ✅ If no company found, show fallback UI (not 404)
  if (!company) {
    return (
      <div>
        <h1>No company found</h1>
        <p>Slug: {rawSlug}</p>
        <pre>{JSON.stringify(companyError, null, 2)}</pre>
      </div>
    );
  }

  // ✅ Fetch approved evidence
  const { data: evidence, error: evidenceError } = await supabase
    .from("evidence")
    .select("id, title, content")
    .eq("company_id", company.id)
    .eq("status", "approved");

  console.log("DEBUG: evidence =", evidence);
  console.log("DEBUG: evidenceError =", evidenceError);

  // ✅ Render page
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
