// app/company/[slug]/page.tsx
export const dynamic = "force-dynamic";
export const dynamicParams = true;
export const fetchCache = "force-no-store";

import { headers } from "next/headers";
import { supabase } from "@/lib/supabaseClient";

export default async function CompanyPage({
  params,
}: {
  params: { slug: string };
}) {
  const rawSlug = params?.slug ? decodeURIComponent(params.slug) : "";

  // SSR debug: log params, rawSlug, and request headers
  try {
    const hdrsObj = await headers(); // await the Promise
    const hdrs = Object.fromEntries(hdrsObj.entries());
    console.log("SSR DEBUG — params:", params);
    console.log("SSR DEBUG — rawSlug:", rawSlug);
    console.log("SSR DEBUG — headers:", hdrs);
  } catch (e) {
    console.log("SSR DEBUG — headers read failed:", String(e));
  }

  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("id, name, slug")
    .eq("slug", rawSlug)
    .maybeSingle();

  console.log("COMPANY PAGE DEBUG — company:", company);
  console.log("COMPANY PAGE DEBUG — companyError:", companyError);

  if (!company) {
    return (
      <div style={{ padding: "2rem" }}>
        <h1>No company found</h1>
        <p>Slug: {rawSlug || "null"}</p>
        <pre>{JSON.stringify(companyError, null, 2)}</pre>
      </div>
    );
  }

  const { data: evidence, error: evidenceError } = await supabase
    .from("evidence")
    .select("id, title, summary")
    .eq("company_id", company.id)
    .eq("status", "approved");

  console.log("COMPANY PAGE DEBUG — evidence:", evidence);
  console.log("COMPANY PAGE DEBUG — evidenceError:", evidenceError);

  return (
    <div style={{ padding: "2rem" }}>
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
