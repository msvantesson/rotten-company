export const dynamic = "force-dynamic";
export const dynamicParams = true;
export const fetchCache = "force-no-store";

import { supabase } from "@/lib/supabaseClient";

export default async function CompanyPage({
  params,
}: {
  params: { slug: string };
}) {
  // ✅ Ensure slug is defined
  const rawSlug = params?.slug ? decodeURIComponent(params.slug) : null;

  if (!rawSlug) {
    return (
      <div style={{ padding: 20 }}>
        <h1>Slug is missing</h1>
        <p>params.slug was undefined. This means the dynamic route folder was not matched.</p>
      </div>
    );
  }

  // ✅ Fetch the company
  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("id, name, slug")
    .eq("slug", rawSlug)
    .single();

  if (!company) {
    return (
      <div style={{ padding: 20 }}>
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

  return (
    <div style={{ padding: 20 }}>
      <h1>{company.name}</h1>

      <h2>Approved Evidence</h2>

      {evidenceError && (
        <pre>{JSON.stringify(evidenceError, null, 2)}</pre>
      )}

      {evidence && evidence.length > 0 ? (
        <ul>
          {evidence.map((item) => (
            <li key={item.id}>
              <strong>{item.title}</strong>
            </li>
          ))}
        </ul>
      ) : (
        <p>No approved evidence yet.</p>
      )}
    </div>
  );
}
